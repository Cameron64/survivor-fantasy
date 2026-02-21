import Anthropic from '@anthropic-ai/sdk'
import { readToolDefinitions, executeReadTool } from './read-tools'
import { writeToolDefinitions, executeWriteTool } from './write-tools'
import { approvalToolDefinitions, executeApprovalTool } from './approval-tools'

const READ_TOOLS = new Set(readToolDefinitions.map((t) => t.name))
const WRITE_TOOLS = new Set(writeToolDefinitions.map((t) => t.name))
const APPROVAL_TOOLS = new Set(approvalToolDefinitions.map((t) => t.name))

export const allToolDefinitions: Anthropic.Tool[] = [
  ...readToolDefinitions,
  ...writeToolDefinitions,
  ...approvalToolDefinitions,
]

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  actingUserId: string,
): Promise<string> {
  if (READ_TOOLS.has(name)) return executeReadTool(name, input, actingUserId)
  if (WRITE_TOOLS.has(name)) return executeWriteTool(name, input, actingUserId)
  if (APPROVAL_TOOLS.has(name)) return executeApprovalTool(name, input, actingUserId)
  return JSON.stringify({ error: `Unknown tool: ${name}` })
}

/** Check if a tool name was used in a set of tool-use blocks */
export function wasToolUsed(
  toolName: string,
  content: Anthropic.ContentBlock[],
): boolean {
  return content.some(
    (block) => block.type === 'tool_use' && block.name === toolName,
  )
}
