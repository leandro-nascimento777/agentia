import type { ConversationMessage } from '../../entities/ConversationMessage'

export type ToolExecutor = (
  toolName: string,
  input: Record<string, unknown>
) => Promise<string>

export interface IAgentLLMPort {
  chat(
    systemPrompt: string,
    history: ConversationMessage[],
    newMessage: string,
    onToolCall: ToolExecutor
  ): Promise<string>
}
