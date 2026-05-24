# AgentIA — DIMAS: Assistente Executivo da Sakura

Assistente executivo corporativo B2B que opera dentro do WhatsApp, integrado aos sistemas internos da Sakura Consolidadora (SICA, SIGOT, Doc4Sign). Evolução do AgentIA financeiro para um produto completo de IA executiva.

## O que é o DIMAS

- Envia **briefings automáticos** 3x ao dia (manhã, meio-dia, noite) com volume de vendas, alertas e agenda
- Responde perguntas sobre agências em tempo real (faturamento, crédito, inadimplência)
- Alerta imediatamente quando agências entram na lista Sofia ou estouram o crédito
- Assina contratos via Doc4Sign direto no WhatsApp *(Fase 2)*
- Envia mensagens em nome do executivo para terceiros, identificando-se como assistente *(Fase 2)*
- Múltiplos DIMAS conectados por hierarquia, comunicando-se via fila *(Fase 3)*
- Produto para agências de viagem: atendimento a cliente final fora do horário *(Fase 4)*

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 + TypeScript |
| LLM | Claude Sonnet 4.6 (Anthropic) |
| WhatsApp | Twilio |
| Queue / Scheduler | BullMQ + Redis |
| Banco de dados | Supabase (PostgreSQL) |
| Dados operacionais | SICA + SIGOT |
| Contratos | Doc4Sign *(Fase 2)* |
| Arquitetura | Hexagonal (ports & adapters) |

## Estrutura do Projeto

```
src/
├── agents/
│   ├── financial/          # Agente financeiro atual (DIMAS v1)
│   │   ├── domain/         # Entities, ports, use cases
│   │   ├── adapters/       # Claude, SICA/SIGOT, Twilio, memória
│   │   └── infrastructure/ # Container de dependências
│   └── dimas/              # DIMAS executivo completo (em desenvolvimento)
├── app/
│   └── api/whatsapp/       # Webhooks Twilio
└── domain/                 # Domínio de roteiros de viagem (legado)

SPEC.md     # Especificação funcional completa (o que o sistema faz)
SDD.md      # Design técnico completo (como a arquitetura funciona)
```

## Documentação

- **[SPEC.md](SPEC.md)** — Requisitos funcionais, regras de negócio, roadmap de fases
- **[SDD.md](SDD.md)** — Arquitetura, modelo de dados, tools, segurança, deploy

## Rodando Localmente

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local
# edite .env.local com suas chaves

# Iniciar servidor
npm run dev

# Rodar agente financeiro no terminal
npm run agent:financial
```

## Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

| Variável | Descrição |
|---|---|
| `ANTHROPIC_API_KEY` | Chave da API Claude (Anthropic) |
| `TWILIO_ACCOUNT_SID` | SID da conta Twilio |
| `TWILIO_AUTH_TOKEN` | Token de autenticação Twilio |
| `TWILIO_WHATSAPP_NUMBER` | Número WhatsApp Twilio (`whatsapp:+55...`) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role do Supabase |
| `REDIS_URL` | URL do Redis para BullMQ |
| `SICA_API_URL` | URL da API SICA |
| `SICA_API_KEY` | Chave de acesso SICA |
| `SIGOT_API_URL` | URL da API SIGOT |
| `SIGOT_API_KEY` | Chave de acesso SIGOT |

## Roadmap

| Fase | Escopo | Status |
|---|---|---|
| **MVP (Fase 1)** | Briefing automático, consulta de agências, alertas Sofia/crédito | Em desenvolvimento |
| **Fase 2** | Doc4Sign no WhatsApp, delegação em nome do executivo | Planejado |
| **Fase 3** | Multi-DIMAS, protocolo entre agentes, hierarquia BullMQ | Planejado |
| **Fase 4** | DIMAS Agência — produto para agências clientes | Planejado |

## Custo Operacional (MVP — 5 usuários)

| Item | Custo/mês |
|---|---|
| Railway (app + Redis) | ~$55 |
| Supabase Pro | ~$25 |
| Twilio WhatsApp | ~$50 |
| Claude API (Sonnet) | ~$95 |
| **Total** | **~$225 / R$ 1.300** |
