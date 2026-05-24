# TODO — WhatsApp Travel Bot

## ✅ Feito

### Arquitetura & Estrutura
- [x] Arquitetura Hexagonal rigorosa (domain / adapters / infrastructure / app)
- [x] Domain layer 100% puro — zero dependências externas
- [x] Ports como contratos (interfaces TypeScript)
- [x] Dependency Injection via constructor em todas as classes
- [x] Singleton do container com `globalThis` (evita re-instanciar no HMR)
- [x] Custom server (`server.ts`) — inicializa WhatsApp + Next.js no mesmo processo

### SOLID — Revisado e Corrigido
- [x] **SRP** — cada classe tem uma única responsabilidade
- [x] **OCP** — extensível via Ports sem modificar código existente
- [x] **LSP** — adapters substituíveis sem quebrar contratos
- [x] **ISP** — interfaces focadas (IWhatsAppPort, ITravelControllerPort, ITravelAIServicePort, IPdfGeneratorPort)
- [x] **DIP** — `WhatsAppAdapter` depende de `ITravelControllerPort` (interface), não de `GenerateTravelItineraryUseCase` (classe concreta)

### DRY — Revisado e Corrigido
- [x] Lógica de detecção de mensagem de viagem centralizada em `TravelRequest.isTravelMessage()` (domain)
- [x] `sanitize()` no PdfGeneratorAdapter usa `ACCENT_MAP` estático em vez de 6 `.replace()` duplicados
- [x] Validators centralizados via Zod nas entidades
- [x] Factory methods padronizados (`create()`) em todas as entidades e value objects

### Domain
- [x] Value Object `DaysCount` — valida inteiro entre 1 e 30
- [x] Value Object `Destination` — valida string entre 2 e 100 chars
- [x] Entity `TravelRequest` — valida texto e remetente via Zod + `isTravelMessage()` no domain
- [x] Entity `TravelItinerary` — agrega destino, dias, planos, hotel, transporte
- [x] Use Case `GenerateTravelItineraryUseCase` — orquestra AI → PDF

### Adapters
- [x] `WhatsAppAdapter` implementa `IWhatsAppPort`, depende de `ITravelControllerPort` (DIP correto)
- [x] `TravelApiAdapter` implementa `ITravelControllerPort`, wrapa o use case
- [x] `OpenAITravelAdapter` implementa `ITravelAIServicePort` com fallback mock
- [x] `PdfGeneratorAdapter` implementa `IPdfGeneratorPort` — PDF multi-páginas com capa, dias e resumo

### Qualidade
- [x] TypeScript strict em todo o projeto
- [x] Zod para validação em todas as entradas externas
- [x] 28 testes unitários no domain (value objects, entity, use case, isTravelMessage)
- [x] Filtro `status@broadcast` ignorado no adapter
- [x] Dead code removido: `onMessage()` que nunca era chamada de fora

---

## 🔧 Falta / Melhorias

### Configuração (prioritário)
- [ ] Criar `.gitignore` — `.env.local`, `.wwebjs_auth/`, `.next/` e `node_modules/` não devem ser commitados
- [ ] Criar `.env.local` com `OPENAI_API_KEY` para conteúdo real no PDF

### Domain (pendências arquiteturais)
- [ ] `Message` entity existe no domain mas não é utilizada — conectar ao fluxo do `WhatsAppAdapter` ou remover
- [ ] `IGNORED_SENDERS` no `WhatsAppAdapter` é regra de negócio — mover para o domain (ex: `TravelRequest.isIgnoredSender()`)

### PDF
- [ ] Substituir `sanitize()` por fonte com suporte a UTF-8 via `@pdf-lib/fontkit` + fonte TTF embutida (solução definitiva para acentos)
- [ ] Gerar nome do arquivo com destino: `roteiro-paris-5dias.pdf`

### WhatsApp
- [ ] Fila de mensagens — evitar processar o mesmo pedido duas vezes em paralelo
- [ ] Mensagem de confirmação antes de gerar: "Gerando seu roteiro, aguarde..."
- [ ] Reconnect automático em caso de queda de sessão
- [ ] Decidir entre `message` (somente recebidas) vs `message_create` (todas) e documentar a decisão

### Testes
- [ ] Testes para `OpenAITravelAdapter` (mock do cliente OpenAI)
- [ ] Testes para `PdfGeneratorAdapter` (verificar buffer gerado)
- [ ] Testes para as rotas da API (`/api/travel`, `/api/whatsapp/status`)
- [ ] Testes para `WhatsAppAdapter` (mock do Client do whatsapp-web.js)

### Produto
- [ ] Suporte a Claude/Anthropic como alternativa à OpenAI
- [ ] Histórico de roteiros gerados (SQLite ou JSON)
- [ ] Comando `/ajuda` no WhatsApp com exemplos de uso
- [ ] Rate limiting na API REST

### Produção
- [ ] Dockerfile + docker-compose
- [ ] `outputFileTracingRoot` no `next.config.ts` para silenciar warning de lockfile múltiplo
- [ ] Healthcheck endpoint `GET /api/health`
