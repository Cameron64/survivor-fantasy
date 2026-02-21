import Anthropic from '@anthropic-ai/sdk'

interface ConversationState {
  messages: Anthropic.MessageParam[]
  lastActivity: number
}

const TTL_MS = 10 * 60 * 1000 // 10 minutes
const conversations = new Map<string, ConversationState>()

export function getConversation(threadId: string): Anthropic.MessageParam[] {
  const state = conversations.get(threadId)
  if (!state) return []
  if (Date.now() - state.lastActivity > TTL_MS) {
    conversations.delete(threadId)
    return []
  }
  return state.messages
}

export function addUserMessage(threadId: string, content: string): void {
  const messages = getConversation(threadId)
  messages.push({ role: 'user', content })
  conversations.set(threadId, { messages, lastActivity: Date.now() })
}

export function addAssistantMessage(
  threadId: string,
  content: Anthropic.ContentBlock[],
): void {
  const state = conversations.get(threadId)
  if (!state) return
  state.messages.push({ role: 'assistant', content })
  state.lastActivity = Date.now()
}

export function addToolResults(
  threadId: string,
  results: Anthropic.ToolResultBlockParam[],
): void {
  const state = conversations.get(threadId)
  if (!state) return
  state.messages.push({ role: 'user', content: results })
  state.lastActivity = Date.now()
}

// Periodic cleanup of expired conversations
setInterval(() => {
  const now = Date.now()
  for (const [id, state] of conversations) {
    if (now - state.lastActivity > TTL_MS) {
      conversations.delete(id)
    }
  }
}, 60_000)
