export interface IFinancialChatPort {
  chat(userMessage: string): Promise<string>
}
