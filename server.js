const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const { inserirResposta, marcarConversao, listarRespostas, estatisticas } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'mottu-admin';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DIAS_BASE = { '1-2': 129, '3-4': 149, '5-7': 179 };
const KM_ADICIONAL = { ate20: 0, '21-50': 10, '51-100': 25, '100+': 50 };
const PROTECAO_ADICIONAL = { moto: 0, manutencao: 20, completa: 40 };
const FAIXA = 30;

const DIAS_VALIDOS = Object.keys(DIAS_BASE);
const KM_VALIDOS = Object.keys(KM_ADICIONAL);
const PROTECAO_VALIDA = Object.keys(PROTECAO_ADICIONAL);

function calcularPreco({ dias, km, protecao }) {
  const base = DIAS_BASE[dias];
  const adicionalKm = KM_ADICIONAL[km];
  const adicionalProtecao = PROTECAO_ADICIONAL[protecao];
  const estimado = base + adicionalKm + adicionalProtecao;
  return {
    precoMin: Math.max(estimado - FAIXA, 79),
    precoEstimado: estimado,
    precoMax: estimado + FAIXA,
  };
}

app.post('/api/respostas', (req, res) => {
  const { sessionId, dias, km, protecao } = req.body || {};

  if (!DIAS_VALIDOS.includes(dias) || !KM_VALIDOS.includes(km) || !PROTECAO_VALIDA.includes(protecao)) {
    return res.status(400).json({ erro: 'Respostas inválidas.' });
  }

  const sid = typeof sessionId === 'string' && sessionId.length <= 100 ? sessionId : crypto.randomUUID();
  const preco = calcularPreco({ dias, km, protecao });

  const id = inserirResposta({
    sessionId: sid,
    dias,
    km,
    protecao,
    precoMin: preco.precoMin,
    precoEstimado: preco.precoEstimado,
    precoMax: preco.precoMax,
  });

  res.status(201).json({ id, sessionId: sid, ...preco });
});

app.post('/api/respostas/:id/conversao', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ erro: 'id inválido' });
  const ok = marcarConversao(id);
  if (!ok) return res.status(404).json({ erro: 'Resposta não encontrada' });
  res.json({ ok: true });
});

function exigirAdmin(req, res, next) {
  if (req.query.key !== ADMIN_KEY) return res.status(401).json({ erro: 'Não autorizado' });
  next();
}

app.get('/api/respostas', exigirAdmin, (req, res) => {
  res.json(listarRespostas());
});

app.get('/api/estatisticas', exigirAdmin, (req, res) => {
  res.json(estatisticas());
});

app.listen(PORT, () => {
  console.log(`Simulador Mottu rodando em http://localhost:${PORT}`);
});
