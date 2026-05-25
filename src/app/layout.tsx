import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DIMAS — Sakura Consolidadora',
  description: 'Assistente financeiro pessoal da Sakura Consolidadora via WhatsApp',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
