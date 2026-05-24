import type { IConversationHistoryPort } from '../../domain/ports/output/IConversationHistoryPort'
import type { ConversationMessage } from '../../domain/entities/ConversationMessage'

export class InMemoryConversationRepository implements IConversationHistoryPort {
  private messages: ConversationMessage[] = []

  getHistory(): ConversationMessage[] {
    return [...this.messages]
  }

  append(message: ConversationMessage): void {
    this.messages.push(message)
  }

  truncate(maxTurns: number): void {
    const maxMessages = maxTurns * 2
    if (this.messages.length > maxMessages) {
      this.messages = this.messages.slice(this.messages.length - maxMessages)
    }
  }
}
