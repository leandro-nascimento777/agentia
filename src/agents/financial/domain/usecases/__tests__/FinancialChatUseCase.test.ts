import { FinancialChatUseCase } from '../FinancialChatUseCase'
import type { IAgentLLMPort } from '../../ports/output/IAgentLLMPort'
import type { IFinancialDataPort } from '../../ports/output/IFinancialDataPort'
import type { IConversationHistoryPort } from '../../ports/output/IConversationHistoryPort'
import type { IUserPreferencesPort } from '../../ports/output/IUserPreferencesPort'
import type { ConversationMessage } from '../../entities/ConversationMessage'

function makeLLM(reply = 'resposta mock'): jest.Mocked<IAgentLLMPort> {
  return { chat: jest.fn().mockResolvedValue(reply) }
}

function makeData(): jest.Mocked<IFinancialDataPort> {
  return {
    checkHealth: jest.fn(),
    getSicaTables: jest.fn(), getSicaTableColumns: jest.fn(), querySicaTable: jest.fn(),
    getSigotTables: jest.fn(), getSigotTableColumns: jest.fn(), querySigotTable: jest.fn(),
    getAirReportFilial: jest.fn(), getAirReportRepresentante: jest.fn(),
    getNonAirSicaFilial: jest.fn(), getNonAirSicaRepresentante: jest.fn(),
    getNonAirSigotFilial: jest.fn(), getNonAirSigotRepresentante: jest.fn(),
    getCompanhiaAerea: jest.fn(), getEmpresaCadastro: jest.fn(),
    getExecutivoGestor: jest.fn(), getBilheteEmailAgencia: jest.fn(),
    getSaudeBase: jest.fn(), getInadimplencia: jest.fn(), getRankingGestores: jest.fn(),
    getPipeline: jest.fn(), getNovasAgencias: jest.fn(), getCreditoPorBase: jest.fn(),
    getRiscoAgencias: jest.fn(), getRankingCias: jest.fn(), getTopAgencias: jest.fn(),
    getEmbarquesFuturos: jest.fn(), getNacionalVsInternacional: jest.fn(),
  }
}

function makeHistory(messages: ConversationMessage[] = []): jest.Mocked<IConversationHistoryPort> {
  let store = [...messages]
  return {
    getHistory: jest.fn(() => [...store]),
    append:     jest.fn((msg) => { store.push(msg) }),
    truncate:   jest.fn((maxTurns) => {
      const max = maxTurns * 2
      if (store.length > max) store = store.slice(store.length - max)
    }),
  }
}

function makePreferences(): jest.Mocked<IUserPreferencesPort> {
  return {
    get:    jest.fn().mockReturnValue(undefined),
    set:    jest.fn(),
    getAll: jest.fn().mockReturnValue([]),
  }
}

describe('FinancialChatUseCase', () => {
  it('calls llm.chat and returns the reply', async () => {
    const llm = makeLLM('Aéreo: R$ 100.000')
    const useCase = new FinancialChatUseCase(llm, makeData(), makeHistory())

    const result = await useCase.chat('quanto foi o aéreo esse mês?')

    expect(result).toBe('Aéreo: R$ 100.000')
    expect(llm.chat).toHaveBeenCalledTimes(1)
  })

  it('passes current history to llm.chat', async () => {
    const existingHistory: ConversationMessage[] = [
      { role: 'user', content: 'mensagem anterior' },
      { role: 'assistant', content: 'resposta anterior' },
    ]
    const llm = makeLLM()
    const useCase = new FinancialChatUseCase(llm, makeData(), makeHistory(existingHistory))

    await useCase.chat('nova mensagem')

    const [, historyArg] = llm.chat.mock.calls[0]
    expect(historyArg).toHaveLength(2)
    expect(historyArg[0].content).toBe('mensagem anterior')
  })

  it('appends user and assistant messages to history after response', async () => {
    const history = makeHistory()
    const useCase = new FinancialChatUseCase(makeLLM('ok'), makeData(), history)

    await useCase.chat('pergunta')

    expect(history.append).toHaveBeenCalledTimes(2)
    const [firstCall, secondCall] = history.append.mock.calls
    expect(firstCall[0]).toMatchObject({ role: 'user', content: 'pergunta' })
    expect(secondCall[0]).toMatchObject({ role: 'assistant', content: 'ok' })
  })

  it('truncates history after appending', async () => {
    const history = makeHistory()
    const useCase = new FinancialChatUseCase(makeLLM(), makeData(), history)

    await useCase.chat('qualquer coisa')

    expect(history.truncate).toHaveBeenCalledWith(8)
  })

  it('propagates errors from the llm', async () => {
    const llm = makeLLM()
    llm.chat.mockRejectedValue(new Error('LLM indisponível'))
    const useCase = new FinancialChatUseCase(llm, makeData(), makeHistory())

    await expect(useCase.chat('oi')).rejects.toThrow('LLM indisponível')
  })

  it('does not append to history when llm throws', async () => {
    const llm = makeLLM()
    llm.chat.mockRejectedValue(new Error('falha'))
    const history = makeHistory()
    const useCase = new FinancialChatUseCase(llm, makeData(), history)

    await expect(useCase.chat('oi')).rejects.toThrow()
    expect(history.append).not.toHaveBeenCalled()
  })

  it('includes system prompt with today date', async () => {
    const llm = makeLLM()
    const useCase = new FinancialChatUseCase(llm, makeData(), makeHistory())

    await useCase.chat('oi')

    const [systemPromptArg] = llm.chat.mock.calls[0]
    const today = new Date().toLocaleDateString('pt-BR')
    expect(systemPromptArg).toContain(today)
    expect(systemPromptArg).toContain('DIMAS')
  })

  describe('processMarkers', () => {
    it('strips the SET_BRIEFING_TIME marker from the reply', async () => {
      const llm = makeLLM('Horário atualizado! [SET_BRIEFING_TIME:09:30]')
      const useCase = new FinancialChatUseCase(llm, makeData(), makeHistory())

      const result = await useCase.chat('muda para 9h30')

      expect(result).not.toContain('[SET_BRIEFING_TIME:')
      expect(result).toContain('Horário atualizado!')
    })

    it('persists briefing time when preferences and phone are provided', async () => {
      const prefs = makePreferences()
      const llm = makeLLM('Ok! [SET_BRIEFING_TIME:07:00]')
      const useCase = new FinancialChatUseCase(
        llm, makeData(), makeHistory(), 'whatsapp:+5511999990000', prefs
      )

      await useCase.chat('muda para 7h')

      expect(prefs.set).toHaveBeenCalledWith('whatsapp:+5511999990000', { briefingTime: '07:00' })
    })

    it('does not call preferences.set when reply has no marker', async () => {
      const prefs = makePreferences()
      const llm = makeLLM('Resposta normal sem marcador')
      const useCase = new FinancialChatUseCase(
        llm, makeData(), makeHistory(), 'whatsapp:+5511999990000', prefs
      )

      await useCase.chat('olá')

      expect(prefs.set).not.toHaveBeenCalled()
    })
  })
})
