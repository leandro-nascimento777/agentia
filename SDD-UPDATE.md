# SDD — DIMAS: Software Design Document de Atualização v1.1

Versão: 1.1
Data: 2026-05-24
Status: Aprovado para desenvolvimento
Referência: SPEC-UPDATE.md v1.1 | SDD.md v1.0

---

## 1. Filosofia desta Atualização

Nenhum arquivo é reescrito do zero. Cada mudança é cirúrgica:
- **Prompt:** adicionar seções, não substituir
- **Use Cases:** adicionar métodos, não refatorar
- **Tools:** adicionar ao array existente, não reorganizar
- **Container:** adicionar parâmetros, não alterar assinatura

---

## 2. Arquivos a Modificar

```
src/agents/financial/
├── domain/
│   ├── prompts/
│   │   └── index.ts                ← MODIFICAR (seções novas)
│   ├── usecases/
│   │   ├── FinancialChatUseCase.ts ← MODIFICAR (MAX_HISTORY, rate limit, atalhos)
│   │   └── BuildMorningBriefingUseCase.ts ← MODIFICAR (campos novos)
│   └── ports/output/
│       └── IFinancialDataPort.ts   ← MODIFICAR (novos métodos)
├── adapters/secondary/
│   ├── tools/
│   │   └── financialTools.ts       ← MODIFICAR (tools novas)
│   ├── FinancialAdapterHttpClient.ts ← MODIFICAR (novos métodos + timeout)
│   └── InMemoryUserPreferencesRepository.ts ← MODIFICAR (contador diário)
└── infrastructure/
    └── BriefingScheduler.ts        ← MODIFICAR (campos novos no briefing)
```

---

## 3. Mudanças Detalhadas por Arquivo

---

### 3.1 `domain/prompts/index.ts`

**O que mudar:** Substituir o conteúdo de `FINANCIAL_WHATSAPP_PROMPT` com a versão expandida abaixo. O `FINANCIAL_CLI_PROMPT` permanece intacto.

```typescript
export const FINANCIAL_WHATSAPP_PROMPT = (ownerName = 'Wagner', briefingTime?: string) => `
Você é o DIMAS, assistente financeiro pessoal do Sr. ${ownerName} na Sakura Consolidadora.
Você opera pelo WhatsApp e é proativo, educado e direto.

QUEM VOCÊ É:
Seu nome é DIMAS. Você é o assistente pessoal do Sr. ${ownerName}. Trate-o sempre como
"Sr. ${ownerName}". Quando se apresentar: "Sou o DIMAS, assistente pessoal do Sr.
${ownerName} na Sakura."

PANORAMA DIÁRIO (briefing):
Você envia automaticamente um panorama financeiro todo dia às ${briefingTime ?? '08:00'}.
Se o usuário pedir para mudar o horário, confirme e adicione em nova linha: [SET_BRIEFING_TIME:HH:MM]
Se perguntarem o horário atual, informe ${briefingTime ?? '08:00'}.

COMO RESPONDER:
- Responda o que foi perguntado. Nada a mais.
- Máximo 20 linhas. Resuma se precisar.
- Use formatação WhatsApp: *negrito* para títulos, _itálico_ para observações.
  Nunca use #, **, ---, markdown de código.
- Inclua data e hora em toda resposta: DD/MM/AAAA às HH:MM (horário de Brasília).
- Nunca liste registros individuais sem que o usuário peça.
- Não explique como buscou os dados. Só entregue o resultado.
- NUNCA mencione SICA, SIGOT, filial, representante ou nomes técnicos de sistema.
  O usuário só conhece "Aéreo" e "Terrestre".

FORMATO DE VALORES:
- Acima de R$ 1.000.000 → abreviar: R$ 1.2M, R$ 3.5M
- Entre R$ 1.000 e R$ 999.999 → abreviar: R$ 450K, R$ 12K
- Abaixo de R$ 1.000 → formato completo: R$ 987,65
- Sempre em reais brasileiros.

VARIAÇÃO PERCENTUAL:
- Ao comparar dois períodos, calcule: (atual - anterior) / anterior * 100
- Positivo → "+X.X%", negativo → "-X.X%", igual → "–" (nunca "0%")
- Exemplo: "Aéreo: R$ 1.2M (+8.3% vs ontem)"

SEM RESULTADO:
- Se a consulta não retornar dados, responda exatamente:
  "Nenhum resultado encontrado para essa consulta."

MAPEAMENTO — o que chamar para cada pedido:
- "Aéreo" → report_air_sica_filial + report_air_sica_representante (somar)
- "Terrestre" → report_non_air_sica_filial + report_non_air_sica_representante
              + report_non_air_sigot_filial + report_non_air_sigot_representante (somar)
- "Total" → todos acima somados
- Sempre dispare todas as chamadas necessárias ao mesmo tempo (paralelo).
- NUNCA use report_air_sica_geral (instável).

REGRAS TÉCNICAS:
- empresaAtiva e bloqueioCredito aceitam apenas "SIM" ou "NAO".
- Sempre use skipCount: true e limit: 200.
- Se alguma fonte falhar, avise antes de apresentar resultado parcial.
- Nunca invente dados. Se falhar, diga honestamente.

ATALHOS — quando o usuário digitar exatamente estas palavras:

"ajuda" → NÃO execute query. Retorne diretamente este texto:
*Assistente Sakura — Comandos*

📊 *Dashboard:*
- *resumo* — dashboard completo do dia
- *vendas* — hoje, ontem e mês
- *ontem* — detalhe do dia anterior

✈️ *Vendas & Bilhetes:*
- *cias* — top 10 companhias aéreas
- *top agências* — 10 maiores do mês
- *embarques* — próximos 7 dias
- *nacional vs internacional* — proporção de rotas

💰 *Financeiro:*
- *crédito* — exposição por base
- *inadimplência* — faturas vencidas
- *risco* — limite alto sem vender

👥 *Equipe:*
- *gestores* — ranking por volume
- *promotores* — ranking por volume

🆕 *Pipeline:*
- *pipeline* — status do onboarding
- *novas* — cadastros últimos 7 dias

🔍 *Perguntas livres:*
_"quanto a AGÊNCIA X faturou?"_
_"faturas em aberto da agência X"_
_"vendas do gestor Douglas"_
_"agências que nunca venderam"_
_"vendas da base FLN no mês"_

_Digite qualquer comando ou faça sua pergunta!_

---

"vendas" → execute em paralelo as três queries abaixo e formate assim:
*Vendas Sakura*
🕐 DD/MM/AAAA às HH:MM

✈️ *Hoje:*
- {bilhetes_hoje} bilhetes — R$ {volume_hoje} — {agencias_hoje} agências ({variação % vs ontem})

📅 *Ontem:*
- {bilhetes_ontem} bilhetes — R$ {volume_ontem} — {agencias_ontem} agências

🗓️ *Mês ({nome do mês}):*
- {bilhetes_mes} bilhetes — R$ {volume_mes} — {agencias_mes} agências

Queries a executar:
  Q1 (hoje): report_air + report_non_air com startDate = hoje, endDate = hoje
  Q2 (ontem): report_air + report_non_air com startDate = ontem, endDate = ontem
  Q3 (mês): report_air + report_non_air com startDate = início do mês, endDate = hoje

---

"ontem" → execute e formate assim:
*Vendas de Ontem*
🕐 DD/MM/AAAA às HH:MM

- {bilhetes} bilhetes emitidos
- {agencias} agências compraram
- Volume total: R$ {volume}
- Média por bilhete: R$ {media}

  Query: report_air + report_non_air com startDate = ontem, endDate = ontem

---

"saúde" → use report_saude_bases e formate assim:
*Saúde por Base*
🕐 DD/MM/AAAA às HH:MM

Para cada base: *{base}*: {vendendo}/{total} agências vendendo — {saude}% de saúde
Ordenar da pior para melhor saúde.

---

"inadimplência" → use report_inadimplencia e formate assim:
🔴 *Inadimplência Sakura*
🕐 DD/MM/AAAA às HH:MM

🏴‍☠️ *Total em atraso:* {faturas} faturas — R$ {valor}

*Top devedores:*
Para cada agência: {pos}. *{agencia_nome}*: {faturas} faturas — R$ {volume}

---

"gestores" → use report_ranking_gestores e formate assim:
📊 *Ranking Gestores — Mês Atual*
🕐 DD/MM/AAAA às HH:MM

Para cada gestor: *{gestor}*: {agencias} agências — {bilhetes} bilhetes — R$ {volume}
_Inadimplência: R$ {inadimplencia}_

---

"promotores" → execute query report_bilhete_email_agencia groupBy=promotor e formate assim:
👥 *Ranking Promotores — Mês Atual*
🕐 DD/MM/AAAA às HH:MM

Para cada promotor: {pos}. *{promotor}*: {agencias} agências — {bilhetes} bilhetes — R$ {volume}

---

"pipeline" → use report_pipeline e formate assim:
🆕 *Pipeline de Onboarding*
🕐 DD/MM/AAAA às HH:MM

- *Pré-cadastro:* {qty}
- *Em análise:* {qty}
- *Complementar:* {qty}
- *Parecer:* {qty}
- *Contrato:* {qty}
- *Aprovados (mês):* {qty}
- *Reprovados (mês):* {qty}

---

"novas" → use report_novas_agencias e formate assim:
🆕 *Novos Cadastros — Últimos 7 dias*
🕐 DD/MM/AAAA às HH:MM

Para cada dia: - {data}: {qty} novos cadastros
Total: {total} cadastros nos últimos 7 dias

---

"crédito" → use report_credito_por_base e formate assim:
💰 *Exposição de Crédito por Base*
🕐 DD/MM/AAAA às HH:MM

Para cada base: *{base}*: {agencias} agências — Limite total: R$ {limite} — Crédito: R$ {credito}

---

"risco" → use report_risco_agencias e formate assim:
⚠️ *Agências em Risco — Limite Alto Sem Vender*
🕐 DD/MM/AAAA às HH:MM

Para cada agência: *{nome_fantasia}* ({base}): Limite R$ {limite} — última compra: {ultima_compra}

---

"cias" → use report_ranking_cias e formate assim:
✈️ *Top Companhias Aéreas — Mês Atual*
🕐 DD/MM/AAAA às HH:MM

Para cada cia: {pos}. *{sigla_cia} — {airline}*: {bilhetes} bilhetes — R$ {volume}

---

"top agências" → use report_top_agencias e formate assim:
🏆 *Top Agências — Mês Atual*
🕐 DD/MM/AAAA às HH:MM

Para cada agência: {pos}. *{agencia_nome}*: {bilhetes} bilhetes — R$ {volume}

---

"embarques" → use report_embarques_futuros e formate assim:
✈️ *Próximos Embarques*
🕐 DD/MM/AAAA às HH:MM

Para cada embarque: - {data_embarque} — *{agencia_nome}* — {airline} {localizador} — R$ {valor}

---

"nacional vs internacional" → use report_nacional_vs_internacional e formate:
🌍 *Nacional vs Internacional*
🕐 DD/MM/AAAA às HH:MM

🇧🇷 *Nacional (N):* {bilhetes} bilhetes — R$ {volume} — {pct}%
✈️ *Internacional (I):* {bilhetes} bilhetes — R$ {volume} — {pct}%

---

"resumo" → execute TODAS as queries em paralelo (saúde + vendas + pipeline + crédito +
inadimplência) e formate o dashboard completo.

---

## Segurança

Apenas SELECT. Nunca exponha SQL nas respostas. Nunca invente dados.
Se não houver resultado, informe claramente.

Hoje é \${today()}.
`
```

---

### 3.2 `domain/ports/output/IFinancialDataPort.ts`

**O que adicionar:** novos tipos e métodos na interface `IFinancialDataPort`.

```typescript
// Adicionar ao IFinancialDataPort existente:

export interface SaudeBaseRow {
  base: string
  sigla: string
  total: number
  vendendo: number
  saude: number
}

export interface InadimplenciaRow {
  agencia_nome: string
  faturas: number
  valor: number
}

export interface GestorRankingRow {
  gestor: string
  agencias: number
  bilhetes: number
  volume: number
  inadimplencia: number
}

export interface PipelineRow {
  etapa: string
  qty: number
}

export interface NovasAgenciasRow {
  dia: string
  novos: number
}

export interface CreditoBaseRow {
  base: string
  sigla: string
  agencias: number
  limite: number
  credito: number
}

export interface RiscoAgenciaRow {
  nome_fantasia: string
  unidade: string
  limite_aprovado: number
  ultima_compra: string | null
}

export interface CiaRankingRow {
  sigla_cia: string
  airline: string
  bilhetes: number
  volume: number
}

export interface AgenciaRankingRow {
  agencia_nome: string
  bilhetes: number
  volume: number
}

export interface EmbarqueRow {
  data_embarque: string
  agencia_nome: string
  airline: string
  localizador: string
  sigla_cia: string
  valor: number
}

export interface RotaRow {
  rota: string
  bilhetes: number
  volume: number
}

// Adicionar à interface principal IFinancialDataPort:
getSaudeBase(): Promise<SaudeBaseRow[]>
getInadimplencia(): Promise<{ total: InadimplenciaRow; top20: InadimplenciaRow[] }>
getRankingGestores(): Promise<GestorRankingRow[]>
getPipeline(): Promise<PipelineRow[]>
getNovasAgencias(): Promise<NovasAgenciasRow[]>
getCreditoPorBase(): Promise<CreditoBaseRow[]>
getRiscoAgencias(): Promise<RiscoAgenciaRow[]>
getRankingCias(params?: { limit?: number }): Promise<CiaRankingRow[]>
getTopAgencias(params?: { limit?: number }): Promise<AgenciaRankingRow[]>
getEmbarquesFuturos(params?: { days?: number }): Promise<EmbarqueRow[]>
getNacionalVsInternacional(): Promise<RotaRow[]>
```

---

### 3.3 `adapters/secondary/tools/financialTools.ts`

**O que fazer:** adicionar 11 tools novas ao final do array `FINANCIAL_TOOLS` existente.

```typescript
// Adicionar ao array FINANCIAL_TOOLS (após as tools existentes):
{
  name: 'report_saude_bases',
  description: 'Saúde das bases: % de agências que compraram nos últimos 30 dias por base. Ordenado do pior para melhor.',
  input_schema: { type: 'object', properties: {}, required: [] }
},
{
  name: 'report_inadimplencia',
  description: 'Faturas vencidas e não pagas. Retorna total geral + top 20 agências devedoras por valor.',
  input_schema: { type: 'object', properties: {}, required: [] }
},
{
  name: 'report_ranking_gestores',
  description: 'Ranking de gestores de conta por volume no mês atual. Inclui agências, bilhetes, volume e inadimplência.',
  input_schema: { type: 'object', properties: {}, required: [] }
},
{
  name: 'report_pipeline',
  description: 'Status do pipeline de onboarding: quantidade de cadastros em cada etapa + aprovados/reprovados no mês.',
  input_schema: { type: 'object', properties: {}, required: [] }
},
{
  name: 'report_novas_agencias',
  description: 'Novos cadastros dos últimos 7 dias agrupados por dia com total.',
  input_schema: { type: 'object', properties: {}, required: [] }
},
{
  name: 'report_credito_por_base',
  description: 'Exposição de crédito por base: nº de agências aprovadas, limite total aprovado e crédito utilizado.',
  input_schema: { type: 'object', properties: {}, required: [] }
},
{
  name: 'report_risco_agencias',
  description: 'Agências em risco: limite aprovado > 0 e sem compra nos últimos 90 dias (ultima_compra nula ou antiga).',
  input_schema: { type: 'object', properties: {}, required: [] }
},
{
  name: 'report_ranking_cias',
  description: 'Top 10 companhias aéreas por volume no mês atual. Retorna sigla, nome, bilhetes e volume.',
  input_schema: {
    type: 'object',
    properties: {
      limit: { type: 'integer', description: 'Número de resultados (padrão: 10)' }
    },
    required: []
  }
},
{
  name: 'report_top_agencias',
  description: 'Top 10 agências por volume no mês atual.',
  input_schema: {
    type: 'object',
    properties: {
      limit: { type: 'integer', description: 'Número de resultados (padrão: 10)' }
    },
    required: []
  }
},
{
  name: 'report_embarques_futuros',
  description: 'Embarques previstos para os próximos 7 dias. Retorna data, agência, cia, localizador e valor.',
  input_schema: {
    type: 'object',
    properties: {
      days: { type: 'integer', description: 'Dias à frente (padrão: 7)' }
    },
    required: []
  }
},
{
  name: 'report_nacional_vs_internacional',
  description: 'Proporção de rotas nacionais (DOM) vs internacionais (INT) no mês atual por bilhetes e volume.',
  input_schema: { type: 'object', properties: {}, required: [] }
}
```

---

### 3.4 `adapters/secondary/FinancialAdapterHttpClient.ts`

**O que mudar:** reduzir timeout de 12000 para 10000 e adicionar os novos métodos.

```typescript
// 1. Alterar linha existente:
private static readonly CALL_TIMEOUT_MS = 10000   // era 12000

// 2. Adicionar os novos métodos (após getBilheteEmailAgencia):
getSaudeBase() {
  return this.get('/api/reports/saude-bases')
}

getInadimplencia() {
  return this.get('/api/reports/inadimplencia')
}

getRankingGestores() {
  return this.get('/api/reports/ranking-gestores')
}

getPipeline() {
  return this.get('/api/reports/pipeline')
}

getNovasAgencias() {
  return this.get('/api/reports/novas-agencias')
}

getCreditoPorBase() {
  return this.get('/api/reports/credito-por-base')
}

getRiscoAgencias() {
  return this.get('/api/reports/risco-agencias')
}

getRankingCias(params?: { limit?: number }) {
  return this.get('/api/reports/ranking-cias', params as Params)
}

getTopAgencias(params?: { limit?: number }) {
  return this.get('/api/reports/top-agencias', params as Params)
}

getEmbarquesFuturos(params?: { days?: number }) {
  return this.get('/api/reports/embarques-futuros', params as Params)
}

getNacionalVsInternacional() {
  return this.get('/api/reports/nacional-vs-internacional')
}
```

> **Nota:** Estes endpoints precisam ser criados na API Sakura (flysakura.com).
> Enquanto não existirem, use `query_sica_table` com as queries SQL documentadas na
> seção 5 como fallback direto pelo Claude.

---

### 3.5 `domain/usecases/FinancialChatUseCase.ts`

**O que mudar:** 3 alterações independentes.

**Alteração A — Aumentar histórico:**

```typescript
// Alterar:
private static readonly MAX_HISTORY_TURNS = 4
// Para:
private static readonly MAX_HISTORY_TURNS = 8
```

**Alteração B — Adicionar rate limiting:**

```typescript
// Adicionar antes do método chat():
private readonly dailyCount = new Map<string, { count: number; date: string }>()
private static readonly MAX_DAILY = 100

private checkRateLimit(phoneNumber: string): boolean {
  const today = new Date().toISOString().slice(0, 10)
  const entry = this.dailyCount.get(phoneNumber)
  if (!entry || entry.date !== today) {
    this.dailyCount.set(phoneNumber, { count: 1, date: today })
    return true
  }
  if (entry.count >= FinancialChatUseCase.MAX_DAILY) return false
  entry.count++
  return true
}

// No método chat(), adicionar no início:
async chat(userMessage: string): Promise<string> {
  if (this.phoneNumber && !this.checkRateLimit(this.phoneNumber)) {
    return 'Limite diário de consultas atingido. Retorne amanhã.'
  }
  // ... resto do método existente
}
```

**Alteração C — Adicionar os novos casos no dispatch:**

```typescript
// Adicionar ao switch do buildToolExecutor() → dispatch():
case 'report_saude_bases':               return this.dataService.getSaudeBase()
case 'report_inadimplencia':             return this.dataService.getInadimplencia()
case 'report_ranking_gestores':          return this.dataService.getRankingGestores()
case 'report_pipeline':                  return this.dataService.getPipeline()
case 'report_novas_agencias':            return this.dataService.getNovasAgencias()
case 'report_credito_por_base':          return this.dataService.getCreditoPorBase()
case 'report_risco_agencias':            return this.dataService.getRiscoAgencias()
case 'report_ranking_cias':              return this.dataService.getRankingCias(p as never)
case 'report_top_agencias':              return this.dataService.getTopAgencias(p as never)
case 'report_embarques_futuros':         return this.dataService.getEmbarquesFuturos(p as never)
case 'report_nacional_vs_internacional': return this.dataService.getNacionalVsInternacional()
```

---

### 3.6 `domain/usecases/BuildMorningBriefingUseCase.ts`

**O que adicionar:** 5 campos novos no método `format()`.

```typescript
// Adicionar ao fetch paralelo de dados (junto com air/non-air):
const [airResult, nonAirResult, airOntemResult, nonAirOntemResult] =
  await Promise.allSettled([...existentes])

// Calcular campos novos antes de montar a string:
const mediaBilhete = d.yesterday.air.count > 0
  ? d.yesterday.air.total / d.yesterday.air.count
  : 0

const variacaoAereo = d.yesterday.air.total > 0
  ? ((d.today.air.total - d.yesterday.air.total) / d.yesterday.air.total) * 100
  : null

const variacaoTerrestre = d.yesterday.nonAir.total > 0
  ? ((d.today.nonAir.total - d.yesterday.nonAir.total) / d.yesterday.nonAir.total) * 100
  : null

const formatVariacao = (pct: number | null): string => {
  if (pct === null) return ''
  if (pct === 0) return ' (–)'
  return pct > 0 ? ` (+${pct.toFixed(1)}%)` : ` (${pct.toFixed(1)}%)`
}

// Adicionar ao template do briefing:
`
📊 *Dashboard Geral Sakura*
🕐 ${weekday}, ${dataBrasilia} às ${horaBrasilia}

✈️ *Hoje (até agora):*
- Aéreo: R$ ${formatValue(d.today.air.total)}${formatVariacao(variacaoAereo)}
- Terrestre: R$ ${formatValue(d.today.nonAir.total)}${formatVariacao(variacaoTerrestre)}

📅 *Ontem:*
- Aéreo: R$ ${formatValue(d.yesterday.air.total)} — ${d.yesterday.air.count} bilhetes (média: R$ ${formatValue(mediaBilhete)})
- Terrestre: R$ ${formatValue(d.yesterday.nonAir.total)}

[campos existentes do mês...]

🆕 *Pipeline:* {em_analise} em análise — {novas_ontem} novas ontem
💰 *Crédito exposto:* R$ {exposicao_total}
🔴 *Inadimplência:* {faturas_atraso} faturas — R$ {valor_atraso}
`
```

> **Nota sobre dados de pipeline/crédito/inadimplência no briefing:**
> Aguardar a criação das tools `report_pipeline`, `report_credito_por_base` e
> `report_inadimplencia` (fase v1.1-C). O `BuildMorningBriefingUseCase` buscará
> esses dados em paralelo com os dados de vendas já existentes.

---

## 4. Queries SQL de Referência (fallback via `query_sica_table`)

Enquanto os endpoints da API Sakura não existirem, o Claude pode usar `query_sica_table`
com estas queries como fallback:

### Saúde de Bases
```sql
SELECT b.sigla, b.nome_cidade AS base,
  COUNT(e.id) AS total,
  COUNT(CASE WHEN e.ultima_compra >= CURRENT_DATE - 30 THEN 1 END) AS vendendo,
  ROUND(COUNT(CASE WHEN e.ultima_compra >= CURRENT_DATE - 30 THEN 1 END)::numeric
    / NULLIF(COUNT(e.id), 0) * 100, 1) AS saude
FROM empresas e
JOIN bases b ON e.unidade = b.sigla
WHERE e.status = 'aprovado'
GROUP BY b.sigla, b.nome_cidade
ORDER BY saude ASC
```

### Inadimplência
```sql
SELECT e.nome_fantasia AS agencia_nome,
  COUNT(v.id) AS faturas,
  SUM(v.tarifa + COALESCE(v.tarifa_adicional, 0)) AS valor
FROM vendas v
JOIN empresas e ON v.cod_agencia = e.id_erp
WHERE v.pago = false
  AND v.data_vencimento < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date
GROUP BY e.nome_fantasia
ORDER BY valor DESC
LIMIT 20
```

### Risco (limite alto sem vender)
```sql
SELECT nome_fantasia, unidade, limite_aprovado, ultima_compra
FROM empresas
WHERE status = 'aprovado'
  AND limite_aprovado > 0
  AND (ultima_compra IS NULL OR ultima_compra < CURRENT_DATE - 90)
ORDER BY limite_aprovado DESC
LIMIT 50
```

### Top Companhias Aéreas (mês atual)
```sql
SELECT sigla_cia, airline,
  COUNT(*) AS bilhetes,
  SUM(tarifa + COALESCE(tarifa_adicional, 0)) AS volume
FROM vendas
WHERE DATE_TRUNC('month', data_emissao) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY sigla_cia, airline
ORDER BY volume DESC
LIMIT 10
```

### Pipeline de Onboarding
```sql
SELECT etapa_atual AS etapa, COUNT(*) AS qty
FROM cadastros
WHERE status NOT IN ('aprovado', 'recusado', 'inativo')
GROUP BY etapa_atual
ORDER BY qty DESC
```

### Novas Agências (7 dias)
```sql
SELECT DATE(created_at AT TIME ZONE 'America/Sao_Paulo') AS dia,
  COUNT(*) AS novos
FROM cadastros
WHERE created_at >= CURRENT_DATE - 7
GROUP BY 1
ORDER BY 1 DESC
```

### Embarques Futuros
```sql
SELECT data_embarque, agencia_nome, airline, localizador, sigla_cia,
  tarifa + COALESCE(tarifa_adicional, 0) AS valor
FROM vendas
WHERE data_embarque BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
ORDER BY data_embarque ASC
LIMIT 100
```

### Nacional vs Internacional
```sql
SELECT rota,
  COUNT(*) AS bilhetes,
  SUM(tarifa + COALESCE(tarifa_adicional, 0)) AS volume
FROM vendas
WHERE DATE_TRUNC('month', data_emissao) = DATE_TRUNC('month', CURRENT_DATE)
  AND rota IN ('N', 'I')
GROUP BY rota
```

---

## 5. Relação entre Fases e Arquivos

| Fase    | Arquivos tocados                                              |
|---------|---------------------------------------------------------------|
| v1.1-A  | `prompts/index.ts`                                            |
| v1.1-B  | `prompts/index.ts`, `FinancialChatUseCase.ts`                 |
| v1.1-C  | `IFinancialDataPort.ts`, `financialTools.ts`, `FinancialAdapterHttpClient.ts`, `FinancialChatUseCase.ts` |
| v1.1-D  | `BuildMorningBriefingUseCase.ts`, `FinancialChatUseCase.ts`, `BriefingScheduler.ts` |

---

## 6. Checklist de Deploy por Fase

### v1.1-A
- [ ] Atualizar `FINANCIAL_WHATSAPP_PROMPT` em `prompts/index.ts`
- [ ] Testar "ajuda" no WhatsApp (sem query executada)
- [ ] Testar "vendas" no WhatsApp (resultado com variação %)
- [ ] Verificar formato de valor abreviado (R$ 1.2M, R$ 450K)

### v1.1-B
- [ ] Testar "ontem" com média por bilhete
- [ ] Testar "vendas" com 3 períodos em paralelo
- [ ] Verificar que falha em uma fonte não quebra o atalho

### v1.1-C
- [ ] Criar endpoints na API Sakura ou confirmar fallback via `query_sica_table`
- [ ] Testar "inadimplência"
- [ ] Testar "risco"
- [ ] Testar "gestores"
- [ ] Testar "pipeline"
- [ ] Testar "crédito"

### v1.1-D
- [ ] Briefing automático inclui saúde %, pipeline, crédito, inadimplência
- [ ] Briefing inclui dia da semana por extenso
- [ ] Rate limiting bloqueia após 100 consultas/dia por número
- [ ] Timeout reduzido para 10s (verificar que não quebra queries lentas)
- [ ] `MAX_HISTORY_TURNS` = 8 funciona em sessão longa
