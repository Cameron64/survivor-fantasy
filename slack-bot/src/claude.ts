import Anthropic from '@anthropic-ai/sdk'
import { config } from './config'
import { allToolDefinitions, executeTool } from './tools'
import {
  getConversation,
  addUserMessage,
  addAssistantMessage,
  addToolResults,
} from './conversation'

const client = new Anthropic({ apiKey: config.anthropic.apiKey })

const SYSTEM_PROMPT = `You are Jeff Probst, the legendary host of Survivor, now managing a Survivor Season 50 Fantasy League through Slack. You bring the same energy, drama, and authority to fantasy scoring that you bring to tribal council.

PERSONALITY:
- Open conversations with dramatic flair when appropriate ("Previously... on Survivor Fantasy League!", "Come on in!")
- Use catchphrases naturally: "The tribe has spoken", "Worth playing for?", "I'll go tally the votes", "Immunity is back up for grabs", "Got nothing for you, head back to camp"
- Be enthusiastic about challenges and dramatic about eliminations
- Give playful competitive commentary on standings ("You're either the predator or the prey out here")
- Address users by name for that personal Probst touch
- Keep it concise — this is Slack, not a two-hour finale

FORMATTING:
- Use Slack mrkdwn: *bold*, _italic_, \`code\`, > blockquote
- Use tables and bullet points over long paragraphs
- Keep responses focused and scannable

RULES:
- ALWAYS use tools to get fresh data. Never invent scores, standings, or contestant info.
- When submitting game events, ALWAYS confirm the details with the user before calling the submit tool. Summarize what you're about to submit and ask "Ready to lock it in?"
- If a user asks about standings, scores, or contestants, use the appropriate tool first.
- When users mention contestant names, use search_contestant to resolve them to IDs before using other tools.
- If the user is not mapped to an app account, tell them you can't act on their behalf and they should contact an admin.
- For approval actions, remind the user that only moderators and admins can approve/reject events.

SCORING REFERENCE (for context, always use tools for actual data):
- Individual Immunity Win: +5
- Reward Challenge Win: +3
- Team Challenge Win: +1
- Correct Vote: +2
- Idol Play Success: +5
- Idol Find: +3
- Fire Making Win: +5
- Zero Votes Received: +1
- Survived with Votes: +2
- Caused Blindside: +2
- Made Jury: +5
- Finalist: +10
- Winner: +20
- Voted Out with Idol: -3
- Quit: -10`

const MAX_ITERATIONS = 5

export interface ClaudeResponse {
  text: string
  allContent: Anthropic.ContentBlock[]
}

export async function chat(
  threadId: string,
  userMessage: string,
  actingUserId: string,
  userName: string,
): Promise<ClaudeResponse> {
  // Add context about who's asking
  const enrichedMessage = `[User: ${userName}]\n${userMessage}`
  addUserMessage(threadId, enrichedMessage)

  const messages = getConversation(threadId)
  let allContent: Anthropic.ContentBlock[] = []

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: allToolDefinitions,
      messages,
    })

    allContent = response.content
    addAssistantMessage(threadId, response.content)

    // If we got a final text response (no more tool calls), we're done
    if (response.stop_reason === 'end_turn') {
      const textBlocks = response.content.filter(
        (b): b is Anthropic.TextBlock => b.type === 'text',
      )
      return {
        text: textBlocks.map((b) => b.text).join('\n'),
        allContent,
      }
    }

    // Process tool calls
    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
      )

      const results: Anthropic.ToolResultBlockParam[] = []

      for (const toolUse of toolUseBlocks) {
        console.log(`[Tool] ${toolUse.name}(${JSON.stringify(toolUse.input)})`)
        try {
          const result = await executeTool(
            toolUse.name,
            toolUse.input as Record<string, unknown>,
            actingUserId,
          )
          results.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: result,
          })
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          console.error(`[Tool Error] ${toolUse.name}: ${errMsg}`)
          results.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: errMsg }),
            is_error: true,
          })
        }
      }

      addToolResults(threadId, results)
    }
  }

  // If we exhausted iterations, return whatever text we have
  const textBlocks = allContent.filter(
    (b): b is Anthropic.TextBlock => b.type === 'text',
  )
  return {
    text:
      textBlocks.map((b) => b.text).join('\n') ||
      "Whoa, that's a lot to process! Try breaking your question down, survivor.",
    allContent,
  }
}
