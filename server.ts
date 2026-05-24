import { loadEnvConfig } from '@next/env';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { container } from './src/infrastructure/dependency-container';

loadEnvConfig(process.cwd());

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const isDev = process.env.NODE_ENV !== 'production';

async function main(): Promise<void> {
  const app = next({ dev: isDev });
  const handle = app.getRequestHandler();

  await app.prepare();

  // WhatsApp via whatsapp-web.js desabilitado — usando Twilio

  createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  }).listen(PORT, () => {
    console.log(`[Server] Servidor rodando em http://localhost:${PORT}`);
    console.log('[Server] Aguarde o QR Code aparecer no terminal para conectar o WhatsApp');
  });
}

main().catch(console.error);
