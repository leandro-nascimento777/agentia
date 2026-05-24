# SDD — DIMAS: Software Design Document
**Versão:** 1.0  
**Data:** 2026-05-24  
**Status:** Aprovado para desenvolvimento  
**Referência:** SPEC.md v1.0  

---

## 1. Visão Arquitetural

O DIMAS é construído como uma evolução do AgentIA existente, mantendo a **arquitetura hexagonal (ports & adapters)** já estabelecida. A adição principal é a camada de orquestração de agentes com scheduler e bus de eventos.

```
┌─────────────────────────────────────────────────────┐
│                  DIMAS CORE                         │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐  │
│  │  Orchestrator │    │   Briefing Scheduler     │  │
│  │  (NestJS /    │    │   (BullMQ cron jobs)     │  │
│  │   Next.js)    │    └──────────────────────────┘  │
│  └──────┬───────┘                                   │
│         │                                           │
│  ┌──────▼───────────────────────────────────────┐  │
│  │              Domain Layer                    │  │
│  │  DimosExecutiveUseCase  AlertMonitorUseCase  │  │
│  └──────┬───────────────────────────────────────┘  │
└─────────┼───────────────────────────────────────────┘
          │ Ports (interfaces)
┌─────────▼───────────────────────────────────────────┐
│              Adapters (Secundários)                 │
│                                                     │
│  ClaudeAdapter   SicaAdapter    TwilioAdapter       │
│  Doc4SignAdapter SupabaseAdapter SchedulerAdapter   │
└─────────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────┐
│              Sistemas Externos                      │
│                                                     │
│  Claude API  SICA/SIGOT  Twilio  Doc4Sign  Redis   │
└─────────────────────────────────────────────────────┘
```

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | Next.js 15 + TypeScript | Já em produção no AgentIA |
| LLM | Claude Sonnet 4.6 (claude-sonnet-4-6) | Maior capacidade de raciocínio para orquestração |
| WhatsApp | Twilio WhatsApp API | Já integrado |
| Scheduler/Queue | BullMQ + Redis | Fila de jobs com retry, cron, e message bus |
| Memória | Supabase (PostgreSQL) | Persistência de histórico, preferências, auditoria |
| Dados operacionais | SICA + SIGOT (já integrados) | Fonte de dados financeiros e cadastrais |
| Contratos | Doc4Sign API | Assinatura eletrônica (Fase 2) |
| Infra | Railway ou Render | Deploy 24/7, Redis nativo |

---

## 3. Estrutura de Módulos

```
src/
├── agents/
│   └── dimas/                          ← Módulo principal do DIMAS
│       ├── domain/
│       │   ├── entities/
│       │   │   ├── DimasAgent.ts       ← Entidade: identidade e permissões do agente
│       │   │   ├── Briefing.ts         ← Value object: estrutura do briefing
│       │   │   ├── Alert.ts            ← Value object: tipos de alerta
│       │   │   └── AgentAction.ts      ← Value object: ação auditável
│       │   ├── ports/
│       │   │   ├── input/
│       │   │   │   ├── IDimasChatPort.ts
│       │   │   │   └── IBriefingPort.ts
│       │   │   └── output/
│       │   │       ├── ILLMPort.ts
│       │   │       ├── IDataPort.ts         ← SICA/SIGOT (já existe como IFinancialDataPort)
│       │   │       ├── IMessagingPort.ts    ← Twilio
│       │   │       ├── IMemoryPort.ts       ← Supabase
│       │   │       ├── ISchedulerPort.ts    ← BullMQ
│       │   │       ├── IContractPort.ts     ← Doc4Sign (Fase 2)
│       │   │       └── IAuditPort.ts
│       │   └── usecases/
│       │       ├── DimaChatUseCase.ts       ← Conversa principal
│       │       ├── BriefingUseCase.ts       ← Monta e envia briefing
│       │       └── AlertMonitorUseCase.ts   ← Monitora e dispara alertas
│       ├── adapters/
│       │   ├── primary/
│       │   │   ├── TwilioWebhookAdapter.ts  ← Entrada de mensagens
│       │   │   └── SchedulerJobAdapter.ts   ← Entrada de jobs agendados
│       │   └── secondary/
│       │       ├── ClaudeSonnetAdapter.ts
│       │       ├── SicaDataAdapter.ts       ← Reutiliza FinancialAdapterHttpClient
│       │       ├── TwilioMessagingAdapter.ts
│       │       ├── SupabaseMemoryAdapter.ts
│       │       ├── BullMQSchedulerAdapter.ts
│       │       ├── Doc4SignAdapter.ts       ← Fase 2
│       │       ├── AuditLogAdapter.ts
│       │       └── tools/
│       │           └── dimasTools.ts        ← Tool definitions para Claude
│       ├── infrastructure/
│       │   ├── DimasContainer.ts            ← Injeção de dependências
│       │   └── dimasAgents.config.ts        ← Configuração por agente (Wagner, Newton...)
│       └── index.ts
├── agents/
│   └── financial/                     ← Módulo existente (mantido)
└── app/
    └── api/
        └── whatsapp/
            └── dimas/
                └── route.ts           ← Webhook entry point
```

---

## 4. Modelo de Dados

### 4.1 Tabela: `dimas_agents`
```sql
CREATE TABLE dimas_agents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,         -- 'wagner', 'newton', 'cassio'
  display_name  TEXT NOT NULL,                -- 'DIMAS do Wagner'
  owner_phone   TEXT NOT NULL,                -- número WhatsApp do executivo
  persona_name  TEXT NOT NULL DEFAULT 'DIMAS', -- nome usado ao se apresentar
  owner_name    TEXT NOT NULL,                -- 'Wagner'
  company_name  TEXT NOT NULL DEFAULT 'Sakura Consolidadora',
  permissions   JSONB NOT NULL DEFAULT '{}', -- quais tools pode usar
  briefing_times TEXT[] DEFAULT ARRAY['07:00','12:00','19:00'],
  timezone      TEXT DEFAULT 'America/Sao_Paulo',
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Tabela: `dimas_conversations`
```sql
CREATE TABLE dimas_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID REFERENCES dimas_agents(id),
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',  -- tipo de mensagem, tools usadas
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: cada agent_id só lê suas próprias conversas
ALTER TABLE dimas_conversations ENABLE ROW LEVEL SECURITY;
```

### 4.3 Tabela: `dimas_preferences`
```sql
CREATE TABLE dimas_preferences (
  agent_id    UUID PRIMARY KEY REFERENCES dimas_agents(id),
  briefing_times TEXT[] DEFAULT ARRAY['07:00','12:00','19:00'],
  briefing_enabled BOOLEAN DEFAULT true,
  last_briefing_sent TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.4 Tabela: `dimas_audit_log`
```sql
CREATE TABLE dimas_audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID REFERENCES dimas_agents(id),
  action_type TEXT NOT NULL,      -- 'tool_call', 'message_sent', 'contract_signed', 'alert_fired'
  tool_name   TEXT,
  input       JSONB,
  output      JSONB,
  success     BOOLEAN,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.5 Tabela: `dimas_alerts`
```sql
CREATE TABLE dimas_alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID REFERENCES dimas_agents(id),
  type        TEXT NOT NULL,   -- 'sofia', 'credit_limit', 'contract_expiry', 'goal_risk'
  payload     JSONB NOT NULL,  -- dados específicos do alerta
  fired_at    TIMESTAMPTZ,     -- null = pendente
  acked_at    TIMESTAMPTZ,     -- null = não confirmado pelo usuário
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Entidades de Domínio

### 5.1 DimasAgent
```typescript
interface DimasAgent {
  id: string
  slug: string               // 'wagner'
  personaName: string        // 'DIMAS'
  ownerName: string          // 'Wagner'
  ownerPhone: string
  companyName: string
  permissions: AgentPermissions
  briefingTimes: string[]    // ['07:00', '12:00', '19:00']
  timezone: string
}

interface AgentPermissions {
  canQuerySica: boolean
  canQuerySigot: boolean
  canSignContracts: boolean
  canSendOnBehalf: boolean
  canAccessFinancial: boolean
  canViewSofiaList: boolean
}
```

### 5.2 Briefing
```typescript
interface Briefing {
  agentId: string
  period: { start: Date; end: Date }
  salesData: {
    air: { total: number; count: number; vsLastYear: number }
    nonAir: { total: number; count: number; vsLastYear: number }
    monthToDate: { total: number; goalPercent: number }
  }
  newAgencies: number
  pendingContracts: PendingContract[]
  activeAlerts: Alert[]
  schedule: CalendarEvent[]
  travelWarning?: TravelWarning
}
```

### 5.3 Alert
```typescript
type AlertType = 'sofia_entry' | 'credit_limit' | 'contract_expiry' | 'goal_risk'

interface Alert {
  type: AlertType
  urgency: 'immediate' | 'next_briefing'
  agencyName?: string
  agencyCnpj?: string
  detail: string
  suggestedAction?: string
}
```

---

## 6. System Prompt do DIMAS

O system prompt é construído dinamicamente por agente. Abaixo o template:

```
Você é o DIMAS, assistente executivo pessoal de {ownerName} na {companyName}.

IDENTIDADE:
- Seu nome é DIMAS.
- Você representa {ownerName} quando autorizado. Nesse caso, identifique-se sempre como
  "DIMAS, assistente de {ownerName} ({companyName})".
- Tom: profissional, direto e próximo. Nunca robótico.

FORMATAÇÃO (WhatsApp):
- Sem markdown: sem *, **, #, ---.
- Máximo 20 linhas por resposta, salvo quando pedido detalhe.
- Números em formato brasileiro: R$ 1.234,56
- Datas em formato brasileiro: 29/05/2026

REGRAS DE NEGÓCIO:
- Nunca mencione SICA, SIGOT, filial, representante ou nomes técnicos de sistema.
  Use apenas "Aéreo" e "Não-aéreo".
- Nunca execute ação irreversível (assinar contrato, enviar mensagem para terceiros)
  sem confirmação explícita de {ownerName} nesta conversa.
- Se uma fonte de dados falhar, informe honestamente antes de apresentar resultado parcial.
- Dados de crédito e financeiros são sempre buscados em tempo real — nunca invente.

MAPEAMENTO DE DADOS:
- "Aéreo" → report_air_sica_filial + report_air_sica_representante (somar)
- "Não-aéreo" → report_non_air_sica_filial + report_non_air_sica_representante
                + report_non_air_sigot_filial + report_non_air_sigot_representante (somar)
- Disparar todas as chamadas necessárias em paralelo.
- NUNCA usar report_air_sica_geral (instável).

HOJE: {currentDate}
AGENTE: {agentSlug}
```

---

## 7. Tools do DIMAS

Além das tools financeiras já existentes (financialTools.ts), adicionar:

```typescript
// dimasTools.ts — tools exclusivas do DIMAS
const DIMAS_EXCLUSIVE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_briefing_data',
    description: 'Busca todos os dados necessários para montar o briefing executivo do dia.',
    input_schema: {
      type: 'object',
      properties: {
        period_hours: { type: 'integer', description: 'Quantas horas retroativas (padrão: 24)' }
      }
    }
  },
  {
    name: 'get_pending_contracts',
    description: 'Lista contratos pendentes de assinatura para este executivo.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'sign_contract',
    description: 'Inicia fluxo de assinatura de contrato via Doc4Sign. REQUER confirmação prévia do usuário.',
    input_schema: {
      type: 'object',
      properties: {
        contract_id: { type: 'string' },
        user_confirmed: { type: 'boolean', description: 'Deve ser true — usuário confirmou na conversa' }
      },
      required: ['contract_id', 'user_confirmed']
    }
  },
  {
    name: 'send_whatsapp_on_behalf',
    description: 'Envia mensagem WhatsApp em nome do executivo para um contato. REQUER confirmação prévia.',
    input_schema: {
      type: 'object',
      properties: {
        contact_id: { type: 'string', description: 'ID do contato na base SICA' },
        message: { type: 'string' },
        user_confirmed: { type: 'boolean' }
      },
      required: ['contact_id', 'message', 'user_confirmed']
    }
  },
  {
    name: 'save_user_preference',
    description: 'Salva uma preferência do usuário (ex: horário de briefing).',
    input_schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        value: { type: 'string' }
      },
      required: ['key', 'value']
    }
  },
  {
    name: 'get_sofia_list',
    description: 'Retorna agências na lista Sofia (devedoras) com valores em aberto.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'integer' }
      }
    }
  }
]
```

---

## 8. Fluxo de Orquestração

### 8.1 Mensagem Recebida do WhatsApp

```
1. Twilio POST → /api/whatsapp/dimas
2. TwilioWebhookAdapter → identifica agente pelo número de destino
3. Carrega DimasAgent do Supabase
4. Carrega histórico recente (8 turnos) do Supabase
5. Monta payload: system_prompt + histórico + nova mensagem + tools
6. Chama Claude API (Sonnet)
7. Claude retorna tool_calls ou end_turn
8. Se tool_calls:
   a. Orchestrator valida permissões do agente
   b. Executa tools em paralelo
   c. Loga no dimas_audit_log
   d. Devolve resultados para Claude
   e. Repete até end_turn
9. Salva turno no dimas_conversations
10. Envia resposta via Twilio
```

### 8.2 Job de Briefing (BullMQ Cron)

```
1. Cron dispara no horário configurado por agente
2. BullMQSchedulerAdapter enfileira job: { agentId, briefingType: 'morning' }
3. Worker pega o job
4. Chega DimaBriefingUseCase:
   a. Busca preferências do agente
   b. Chama get_briefing_data (SICA + SIGOT em paralelo)
   c. Chama get_pending_contracts
   d. Chama get_sofia_list
   e. Busca agenda (Fase 2)
   f. Monta Briefing entity
   g. Renderiza texto formatado para WhatsApp
5. Envia via Twilio
6. Salva last_briefing_sent em dimas_preferences
7. Loga em dimas_audit_log
```

### 8.3 Monitor de Alertas (BullMQ Repeat)

```
A cada 30 minutos:
1. Para cada agente ativo:
   a. Consulta lista Sofia → novidades vs última execução → alert tipo 'sofia_entry' (urgência: imediata)
   b. Consulta agências com crédito > 80% → alert tipo 'credit_limit'
   c. Consulta contratos vencendo em 7 dias → alert tipo 'contract_expiry'
2. Alertas imediatos: envia WhatsApp agora
3. Alertas normais: salva em dimas_alerts para incluir no próximo briefing
```

---

## 9. Segurança

### 9.1 Autenticação e Autorização

```typescript
// Cada agente tem permissões explícitas
const PERMISSION_GATES: Record<string, keyof AgentPermissions> = {
  'sign_contract':           'canSignContracts',
  'send_whatsapp_on_behalf': 'canSendOnBehalf',
  'get_sofia_list':          'canViewSofiaList',
  'report_empresa_cadastro': 'canQuerySica',
}

// O Orchestrator valida ANTES de executar qualquer tool
function validatePermission(agent: DimasAgent, toolName: string): void {
  const required = PERMISSION_GATES[toolName]
  if (required && !agent.permissions[required]) {
    throw new PermissionDeniedError(`Agente ${agent.slug} não tem permissão para ${toolName}`)
  }
}
```

### 9.2 Confirmação de Ações Irreversíveis

Qualquer tool marcada como irreversível exige `user_confirmed: true` no input. Se `false` ou ausente, o Orchestrator retorna erro antes de chamar a API externa.

Ações irreversíveis: `sign_contract`, `send_whatsapp_on_behalf`.

### 9.3 Proteção contra Prompt Injection

Antes de processar qualquer ferramenta destrutiva, o Orchestrator valida se a última mensagem do usuário continha confirmação positiva ("sim", "pode", "confirmo", "vai", "yes"):

```typescript
function requiresConfirmation(toolName: string): boolean {
  return ['sign_contract', 'send_whatsapp_on_behalf'].includes(toolName)
}

function hasRecentConfirmation(history: ConversationMessage[]): boolean {
  const lastUserMsg = [...history].reverse().find(m => m.role === 'user')
  const confirmWords = /\b(sim|pode|confirmo|vai|yes|ok|certo|autorizo)\b/i
  return confirmWords.test(lastUserMsg?.content ?? '')
}
```

### 9.4 Dados em Trânsito e em Repouso

| Camada | Proteção |
|---|---|
| Twilio → App | TLS obrigatório + webhook signature validation |
| App → Claude API | HTTPS + chave por ambiente |
| App → Supabase | TLS + RLS ativo por agente |
| App → SICA/SIGOT | Service account read-only, conexão interna |
| Redis | Senha obrigatória + acesso apenas interno |

### 9.5 Auditoria

Todo tool call é registrado em `dimas_audit_log` antes da execução (entrada) e após (saída + duração). O log é imutável — sem UPDATE ou DELETE.

---

## 10. Comunicação Multi-Agente (Fase 3)

### 10.1 Protocolo de Mensagens entre Agentes

```typescript
interface InterAgentMessage {
  from: string       // slug do agente remetente: 'wagner'
  to: string         // slug do agente destinatário: 'cassio'
  requestId: string  // UUID para rastreamento
  type: 'request' | 'response'
  payload: {
    task: string     // descrição da tarefa
    context?: string // contexto adicional
    deadline?: string
  }
  replyQueue: string // 'dimas.wagner.inbox'
  createdAt: string
}
```

### 10.2 Filas BullMQ

```
dimas.{slug}.inbox      ← fila de entrada de cada agente
dimas.{slug}.outbox     ← fila de saída de cada agente
dimas.alerts            ← fila compartilhada de alertas
dimas.briefings         ← fila de jobs de briefing
dimas.monitor           ← fila do monitor de alertas (repeat)
```

### 10.3 Regra de Hierarquia

O agente `wagner` pode publicar em qualquer fila `.inbox`.  
Agentes de nível 2 (`newton`, `cassio`, `jean`) só podem publicar em `wagner.inbox`.  
Nenhum agente acessa diretamente o banco do outro — comunicação sempre via fila.

---

## 11. Ambiente e Deploy

### 11.1 Variáveis de Ambiente

```env
# Claude
ANTHROPIC_API_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Redis (BullMQ)
REDIS_URL=

# SICA/SIGOT (já existentes)
SICA_API_URL=
SICA_API_KEY=
SIGOT_API_URL=
SIGOT_API_KEY=

# Doc4Sign (Fase 2)
DOC4SIGN_API_KEY=
DOC4SIGN_BASE_URL=

# App
NODE_ENV=production
PORT=3000
```

### 11.2 Plataforma Recomendada

**Railway** para MVP:
- 1 serviço Next.js (web + workers)
- Redis nativo (~$15/mês)
- PostgreSQL via Supabase (externo)
- Deploy automático via GitHub

Custo estimado MVP (5 usuários): **~R$ 1.300/mês**

| Item | Custo/mês |
|---|---|
| Railway (app + Redis) | ~$55 |
| Supabase Pro | ~$25 |
| Twilio WhatsApp | ~$50 |
| Claude API (Sonnet) | ~$95 |
| **Total** | **~$225 / R$ 1.300** |

---

## 12. Convenções de Desenvolvimento

### 12.1 Regra de Ouro com Claude Code

Ao implementar qualquer módulo, referenciar explicitamente a SPEC e o SDD:

```
"Implemente o BriefingUseCase conforme SPEC RF-01 a RF-05 e SDD seção 8.2.
Não implemente nada fora desse escopo."
```

### 12.2 Nomenclatura

- Use Cases: `{Ação}{Entidade}UseCase` (ex: `SendBriefingUseCase`)
- Ports: `I{Recurso}Port` (ex: `IMemoryPort`)
- Adapters: `{Tecnologia}{Recurso}Adapter` (ex: `SupabaseMemoryAdapter`)
- Jobs: `{agentSlug}:{jobType}:{timestamp}` (ex: `wagner:briefing:morning`)

### 12.3 Testes

Cada Use Case deve ter testes unitários com mocks dos ports.  
Testes de integração apenas para adapters secundários (SICA, Supabase).  
Nenhum teste faz chamada real à Claude API — usar mocks.

---

## 13. Decisões de Arquitetura (ADRs)

**ADR-01:** Manter Next.js em vez de migrar para NestJS  
Razão: O AgentIA já está em produção em Next.js com arquitetura hexagonal madura. O BullMQ funciona em qualquer runtime Node.js. Migrar para NestJS seria reescrever sem ganho de funcionalidade no MVP.

**ADR-02:** Um processo Node.js com workers BullMQ embutidos  
Razão: Simplifica o deploy no MVP. Na Fase 3 (multi-agente com alto volume), separar em microserviços se necessário.

**ADR-03:** Claude Sonnet para o DIMAS (vs Haiku no agente financeiro atual)  
Razão: O DIMAS toma decisões de orquestração complexas (quando escalar, quando pedir confirmação, como delegar). Haiku é suficiente para consultas financeiras simples, mas insuficiente para raciocínio executivo.

**ADR-04:** Supabase como memória (vs InMemory atual)  
Razão: O InMemoryConversationRepository atual não persiste entre reinicializações. O DIMAS precisa de memória entre sessões e entre deployments.

**ADR-05:** Confirmação por keyword detection (vs confirmação formal)  
Razão: Fluxo mais natural no WhatsApp. A alternativa (botões de confirmação) não é suportada no plano básico do Twilio.
