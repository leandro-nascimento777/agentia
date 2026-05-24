# DIMAS — Assistente Financeiro da Sakura

Assistente financeiro pessoal que opera via WhatsApp e traz um panorama completo das vendas da Sakura Consolidadora todo dia, no horário que o usuário escolher.

## O que o DIMAS faz hoje

**Panorama diário automático** (horário configurável pelo próprio usuário):
- Quanto foi vendido ontem — Aéreo e Terrestre separados, e total
- Acumulado do mês até hoje
- Comparativo com o mesmo período do ano passado
- Novas agências cadastradas no mês

**Consultas sob demanda via WhatsApp:**
- Vendas por período, por tipo (Aéreo / Terrestre)
- Cadastro de empresas, bloqueio de crédito
- Executivos e gestores
- Bilhetes emitidos por agência

**Configuração de horário:**
Wagner pode mudar o horário do briefing a qualquer momento: _"muda para 7h"_ e o DIMAS confirma e atualiza.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 + TypeScript |
| LLM | Claude Haiku 4.5 (Anthropic) |
| WhatsApp | Twilio |
| Scheduler | node-cron |
| Dados | SICA + SIGOT (API HTTP) |
| Arquitetura | Hexagonal (ports & adapters) |

## Estrutura

```
src/
└── agents/
    └── financial/
        ├── domain/
        │   ├── entities/          # ConversationMessage
        │   ├── ports/             # IFinancialDataPort (e sub-interfaces), IUserPreferencesPort
        │   ├── prompts/           # System prompts centralizados
        │   └── usecases/          # FinancialChatUseCase, BuildMorningBriefingUseCase
        ├── adapters/
        │   ├── primary/           # TwilioWhatsAppAdapter, FinancialAgentCliAdapter
        │   └── secondary/         # ClaudeAgentAdapter, FinancialAdapterHttpClient,
        │                          # InMemoryConversationRepository, InMemoryUserPreferencesRepository
        └── infrastructure/        # FinancialAgentContainer, BriefingScheduler, container.singleton
```

## Rodando localmente

```bash
npm install
cp .env.example .env.local
# preencha as variáveis
npm run dev
```

Para usar o agente no terminal (sem WhatsApp):
```bash
npm run agent:financial
```

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sim | Chave da API Claude |
| `FINANCIAL_SECRET` | Sim | Secret de acesso à API SICA/SIGOT |
| `FINANCIAL_BASE_URL` | Não | URL base da API (padrão: flysakura.com) |
| `TWILIO_ACCOUNT_SID` | Para WhatsApp | SID da conta Twilio |
| `TWILIO_AUTH_TOKEN` | Para WhatsApp | Token Twilio |
| `TWILIO_WHATSAPP_FROM` | Para WhatsApp | Número remetente (`+14155238886`) |

## Documentação técnica

- **[SPEC.md](SPEC.md)** — especificação funcional do roadmap DIMAS completo
- **[SDD.md](SDD.md)** — design técnico detalhado
