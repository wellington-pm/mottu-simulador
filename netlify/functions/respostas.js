const crypto = require('node:crypto');
const { getStore } = require('@netlify/blobs');
const { DIAS_VALIDOS, KM_VALIDOS, PROTECAO_VALIDA, calcularPreco } = require('./lib/pricing');

const ADMIN_KEY = process.env.ADMIN_KEY || 'mottu-admin';
const json = (statusCode, data) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

exports.handler = async (event) => {
  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { erro: 'JSON inválido.' });
    }

    const { sessionId, dias, km, protecao } = body;
    if (!DIAS_VALIDOS.includes(dias) || !KM_VALIDOS.includes(km) || !PROTECAO_VALIDA.includes(protecao)) {
      return json(400, { erro: 'Respostas inválidas.' });
    }

    const sid = typeof sessionId === 'string' && sessionId.length <= 100 ? sessionId : crypto.randomUUID();
    const preco = calcularPreco({ dias, km, protecao });
    const id = crypto.randomUUID();

    try {
      const store = getStore('respostas');
      await store.setJSON(id, {
        id,
        sessionId: sid,
        dias,
        km,
        protecao,
        precoMin: preco.precoMin,
        precoEstimado: preco.precoEstimado,
        precoMax: preco.precoMax,
        convertido: false,
        criadoEm: new Date().toISOString(),
        atualizadoEm: null,
      });
    } catch (err) {
      console.error(err);
      return json(500, { erro: 'Falha ao salvar a resposta.' });
    }

    return json(201, { id, sessionId: sid, ...preco });
  }

  if (event.httpMethod === 'GET') {
    const chave = event.queryStringParameters && event.queryStringParameters.key;
    if (chave !== ADMIN_KEY) {
      return json(401, { erro: 'Não autorizado' });
    }
    try {
      const store = getStore('respostas');
      const { blobs } = await store.list();
      const registros = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })));
      registros.sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
      return json(200, registros);
    } catch (err) {
      console.error(err);
      return json(500, { erro: 'Falha ao listar respostas.' });
    }
  }

  return json(405, { erro: 'Método não permitido' });
};
