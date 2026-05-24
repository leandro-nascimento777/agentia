export interface ConversationMessage {
  readonly role: 'user' | 'assistant'
  readonly content: string
}

export function createMessage(role: 'user' | 'assistant', content: string): ConversationMessage {
  if (!content.trim()) throw new Error('Message content cannot be empty')
  return { role, content }
}
