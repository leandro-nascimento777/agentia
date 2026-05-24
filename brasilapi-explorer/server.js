const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3333;
const BASE_URL = 'https://brasilapi.com.br/api';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Proxy genérico — repassa qualquer subpath para a Brasil API
app.get('/proxy/*', async (req, res) => {
  const apiPath = req.params[0];
  const query = new URLSearchParams(req.query).toString();
  const url = `${BASE_URL}/${apiPath}${query ? '?' + query : ''}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'BrasilAPI-Explorer/1.0' }
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao contatar a Brasil API', details: err.message });
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅  Brasil API Explorer rodando em http://localhost:${PORT}\n`);
});
