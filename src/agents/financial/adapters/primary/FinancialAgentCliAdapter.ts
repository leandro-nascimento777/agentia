import * as readline from 'readline'
import type { IFinancialChatPort } from '../../domain/ports/input/IFinancialChatPort'

export class FinancialAgentCliAdapter {
  constructor(private readonly chatUseCase: IFinancialChatPort) {}

  async run(): Promise<void> {
    this.printWelcome()

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    const prompt = (): void => {
      rl.question('Você: ', async (input) => {
        const text = input.trim()

        if (!text || text.toLowerCase() === 'sair') {
          console.log('\nAté logo!\n')
          rl.close()
          return
        }

        console.log('\n⏳ Pensando...\n')

        try {
          const reply = await this.chatUseCase.chat(text)
          console.log(`\nAgente: ${reply}\n`)
        } catch (err) {
          console.error('Erro:', err instanceof Error ? err.message : err)
        }

        prompt()
      })
    }

    prompt()
  }

  private greeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bom dia'
    if (hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  private printWelcome(): void {
    console.log('╔══════════════════════════════════════════════╗')
    console.log('║         DIMAS — Sakura Consolidadora         ║')
    console.log('╚══════════════════════════════════════════════╝')
    console.log(`\n${this.greeting()}! Sou o DIMAS, assistente financeiro da Sakura Consolidadora.`)
    console.log('Posso te ajudar com:\n')
    console.log('  📊  Relatórios de passagens aéreas (SICA)')
    console.log('  🏨  Relatórios de não-aéreo — hotel, carro, etc. (SICA/SIGOT)')
    console.log('  🏢  Cadastro de empresas clientes e bloqueios de crédito')
    console.log('  👤  Mapeamento de executivos e gestores')
    console.log('  ✈️   Companhias aéreas cadastradas')
    console.log('  🎫  Bilhetes emitidos por agência')
    console.log('  🗄️   Consulta direta às tabelas SICA e SIGOT')
    console.log('  💚  Status dos bancos de dados\n')
    console.log('Exemplos de perguntas:')
    console.log('  • Quais empresas estão com bloqueio de crédito?')
    console.log('  • Liste as passagens aéreas da empresa 1234 em janeiro de 2025')
    console.log('  • Quantas agências estão ativas?')
    console.log('  • Mostre os bilhetes emitidos hoje')
    console.log('\nDigite "sair" para encerrar.\n')
  }
}
