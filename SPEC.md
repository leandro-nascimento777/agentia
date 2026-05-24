# SPEC — DIMAS: Assistente Executivo da Sakura
**Versão:** 1.0  
**Data:** 2026-05-24  
**Status:** Aprovado para desenvolvimento  

---

## 1. Visão do Produto

DIMAS é um assistente executivo corporativo B2B que opera dentro do WhatsApp. Ele está integrado aos sistemas internos da Sakura Consolidadora (SICA, SIGOT, Doc4Sign, agenda) e age proativamente — entregando briefings, executando ações quando autorizado e escalando alertas no momento certo.

**Proposta de valor central:** Devolver tempo de CEO. O executivo para de operar e começa a decidir.

---

## 2. Usuários

| Persona | Descrição | Canal |
|---|---|---|
| Wagner (CEO) | Usuário principal do DIMAS executivo | WhatsApp |
| Newton (Comercial) | Terá seu próprio DIMAS na Fase 3 | WhatsApp |
| Cássio (Financeiro) | Terá seu próprio DIMAS na Fase 3 | WhatsApp |
| Donos de agências | Usuários do produto DIMAS Agência (Fase 4) | WhatsApp |

---

## 3. Módulos e Requisitos Funcionais

### 3.1 Briefing Executivo (Proativo)

**Descrição:** O DIMAS envia resumos executivos em horários configurados sem ser solicitado.

**RF-01** O sistema deve disparar briefings automáticos em até 3 horários por dia configuráveis por usuário.  
**RF-02** O briefing deve conter: volume de vendas (Aéreo + Não-aéreo), comparativo com período anterior, novas agências cadastradas, contratos pendentes de assinatura, alertas ativos e agenda do dia.  
**RF-03** O DIMAS deve detectar a primeira mensagem do usuário no dia e oferecer o briefing sob demanda caso o horário configurado ainda não tenha passado.  
**RF-04** O usuário deve poder confirmar ou recusar o briefing respondendo "sim" ou "não".  
**RF-05** O briefing deve ser formatado para leitura no WhatsApp: sem markdown (sem `*`, `**`, `#`, `---`), texto corrido, máximo 20 linhas.

**Exemplo de output:**
```
Bom dia Sr. Wagner.

Ontem:
Aéreo: R$ 847.000 (+12% vs mesmo dia ano passado)
Não-aéreo: R$ 203.000 (-3% vs mesmo dia ano passado)
Mês atual: R$ 14,2M (82% da meta)

Novidades:
3 novas agências cadastradas
2 contratos aguardam assinatura
Agência TOP Viagens entrou na lista Sofia (R$ 23k em aberto)

Agenda hoje:
10h - Reunião Newton
14h - Call Fornecedor GDS

Você tem evento em Florianópolis dia 29. Não identifiquei passagem comprada. Coto aéreo e hotel?
```

---

### 3.2 Consulta Inteligente de Agências

**RF-06** O DIMAS deve responder perguntas sobre agências usando dados do SICA em tempo real.  
**RF-07** A resposta deve incluir: Razão Social, CNPJ, faturamento histórico (3/6/12 meses), limite de crédito (total e utilizado), gerente executivo responsável, alertas ativos.  
**RF-08** Dados financeiros sensíveis (crédito, inadimplência) devem ser buscados frescos a cada requisição — nunca servidos de cache.  
**RF-09** O DIMAS não deve mencionar nomes de sistemas internos (SICA, SIGOT) nas respostas para o usuário.

---

### 3.3 Assinatura de Contratos via WhatsApp

**RF-10** O DIMAS deve detectar contratos pendentes de assinatura para o usuário logado.  
**RF-11** O DIMAS deve apresentar o contrato pendente de forma proativa no briefing ou quando consultado.  
**RF-12** O usuário deve poder autorizar a assinatura respondendo ao DIMAS no WhatsApp.  
**RF-13** Após autorização, o DIMAS deve acionar a API do Doc4Sign para gerar o link/fluxo de assinatura e entregá-lo ao usuário no WhatsApp.  
**RF-14** O DIMAS deve confirmar o status da assinatura e atualizar os sistemas quando concluída.  
**RF-15** Nenhuma assinatura deve ocorrer sem confirmação explícita do usuário na conversa.

---

### 3.4 Alertas Inteligentes

**RF-16** O sistema deve monitorar continuamente e alertar sobre:
- Agências que entraram na lista Sofia (devedores)
- Crédito de agência próximo ou acima do limite (threshold configurável, padrão 80%)
- Contratos vencendo nos próximos 7 dias
- Metas mensais em risco (abaixo de X% no meio do mês)

**RF-17** Os alertas devem ser enviados no próximo briefing agendado, salvo urgência (Lista Sofia = alerta imediato).  
**RF-18** O DIMAS deve oferecer ação imediata junto ao alerta quando possível (ex: "Quer gerar proposta de ampliação de crédito?").

---

### 3.5 Delegação e Ação em Nome do Executivo

**RF-19** O DIMAS deve poder enviar mensagens WhatsApp para contatos da base do SICA em nome do usuário, identificando-se como "Dimas, assistente do Wagner (Sakura)".  
**RF-20** O usuário deve autorizar explicitamente cada envio antes da ação.  
**RF-21** O DIMAS deve registrar todas as mensagens enviadas em nome do executivo com timestamp e destinatário.

**Exemplo de uso:**
```
Usuário: "Dimas, cota aéreo e hotel pra Florianópolis dia 29, primeira classe."
DIMAS: "Vou contatar a Marcela (Operações). Posso mandar a solicitação agora?"
Usuário: "Sim"
DIMAS envia: "Olá Marcela, sou o Dimas, assistente do Wagner (Sakura). 
Preciso cotar: Aéreo SP → FLN dia 29/05, primeira classe, ida e volta dia 01/06. 
Hotel próximo à Rua X para o evento Y. Aguardo retorno."
```

---

### 3.6 Memória Conversacional

**RF-22** O DIMAS deve manter histórico das últimas N mensagens por usuário (padrão: 8 turnos).  
**RF-23** O DIMAS não deve perguntar novamente algo que já foi respondido na sessão.  
**RF-24** Preferências do usuário (horário de briefing, formato, etc.) devem ser persistidas entre sessões.  
**RF-25** Dados sensíveis não devem ser armazenados no histórico de conversa — apenas metadados de referência.

---

### 3.7 Multi-Agente (Fase 3)

**RF-26** Cada executivo deve ter sua própria instância DIMAS com identidade, permissões e memória isoladas.  
**RF-27** Um DIMAS deve poder delegar tarefas para outro DIMAS com hierarquia definida.  
**RF-28** A comunicação entre agentes deve ser assíncrona, via fila, com retry automático.  
**RF-29** O DIMAS de nível superior (CEO) deve receber o resultado consolidado sem expor a comunicação interna ao usuário.

---

### 3.8 DIMAS Agência (Fase 4)

**RF-30** Agências clientes da Sakura devem poder ter seu próprio DIMAS para atendimento a clientes finais fora do horário.  
**RF-31** O DIMAS Agência deve resolver automaticamente: dúvidas de documentação, bagagem, check-in, visto.  
**RF-32** O DIMAS Agência deve escalar para o dono da agência quando detectar: problema em emissão, pedido de reembolso, reclamação de serviço.  
**RF-33** O alerta ao dono deve incluir contexto completo e 3 opções de ação pré-definidas.

---

## 4. Requisitos Não-Funcionais

**RNF-01 Disponibilidade:** O sistema deve estar disponível 24/7. Downtime planejado máximo de 2h/mês.  
**RNF-02 Latência:** Respostas a mensagens do usuário em até 8 segundos em condições normais.  
**RNF-03 Briefing:** Jobs de briefing devem ser executados com desvio máximo de 2 minutos do horário configurado.  
**RNF-04 Segurança:** Nenhum dado de crédito, financeiro ou PII deve trafegar sem TLS.  
**RNF-05 Auditoria:** 100% das ações executadas pelo DIMAS devem ser rastreáveis (quem, o quê, quando, resultado).  
**RNF-06 Isolamento:** Um DIMAS não pode acessar dados de outro DIMAS sem permissão explícita.  
**RNF-07 Recuperação:** Falhas em integrações externas (SICA, Doc4Sign) não devem travar a conversa — o DIMAS deve informar e continuar.

---

## 5. Regras de Negócio

**RN-01** Nenhuma ação irreversível (assinatura, envio de mensagem a terceiros, alteração de dados) ocorre sem confirmação explícita do usuário na conversa.  
**RN-02** O DIMAS nunca alucina dados financeiros. Se a fonte falhar, informa o erro honestamente.  
**RN-03** O DIMAS não menciona sistemas internos (SICA, SIGOT, filial, representante) nas respostas ao usuário.  
**RN-04** Dados de crédito e inadimplência são sempre buscados em tempo real — nunca de cache.  
**RN-05** A persona "DIMAS" é consistente: sempre se apresenta como assistente do executivo, nunca como o executivo.  
**RN-06** Mensagens enviadas em nome do executivo devem indicar claramente que são do assistente.

---

## 6. Fora de Escopo do MVP (Fase 1)

- Integração com Google Calendar / Outlook (usa horários hardcoded no MVP)
- Doc4Sign (entra na Fase 2)
- Multi-agente / comunicação entre DIMAS (entra na Fase 3)
- DIMAS Agência (entra na Fase 4)
- Triagem automática de e-mail
- Geração de PDF de relatórios
- Cotação de viagem delegada automaticamente

---

## 7. Roadmap de Fases

| Fase | Escopo | Prazo estimado |
|---|---|---|
| **MVP (Fase 1)** | Briefing automático, consulta de agências, alertas Sofia/crédito | 4 semanas |
| **Fase 2** | Doc4Sign no WhatsApp, delegação (Dimas como persona), cotação de viagem | 3 semanas |
| **Fase 3** | Multi-DIMAS, protocolo entre agentes, hierarquia e permissões | 4 semanas |
| **Fase 4** | DIMAS Agência, atendimento a cliente final, produto vendável | 4 semanas |

---

## 8. Critérios de Aceite do MVP

- [ ] Briefing automático dispara nos horários configurados e chega no WhatsApp do Wagner
- [ ] Wagner digita "me fala da WTS Viagens" e recebe dados do SICA em menos de 8 segundos
- [ ] Quando agência entra na lista Sofia, alerta chega imediatamente no WhatsApp
- [ ] Quando crédito de agência passa de 80%, alerta chega no próximo briefing
- [ ] DIMAS responde sem markdown, sem nomes de sistemas internos, em português correto
- [ ] Falha no SICA não trava a conversa — DIMAS informa e continua
