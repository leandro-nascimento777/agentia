export default function HomePage() {
  return (
    <main style={s.page}>
      <header style={s.header}>
        <h1 style={s.title}>DIMAS</h1>
        <p style={s.subtitle}>Assistente financeiro da Sakura Consolidadora — via WhatsApp</p>
      </header>

      <section style={s.card}>
        <p style={s.text}>
          O DIMAS opera exclusivamente pelo WhatsApp. Envie uma mensagem para o número cadastrado.
        </p>
        <ul style={s.list}>
          <li>Panorama financeiro diário automático</li>
          <li>Consultas de vendas Aéreo e Terrestre</li>
          <li>Comparativos com o ano anterior</li>
          <li>Novas agências cadastradas no mês</li>
        </ul>
      </section>

      <footer style={s.footer}>
        <p>Arquitetura Hexagonal · Next.js 15 · TypeScript · Twilio · Claude</p>
      </footer>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 560,
    margin: '0 auto',
    padding: '60px 20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#1a1a2e',
  },
  header: { marginBottom: 32 },
  title: { fontSize: 36, fontWeight: 700, margin: 0, color: '#0f172a' },
  subtitle: { margin: '8px 0 0', color: '#64748b', fontSize: 15 },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    padding: '24px 28px',
    marginBottom: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  text: { margin: '0 0 16px', lineHeight: 1.6, color: '#334155' },
  list: { margin: 0, paddingLeft: 20, color: '#475569', lineHeight: 2 },
  footer: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 32 },
};
