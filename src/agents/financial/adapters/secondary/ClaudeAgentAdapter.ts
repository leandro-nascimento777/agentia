import Anthropic from '@anthropic-ai/sdk'
import type { IAgentLLMPort, ToolExecutor } from '../../domain/ports/output/IAgentLLMPort'
import type { ConversationMessage } from '../../domain/entities/ConversationMessage'
import { FINANCIAL_TOOLS } from './tools/financialTools'

export class ClaudeAgentAdapter implements IAgentLLMPort {
  private static readonly MAX_TOKENS = 4096

  constructor(
    private readonly client: Anthropic,
    private readonly model: string = 'claude-haiku-4-5-20251001'
  ) {}

  async chat(
    systemPrompt: string,
    history: ConversationMessage[],
    newMessage: string,
    onToolCall: ToolExecutor
  ): Promise<string> {
    const messages: Anthropic.MessageParam[] = [
      ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: newMessage }
    ]

    while (true) {
      const response = await this.client.messages.create({
        model:      this.model,
        max_tokens: ClaudeAgentAdapter.MAX_TOKENS,
        system:     systemPrompt,
        tools:      FINANCIAL_TOOLS,
        messages
      })

      messages.push({ role: 'assistant', content: response.content })

      if (response.stop_reason === 'end_turn') {
        return response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text)
          .join('')
      }

      if (response.stop_reason !== 'tool_use') break

      const toolResults = await this.executeToolCalls(response.content, onToolCall)
      messages.push({ role: 'user', content: toolResults })
    }

    return '(sem resposta)'
  }

  private async executeToolCalls(
    blocks: Anthropic.ContentBlock[],
    onToolCall: ToolExecutor
  ): Promise<Anthropic.ToolResultBlockParam[]> {
    const toolBlocks = blocks.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')

    // Executa todas as tool calls em paralelo
    return Promise.all(
      toolBlocks.map(async block => {
        console.log(`  🔧 ${block.name}(${JSON.stringify(block.input)})`)
        const content = await onToolCall(block.name, block.input as Record<string, unknown>)
        console.log(`     ↳ ${content.slice(0, 120)}...`)
        return { type: 'tool_result' as const, tool_use_id: block.id, content }
      })
    )
  }
}
