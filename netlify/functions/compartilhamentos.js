const { getStore } = require('@netlify/blobs');

const REF_REGEX = /^[a-z0-9]{6,16}$/;
const json = (statusCode, data) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

// POST /api/compartilhamentos            -> registra um compartilhamento (idempotente por ref)
// POST /api/compartilhamentos/:ref/visita -> conta uma visita vinda do link compartilhado
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { erro: 'Método não permitido' });
  }

  const qs = event.queryStringParameters || {};
  const store = getStore('compartilhamentos');

  if (qs.acao === 'visita') {
    const ref = (qs.ref || '').toLowerCase();
    if (!REF_REGEX.test(ref)) return json(400, { erro: 'ref inválido' });
    try {
      const registro = await store.get(ref, { type: 'json' });
      if (!registro) return json(404, { erro: 'Compartilhamento não encontrado' });
      registro.visitas = (registro.visitas || 0) + 1;
      registro.ultimaVisitaEm = new Date().toISOString();
      await store.setJSON(ref, registro);
      return json(200, { ok: true });
    } catch (err) {
      console.error(err);
      return json(500, { erro: 'Falha ao registrar visita.' });
    }
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { erro: 'JSON inválido.' });
  }

  const { ref, canal, respostaId, sessionId, plano, precoEstimado } = body;
  if (!REF_REGEX.test(ref || '')) return json(400, { erro: 'ref inválido' });

  try {
    const existente = await store.get(ref, { type: 'json' });
    if (existente) {
      existente.cliques = (existente.cliques || 1) + 1;
      await store.setJSON(ref, existente);
      return json(200, { ref });
    }
    await store.setJSON(ref, {
      ref,
      canal: canal === 'whatsapp' ? 'whatsapp' : 'outro',
      respostaId: typeof respostaId === 'string' ? respostaId.slice(0, 100) : null,
      sessionId: typeof sessionId === 'string' ? sessionId.slice(0, 100) : null,
      plano: typeof plano === 'string' ? plano.slice(0, 40) : null,
      precoEstimado: Number.isFinite(precoEstimado) ? precoEstimado : null,
      cliques: 1,
      visitas: 0,
      criadoEm: new Date().toISOString(),
      ultimaVisitaEm: null,
    });
    return json(201, { ref });
  } catch (err) {
    console.error(err);
    return json(500, { erro: 'Falha ao registrar compartilhamento.' });
  }
};
