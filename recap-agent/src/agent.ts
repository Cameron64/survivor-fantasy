import Anthropic from '@anthropic-ai/sdk'
import { config } from './config'
import { customTools, webSearchTool, executeTool } from './tools'
import type { AgentResult, Episode } from './types'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TURNS = 30
const RATE_LIMIT_RETRIES = 5
const RATE_LIMIT_WAIT_MS = 65_000 // just over 1 minute

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildSystemPrompt(): string {
  return `You are the automated recap agent for a Survivor Season 50 fantasy league.

Your job is to find the latest episode recap and extract ALL scorable game events from it.

## Your workflow

1. Use \`get_contestants\` to load the full contestant roster with IDs
2. Use \`get_existing_events\` to check if events already exist for this episode's week
3. Search the web for detailed recaps of the episode (e.g. "Survivor 50 episode N recap tribal council votes")
4. Use \`fetch_article\` to read the best results — prioritize sources with vote breakdowns
5. If one source is missing details (e.g., who voted for whom, challenge results), search for and read additional sources
6. Map contestant names/nicknames from the recap to exact contestant IDs from the roster
7. Use \`submit_game_event\` for each complete event
8. Use \`dm_admin\` to send a summary of what you submitted

## What to extract

You MUST find and submit ALL of these that occurred in the episode:

- **Tribal Council** (TRIBAL_COUNCIL): Who attended, how each person voted (voterId -> votedForId mapping), who was eliminated, was it a blindside, was an idol played, is the eliminated person going to jury
- **Immunity Challenge** (IMMUNITY_CHALLENGE): Who won individual immunity
- **Reward Challenge** (REWARD_CHALLENGE): Who won, was it team-based
- **Idol Found** (IDOL_FOUND): If someone found a hidden immunity idol
- **Fire Making** (FIRE_MAKING): If there was a fire-making challenge
- **Quit/Medevac** (QUIT_MEDEVAC): If someone quit or was medically evacuated
- **Endgame** (ENDGAME): For the finale — who were finalists, who won

## GameEvent data schemas

All contestant references must use the exact contestant ID from \`get_contestants\`.

**TRIBAL_COUNCIL:**
\`\`\`json
{
  "attendees": ["id1", "id2", ...],
  "votes": { "voterId": "votedForId" },
  "eliminated": "contestantId",
  "isBlindside": true/false,
  "blindsideLeader": "contestantId",
  "idolPlayed": { "by": "id", "successful": true/false } | null,
  "sentToJury": true/false
}
\`\`\`

**IMMUNITY_CHALLENGE:** \`{ "winner": "contestantId" }\`

**REWARD_CHALLENGE:** \`{ "winners": ["id1", ...], "isTeamChallenge": true/false }\`

**IDOL_FOUND:** \`{ "finder": "contestantId" }\`

**FIRE_MAKING:** \`{ "winner": "contestantId", "loser": "contestantId" }\`

**QUIT_MEDEVAC:** \`{ "contestant": "contestantId", "reason": "quit" | "medevac" }\`

**ENDGAME:** \`{ "finalists": ["id1", ...], "winner": "contestantId" }\`

## Important rules

- ALWAYS use contestant IDs (not names) in the data schemas
- For tribal council votes, you need the full vote breakdown. If one source doesn't have it, search for another (e.g., Survivor wiki)
- Do NOT submit incomplete events — report missing data via \`dm_admin\` instead
- If the episode had multiple tribal councils, submit each as a separate TRIBAL_COUNCIL event
- The "attendees" array should include ALL people at tribal, including the eliminated person
- "sentToJury" is true after the merge (jury phase)
- A "blindside" means the eliminated person was surprised
- If events already exist for this week, mention it in your DM and do not submit duplicates`
}

/**
 * Call Claude API with automatic rate limit retry.
 */
async function createMessageWithRetry(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  for (let attempt = 0; attempt < RATE_LIMIT_RETRIES; attempt++) {
    try {
      return await client.messages.create(params)
    } catch (error) {
      const isRateLimit =
        error instanceof Anthropic.RateLimitError ||
        (error instanceof Error && error.message.includes('429'))

      if (isRateLimit && attempt < RATE_LIMIT_RETRIES - 1) {
        console.log(`  Rate limited. Waiting ${RATE_LIMIT_WAIT_MS / 1000}s before retry (${attempt + 1}/${RATE_LIMIT_RETRIES})...`)
        await sleep(RATE_LIMIT_WAIT_MS)
        continue
      }
      throw error
    }
  }
  throw new Error('Rate limit retries exhausted')
}

export async function runAgent(episode: Episode): Promise<AgentResult> {
  const client = new Anthropic({ apiKey: config.anthropic.apiKey })

  const systemPrompt = buildSystemPrompt()
  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Process Survivor Season 50 Episode ${episode.number}. Air date: ${episode.airDate}.${
        episode.title ? ` Title: "${episode.title}".` : ''
      } Find recaps and extract all scorable game events for week ${episode.number}.`,
    },
  ]

  let eventCount = 0
  let summary = ''

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await createMessageWithRetry(client, {
      model: MODEL,
      max_tokens: 8192,
      system: systemPrompt,
      tools: [webSearchTool, ...customTools],
      messages,
    })

    // Collect custom tool_use blocks (web_search is handled server-side)
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === 'tool_use',
    )

    // Collect text blocks for summary
    for (const block of response.content) {
      if (block.type === 'text' && block.text) {
        summary += block.text + '\n'
      }
    }

    // If no custom tool calls, agent is done
    if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
      break
    }

    // Add assistant message (includes server tool results + tool_use blocks)
    messages.push({ role: 'assistant', content: response.content })

    // Execute each custom tool call and build result messages
    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const toolUse of toolUseBlocks) {
      console.log(`  [tool] ${toolUse.name}(${JSON.stringify(toolUse.input).slice(0, 100)}...)`)

      const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>)

      // Track submissions
      if (toolUse.name === 'submit_game_event' && !result.startsWith('Error')) {
        eventCount++
      }

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: result,
      })
    }

    messages.push({ role: 'user', content: toolResults })
  }

  return {
    submitted: eventCount > 0,
    eventCount,
    summary: summary.trim() || `Agent completed. Submitted ${eventCount} event(s).`,
  }
}
