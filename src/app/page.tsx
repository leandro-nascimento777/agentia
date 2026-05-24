'use client';

import { useCallback, useEffect, useState } from 'react';

interface WhatsAppStatus {
  connected: boolean;
  qrCode: string | null;
}

const POLL_MS = 3000;

export default function HomePage() {
  const [status, setStatus] = useState<WhatsAppStatus>({ connected: false, qrCode: null });
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = (await res.json()) as WhatsAppStatus;
      setStatus(data);
    } catch {
      // silent — keeps polling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    const id = setInterval(() => void fetchStatus(), POLL_MS);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const statusLabel = status.connected
    ? 'Conectado'
    : status.qrCode
      ? 'Aguardando leitura do QR Code'
      : 'Inicializando…';

  const statusColor = status.connected ? '#22c55e' : status.qrCode ? '#f59e0b' : '#94a3b8';

  return (
    <main style={s.page}>
      <header style={s.header}>
        <h1 style={s.title}>WhatsApp Travel Bot</h1>
        <p style={s.subtitle}>Gerador automático de roteiros de viagem via WhatsApp</p>
      </header>

      <section style={s.card}>
        <div style={s.statusRow}>
          {loading ? (
            <span style={s.muted}>Conectando ao servidor…</span>
          ) : (
            <>
              <span style={{ ...s.dot, background: statusColor }} />
              <span style={s.statusLabel}>{statusLabel}</span>
            </>
          )}
        </div>
      </section>

      {!status.connected && status.qrCode && (
        <section style={s.card}>
          <p style={s.instruction}>
            Abra o WhatsApp no celular → <strong>Dispositivos vinculados</strong> → escaneie:
          </p>
          <div style={s.qrWrap}>
            <img src={status.qrCode} alt="QR Code WhatsApp" style={s.qrImg} />
          </div>
          <p style={s.muted}>O QR Code expira em 20 segundos. Esta página atualiza automaticamente.</p>
        </section>
      )}

      {status.connected && (
        <section style={{ ...s.card, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <p style={{ fontWeight: 600, color: '#15803d', marginBottom: 12 }}>
            ✓ Bot ativo! Envie uma mensagem como:
          </p>
          <ul style={s.examples}>
            <li>&ldquo;5 dias em Paris&rdquo;</li>
            <li>&ldquo;Olá, 4 dias no Rio de Janeiro&rdquo;</li>
            <li>&ldquo;Quero um roteiro de 7 dias em Lisboa&rdquo;</li>
          </ul>
          <p style={{ ...s.muted, marginTop: 12 }}>Você receberá um PDF com o roteiro completo.</p>
        </section>
      )}

      <section style={s.card}>
        <h2 style={s.sectionTitle}>API REST</h2>
        <p style={s.muted}>Gere roteiros via HTTP sem precisar do WhatsApp:</p>
        <pre style={s.code}>{`POST /api/travel
Content-Type: application/json

{ "message": "3 dias em São Paulo" }

→ { "success": true, "pdf": "<base64>", "filename": "roteiro-xxx.pdf" }`}</pre>
      </section>

      <footer style={s.footer}>
        <p>Arquitetura Hexagonal • Next.js 15 • TypeScript • whatsapp-web.js</p>
      </footer>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 640,
    margin: '0 auto',
    padding: '40px 20px 60px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#1a1a2e',
  },
  header: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: 700, margin: 0 },
  subtitle: { margin: '8px 0 0', color: '#64748b', fontSize: 15 },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '20px 24px',
    marginBottom: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  statusRow: { display: 'flex', alignItems: 'center', gap: 10 },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  statusLabel: { fontSize: 16, fontWeight: 500 },
  instruction: { marginBottom: 20, lineHeight: 1.6 },
  qrWrap: { display: 'flex', justifyContent: 'center', marginBottom: 16 },
  qrImg: { maxWidth: 280, borderRadius: 8, border: '1px solid #e2e8f0' },
  muted: { fontSize: 13, color: '#64748b', margin: 0 },
  examples: { paddingLeft: 20, lineHeight: 2.2, margin: 0 },
  sectionTitle: { fontSize: 16, fontWeight: 600, marginTop: 0, marginBottom: 10 },
  code: {
    background: '#0f172a',
    color: '#e2e8f0',
    borderRadius: 8,
    padding: '16px 18px',
    fontSize: 12,
    overflowX: 'auto',
    margin: '12px 0 0',
    whiteSpace: 'pre',
    lineHeight: 1.7,
  },
  footer: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 20,
  },
};
