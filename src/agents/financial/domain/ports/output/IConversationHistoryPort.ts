import type { ConversationMessage } from '../../entities/ConversationMessage'

export interface IConversationHistoryPort {
  getHistory(): ConversationMessage[]
  append(message: ConversationMessage): void
  truncate(maxTurns: number): void
}
