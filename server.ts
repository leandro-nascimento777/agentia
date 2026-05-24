import { loadEnvConfig } from '@next/env';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { container } from './src/agents/financial/infrastructure/container.singleton';

loadEnvConfig(process.cwd());

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const isDev = process.env.NODE_ENV !== 'production';

async function main(): Promise<void> {
  const app = next({ dev: isDev });
  const handle = app.getRequestHandler();

  await app.prepare();

  container.scheduler?.start();

  createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  }).listen(PORT, () => {
    console.log(`[Server] Rodando em http://localhost:${PORT}`);
  });
}

main().catch(console.error);
