import Anthropic from '@anthropic-ai/sdk'
import { config } from './config'
import { customTools, webSearchTool, executeTool } from './tools'
import { getContestants } from './tool-impl/api'
import type { AgentResult, Episode, Contestant } from './types'

const MODEL = 'claude-sonnet-4-6'
const MAX_TURNS = 25
const RATE_LIMIT_RETRIES = 5
const RATE_LIMIT_WAIT_MS = 65_000
const PRUNE_THRESHOLD = 500 // chars — tool results older than current turn get truncated to this

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Format contestants as a compact table for the system prompt.
 * Much smaller than raw JSON — saves ~50% tokens on the roster.
 */
function formatRoster(contestants: Contestant[]): string {
  const lines = contestants.map((c) => {
    const status = c.isEliminated ? `OUT(wk${c.eliminatedWeek})` : 'ACTIVE'
    const nick = c.nickname ? ` (${c.nickname})` : ''
    return `${c.id} | ${c.name}${nick} | ${status}`
  })
  return `ID | Name | Status\n${lines.join('\n')}`
}

function buildSystemPrompt(roster: string): string {
  return `You are the automated recap agent for a Survivor Season 50 fantasy league.

Find the latest episode recap and extract ALL scorable game events.

## Contestant Roster
${roster}

## Workflow
1. Use \`get_existing_events\` to check for duplicates
2. Search the web for recaps (e.g. "Survivor 50 episode N recap tribal council votes")
3. Use \`fetch_article\` to read sources with vote breakdowns
4. If missing details, search for another source (e.g. Survivor wiki)
5. Map names to contestant IDs from the roster above
6. Use \`submit_game_event\` for each complete event
7. Use \`dm_admin\` to summarize what you submitted

## Events to Extract
- **TRIBAL_COUNCIL**: attendees, votes (voterId→votedForId), eliminated, isBlindside, blindsideLeader?, idolPlayed?, sentToJury
- **IMMUNITY_CHALLENGE**: winner
- **REWARD_CHALLENGE**: winners, isTeamChallenge
- **IDOL_FOUND**: finder
- **FIRE_MAKING**: winner, loser
- **QUIT_MEDEVAC**: contestant, reason ("quit"|"medevac")
- **ENDGAME**: finalists, winner

## Data Schemas (all IDs from roster above)
**TRIBAL_COUNCIL:** \`{ "attendees": ["id",...], "votes": {"voterId":"votedForId"}, "eliminated": "id", "isBlindside": bool, "blindsideLeader?": "id", "idolPlayed": {"by":"id","successful":bool}|null, "sentToJury": bool }\`
**IMMUNITY_CHALLENGE:** \`{ "winner": "id" }\`
**REWARD_CHALLENGE:** \`{ "winners": ["id",...], "isTeamChallenge": bool }\`
**IDOL_FOUND:** \`{ "finder": "id" }\`
**FIRE_MAKING:** \`{ "winner": "id", "loser": "id" }\`
**QUIT_MEDEVAC:** \`{ "contestant": "id", "reason": "quit"|"medevac" }\`
**ENDGAME:** \`{ "finalists": ["id",...], "winner": "id" }\`

## Rules
- Use contestant IDs (not names) in all data
- **Always include \`contestantNames\`** when submitting: a map of every contestant ID in \`data\` to their full name (e.g. \`{"cxyz123": "John Smith"}\`). The system validates these against the roster and rejects mismatches.
- Need full vote breakdown for tribal council — search multiple sources if needed
- Do NOT submit incomplete events — use \`dm_admin\` to report missing data
- Multiple tribal councils = separate TRIBAL_COUNCIL events
- "attendees" includes the eliminated person
- "sentToJury" = true after the merge
- If events already exist for this week, DM and skip`
}

/**
 * Prune large tool results from older turns to reduce context size.
 * Replaces content of tool_result blocks from previous turns with a short summary.
 */
function pruneHistory(messages: Anthropic.MessageParam[]): void {
  // Keep the last 2 messages (current assistant + tool_results) intact.
  // Prune everything before that.
  const pruneUpTo = messages.length - 2

  for (let i = 0; i < pruneUpTo; i++) {
    const msg = messages[i]
    if (!Array.isArray(msg.content)) continue

    for (let j = 0; j < msg.content.length; j++) {
      const block = msg.content[j]
      if (typeof block === 'object' && 'type' in block && block.type === 'tool_result') {
        const resultBlock = block as Anthropic.ToolResultBlockParam
        if (typeof resultBlock.content === 'string' && resultBlock.content.length > PRUNE_THRESHOLD) {
          resultBlock.content = resultBlock.content.slice(0, PRUNE_THRESHOLD) + '\n[...truncated]'
        }
      }
    }
  }
}

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
  // Pre-fetch contestants and bake into system prompt
  const contestants = await getContestants()
  const roster = formatRoster(contestants)

  const client = new Anthropic({ apiKey: config.anthropic.apiKey })
  const systemPrompt = buildSystemPrompt(roster)

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Process Survivor Season 50 Episode ${episode.number}. Air date: ${episode.airDate}.${
        episode.title ? ` Title: "${episode.title}".` : ''
      } Extract all scorable game events for week ${episode.number}.`,
    },
  ]

  let eventCount = 0
  let summary = ''

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    // Prune old tool results to keep context lean
    if (messages.length > 3) {
      pruneHistory(messages)
    }

    const response = await createMessageWithRetry(client, {
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools: [webSearchTool, ...customTools],
      messages,
    })

    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === 'tool_use',
    )

    for (const block of response.content) {
      if (block.type === 'text' && block.text) {
        summary += block.text + '\n'
      }
    }

    if (response.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
      break
    }

    messages.push({ role: 'assistant', content: response.content })

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const toolUse of toolUseBlocks) {
      console.log(`  [tool] ${toolUse.name}(${JSON.stringify(toolUse.input).slice(0, 100)}...)`)

      const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>, contestants)

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
