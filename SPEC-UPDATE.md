# SPEC — DIMAS: Atualização v1.1

Versão: 1.1
Data: 2026-05-24
Status: Aprovado para desenvolvimento
Base: Análise comparativa entre agentia (GitHub) e Assistente IA (Lovable/Supabase)

---

## 1. Contexto

O agente DIMAS (agentia) está funcional para briefing diário e consultas básicas de
Aéreo/Terrestre. Esta atualização fecha os gaps identificados em relação ao Assistente IA
do painel Lovable, que opera via SQL direto no Supabase e expõe consultas mais ricas que
os usuários já utilizam no dia a dia.

Objetivo: tornar o DIMAS via WhatsApp equivalente — ou superior — ao Assistente IA do
painel, sem mudar a stack nem a arquitetura hexagonal existente.

---

## 2. Problemas Identificados

| ID    | Problema                                                                 | Impacto |
|-------|--------------------------------------------------------------------------|---------|
| P-01  | Prompt limita a 5 linhas — painel usa 20 linhas                          | Alto    |
| P-02  | Sem formatação WhatsApp (*negrito*, _itálico_)                           | Médio   |
| P-03  | Sem cálculo de variação percentual (hoje vs ontem)                       | Alto    |
| P-04  | Sem mensagem padrão de "sem resultado"                                   | Médio   |
| P-05  | Sem valores abreviados (R$ 1.2M, R$ 450K)                               | Médio   |
| P-06  | Sem média por bilhete no briefing/ontem                                  | Médio   |
| P-07  | Atalho "ajuda" não reconhecido — usuário fica perdido                    | Alto    |
| P-08  | Atalho "vendas" não reconhecido                                          | Alto    |
| P-09  | Atalho "ontem" não reconhecido                                           | Alto    |
| P-10  | Sem consulta de inadimplência (faturas vencidas)                         | Alto    |
| P-11  | Sem ranking de gestores                                                  | Médio   |
| P-12  | Sem ranking de promotores                                                | Médio   |
| P-13  | Sem pipeline de onboarding (etapas de cadastro)                          | Médio   |
| P-14  | Sem consulta de novas agências por dia (últimos 7 dias)                  | Médio   |
| P-15  | Sem exposição de crédito por base                                        | Alto    |
| P-16  | Sem agências em risco (limite alto, sem comprar)                         | Alto    |
| P-17  | Sem top companhias aéreas                                                | Baixo   |
| P-18  | Sem top agências por volume                                              | Baixo   |
| P-19  | Sem embarques futuros (próximos 7 dias)                                  | Médio   |
| P-20  | Sem proporção nacional vs internacional                                  | Baixo   |
| P-21  | Briefing sem saúde da base, crédito, inadimplência e pipeline            | Alto    |
| P-22  | Sem rate limiting (painel tem máx 100/dia)                               | Médio   |
| P-23  | Timeout de query em 12s — alinhar para 10s                               | Baixo   |
| P-24  | Histórico de conversa em 4 turnos — insuficiente para sessões complexas  | Médio   |

---

## 3. Requisitos Funcionais

### 3.1 Formatação e Comportamento Geral

**RF-01** O agente DEVE responder com até 20 linhas por padrão, podendo ir além quando o
       usuário pedir detalhes explicitamente.

**RF-02** O agente DEVE usar formatação WhatsApp: `*negrito*` para títulos e destaques,
       `_itálico_` para observações. Nunca usar `#`, `**`, `---`.

**RF-03** O agente DEVE incluir data e hora em toda resposta (formato `DD/MM/AAAA às HH:MM`,
       timezone America/Sao_Paulo).

**RF-04** O agente DEVE abreviar valores grandes: acima de R$ 1.000.000 → `R$ 1.2M`;
       acima de R$ 1.000 e abaixo de R$ 1.000.000 → `R$ 450K`. Abaixo disso, `R$ 1.234,56`.

**RF-05** O agente DEVE calcular e exibir variação percentual ao comparar períodos:
       positivo = `+X.X%`, negativo = `-X.X%`, igual = `–`. Nunca exibir `0%`.

**RF-06** Quando a consulta não retornar dados, o agente DEVE responder exatamente:
       `"Nenhum resultado encontrado para essa consulta."`

**RF-07** O agente DEVE calcular média por bilhete em qualquer consulta que retorne
       volume financeiro + contagem de bilhetes.

### 3.2 Atalhos de Consulta Rápida

**RF-08** Quando o usuário digitar "ajuda" (exato ou aproximado), o agente DEVE retornar
       a lista completa de comandos SEM executar nenhuma query.

**RF-09** Quando o usuário digitar "vendas", o agente DEVE buscar e apresentar:
       a) Hoje até agora (bilhetes, volume, agências, variação vs ontem)
       b) Ontem (bilhetes, volume, agências)
       c) Mês atual (bilhetes, volume, agências)
       As três consultas devem ser executadas em paralelo.

**RF-10** Quando o usuário digitar "ontem", o agente DEVE retornar vendas do dia anterior
       incluindo: bilhetes emitidos, agências que compraram, volume total e média por bilhete.

**RF-11** Quando o usuário digitar "saúde", o agente DEVE retornar por base:
       quantidade de agências ativas, quantas venderam nos últimos 30 dias, e percentual
       de saúde. Ordenado do pior para melhor.

**RF-12** Quando o usuário digitar "inadimplência", o agente DEVE retornar:
       total de faturas vencidas (NOT pago AND data_vencimento < hoje), valor total em
       atraso, e top 20 agências devedoras com valor individual.

**RF-13** Quando o usuário digitar "gestores", o agente DEVE retornar ranking de gestores
       por volume no mês atual: agências gerenciadas, bilhetes emitidos, volume total,
       inadimplência por gestor.

**RF-14** Quando o usuário digitar "promotores", o agente DEVE retornar ranking de
       promotores por volume no mês atual: agências, bilhetes, volume.

**RF-15** Quando o usuário digitar "pipeline", o agente DEVE retornar status do onboarding:
       quantidade por etapa (pré-cadastro, em análise, complementar, parecer, contrato),
       aprovados e reprovados no mês.

**RF-16** Quando o usuário digitar "novas", o agente DEVE retornar cadastros dos últimos
       7 dias agrupados por dia, com total.

**RF-17** Quando o usuário digitar "crédito", o agente DEVE retornar exposição de crédito
       por base: nº de agências, limite total aprovado e crédito utilizado.

**RF-18** Quando o usuário digitar "risco", o agente DEVE retornar agências com limite
       aprovado > 0 e sem compra recente (ultima_compra nula ou anterior a 90 dias).
       Formato: nome, base, limite, data da última compra.

**RF-19** Quando o usuário digitar "cias", o agente DEVE retornar top 10 companhias aéreas
       do mês corrente por volume, com sigla, nome, bilhetes e R$.

**RF-20** Quando o usuário digitar "top agências", o agente DEVE retornar top 10 agências
       do mês corrente por volume.

**RF-21** Quando o usuário digitar "embarques", o agente DEVE retornar embarques dos
       próximos 7 dias: data, agência, cia aérea, localizador, valor.

**RF-22** Quando o usuário digitar "nacional vs internacional" (ou variações), o agente
       DEVE retornar proporção de bilhetes e volume por tipo de rota (DOM/INT) no mês.

**RF-23** Quando o usuário digitar "resumo", o agente DEVE retornar o dashboard completo
       do dia combinando: saúde geral, vendas hoje/mês, pipeline, crédito e inadimplência.

### 3.3 Briefing Diário Enriquecido

**RF-24** O briefing automático DEVE incluir, além do que já existe:
       a) Saúde geral: % de agências vendendo nos últimos 30 dias
       b) Pipeline: cadastros em análise + novas solicitações ontem
       c) Exposição de crédito total
       d) Faturas em atraso: quantidade e valor total
       e) Variação percentual do dia vs dia anterior para Aéreo e Terrestre

**RF-25** O briefing DEVE identificar o dia da semana por extenso na saudação.
       Ex: "Bom dia Sr. Wagner. Aqui está o panorama de segunda-feira, 26/05/2026."

### 3.4 Rate Limiting e Segurança

**RF-26** O sistema DEVE limitar a 100 consultas IA por número de telefone por dia (UTC).
       Ao atingir o limite, responder: "Limite diário de consultas atingido. Retorne amanhã."

**RF-27** O timeout de todas as chamadas à API Sakura DEVE ser de 10 segundos (atualmente 12s).

### 3.5 Histórico de Conversa

**RF-28** O `MAX_HISTORY_TURNS` DEVE ser aumentado de 4 para 8 turnos para suportar
       sessões de análise mais longas (múltiplas perguntas encadeadas sobre o mesmo tema).

---

## 4. Requisitos Não-Funcionais

**RNF-01** Nenhuma query deve expor SQL nas respostas ao usuário.

**RNF-02** Todas as consultas dos atalhos DEVEM ser executadas em paralelo (`Promise.allSettled`).

**RNF-03** Falha em uma fonte não pode travar o atalho completo — resultado parcial com aviso.

**RNF-04** Nenhum atalho deve alterar dados (apenas leitura).

**RNF-05** Valores de crédito e inadimplência NUNCA devem vir de cache — sempre tempo real.

---

## 5. Fora de Escopo desta Atualização

- Migração de InMemory para Supabase (mantém InMemory)
- BullMQ / Redis (mantém node-cron)
- Multi-agente
- Doc4Sign
- Novos endpoints na API Sakura (as tools novas usam `query_sica_table`/`query_sigot_table`)

---

## 6. Critérios de Aceite

| ID    | Critério                                                                        |
|-------|---------------------------------------------------------------------------------|
| CA-01 | Wagner digita "ajuda" e recebe lista de comandos sem nenhuma query executada    |
| CA-02 | Wagner digita "vendas" e recebe hoje/ontem/mês em menos de 10s                 |
| CA-03 | Wagner digita "inadimplência" e recebe total + top 20 devedores                |
| CA-04 | Wagner digita "risco" e recebe agências com limite alto sem comprar             |
| CA-05 | Briefing automático inclui saúde %, pipeline e inadimplência                   |
| CA-06 | Resposta com variação positiva mostra "+12.3%", negativa "-5.1%", zero "–"     |
| CA-07 | Valor de R$ 1.234.567,89 aparece como "R$ 1.2M"                                |
| CA-08 | Após 100 consultas no dia, o agente informa limite atingido                    |
| CA-09 | Consulta sem dados retorna exatamente "Nenhum resultado encontrado..."         |

---

## 7. Roadmap de Implementação

| Fase    | Escopo                                               | Prazo estimado |
|---------|------------------------------------------------------|----------------|
| v1.1-A  | Prompt: formatação, variação %, valores, ajuda       | 1 dia          |
| v1.1-B  | Atalhos usando tools existentes (vendas, ontem)      | 2 dias         |
| v1.1-C  | Tools novas (inadimplência, gestores, pipeline...)   | 3 dias         |
| v1.1-D  | Briefing enriquecido + rate limiting                 | 2 dias         |
