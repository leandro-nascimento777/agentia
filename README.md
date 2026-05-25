# DIMAS — Assistente Financeiro da Sakura

Assistente financeiro pessoal que opera via WhatsApp e traz um panorama completo das vendas da Sakura Consolidadora todo dia, no horário que o usuário escolher.

## O que o DIMAS faz hoje

**Panorama diário automático** (horário configurável pelo próprio usuário):
- Quanto foi vendido hoje e ontem — Aéreo e Terrestre separados, variação %
- Acumulado do mês até hoje vs mesmo período do ano passado
- Novas agências cadastradas no mês

**Relatórios de dashboard (Supabase):**
- `saúde` — % de agências vendendo por base nos últimos 30 dias
- `inadimplência` — faturas vencidas e top devedoras
- `ranking gestores` — volume, bilhetes e inadimplência por gestor
- `pipeline` — onboarding de novas agências por etapa
- `novas agências` — cadastros dos últimos 7 dias
- `crédito por base` — exposição de limite por regional
- `risco` — agências com limite alto sem comprar há 90+ dias
- `cias` — top companhias aéreas do mês
- `top agências` — maiores compradoras do mês
- `embarques` — próximos voos dos próximos dias
- `nacional vs internacional` — proporção de rotas

**Consultas sob demanda via WhatsApp:**
- Vendas por período, empresa, executivo, tipo de rota
- Cadastro de empresas e bloqueio de crédito
- Executivos e gestores
- Bilhetes emitidos por agência
- Consulta direta às tabelas SICA e SIGOT

**Configuração de horário:**
O usuário pode mudar o horário do briefing a qualquer momento: _"muda para 7h"_ e o DIMAS confirma e atualiza.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 + TypeScript |
| LLM | Claude Haiku 4.5 (Anthropic) |
| WhatsApp | Twilio |
| Scheduler | node-cron |
| Dados operacionais | SICA + SIGOT (API HTTP) |
| Dados de dashboard | Supabase (PostgreSQL direto) |
| Arquitetura | Hexagonal (ports & adapters) |

## Estrutura

```
src/
└── agents/
    └── financial/
        ├── domain/
        │   ├── entities/          # ConversationMessage
        │   ├── ports/             # IFinancialDataPort, IDashboardPort, IRateLimitPort, IUserPreferencesPort
        │   ├── prompts/           # System prompts centralizados
        │   ├── usecases/          # FinancialChatUseCase, BuildMorningBriefingUseCase
        │   └── utils/             # getGreeting()
        ├── adapters/
        │   ├── primary/           # TwilioWhatsAppAdapter, FinancialAgentCliAdapter
        │   └── secondary/         # ClaudeAgentAdapter, FinancialAdapterHttpClient,
        │                          # SupabaseReportAdapter, CombinedFinancialAdapter,
        │                          # InMemoryConversationRepository,
        │                          # InMemoryUserPreferencesRepository,
        │                          # InMemoryRateLimitRepository
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

Para rodar os testes:
```bash
npm test
```

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sim | Chave da API Claude |
| `FINANCIAL_SECRET` | Sim | Secret de acesso à API SICA/SIGOT |
| `FINANCIAL_BASE_URL` | Não | URL base da API (padrão: flysakura.com) |
| `ANTHROPIC_MODEL` | Não | Modelo Claude (padrão: claude-haiku-4-5-20251001) |
| `TWILIO_ACCOUNT_SID` | Para WhatsApp | SID da conta Twilio |
| `TWILIO_AUTH_TOKEN` | Para WhatsApp | Token Twilio |
| `TWILIO_WHATSAPP_FROM` | Para WhatsApp | Número remetente (`+14155238886`) |
| `SUPABASE_URL` | Para dashboard | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Para dashboard | Chave service_role (Settings → API) |
| `OWNER_WHATSAPP` | Não | Número do usuário principal (`whatsapp:+55...`) |
| `OWNER_NAME` | Não | Nome do usuário principal |
| `OWNER_BRIEFING_TIME` | Não | Horário do briefing (padrão: `08:00`) |

> **Atenção:** Use `service_role` key do Supabase, não a anon key. Sem ela, os relatórios de dashboard ficam indisponíveis mas o restante funciona normalmente.

## Documentação técnica

- **[SPEC-UPDATE.md](SPEC-UPDATE.md)** — especificação da atualização v1.1 (gaps vs Lovable, requisitos, roadmap)
- **[SDD-UPDATE.md](SDD-UPDATE.md)** — design técnico da v1.1 (mudanças por arquivo, tools, queries SQL)
