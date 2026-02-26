import Anthropic from '@anthropic-ai/sdk'
import { config } from './config'
import { customTools, webSearchTool, executeTool } from './tools'
import type { AgentResult, Episode } from './types'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TURNS = 30

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
  "attendees": ["id1", "id2", ...],      // All contestants who attended tribal
  "votes": { "voterId": "votedForId" },   // How each person voted
  "eliminated": "contestantId",            // Who was voted out
  "isBlindside": true/false,               // Was the eliminated person blindsided?
  "blindsideLeader": "contestantId",       // Optional: who orchestrated the blindside
  "idolPlayed": { "by": "id", "successful": true/false } | null,
  "sentToJury": true/false                 // Is the person going to jury?
}
\`\`\`

**IMMUNITY_CHALLENGE:**
\`\`\`json
{ "winner": "contestantId" }
\`\`\`

**REWARD_CHALLENGE:**
\`\`\`json
{
  "winners": ["id1", "id2", ...],
  "isTeamChallenge": true/false
}
\`\`\`

**IDOL_FOUND:**
\`\`\`json
{ "finder": "contestantId" }
\`\`\`

**FIRE_MAKING:**
\`\`\`json
{ "winner": "contestantId", "loser": "contestantId" }
\`\`\`

**QUIT_MEDEVAC:**
\`\`\`json
{ "contestant": "contestantId", "reason": "quit" | "medevac" }
\`\`\`

**ENDGAME:**
\`\`\`json
{ "finalists": ["id1", "id2", ...], "winner": "contestantId" }
\`\`\`

## Important rules

- ALWAYS use contestant IDs (not names) in the data schemas
- For tribal council votes, you need to know who each individual person voted for. If you can't find the full vote breakdown, search for another source (e.g., "Survivor 50 episode N vote breakdown" or check the Survivor wiki)
- Do NOT submit incomplete events. If you're missing critical data for a tribal council (like the vote breakdown), report what's missing via \`dm_admin\` instead of submitting with made-up data
- If the episode had multiple tribal councils, submit each as a separate TRIBAL_COUNCIL event
- The "attendees" array for tribal council should include ALL people at tribal, including the person who was eliminated
- "sentToJury" is true if the season has reached the jury phase (typically after the merge)
- A "blindside" means the eliminated person did not know they were the target and was surprised
- If events already exist for this week (from get_existing_events), mention this in your DM and do not submit duplicates`
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
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16384,
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
