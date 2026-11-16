const { getStore } = require('@netlify/blobs');

const TIPOS = ['visualizacao_home', 'inicio'];
const VARIANTES_HEADLINE = ['controle', 'clareza'];
const VARIANTES_CTA = ['garantir', 'reservar'];
const SESSION_REGEX = /^[a-zA-Z0-9-]{8,100}$/;

const json = (statusCode, data) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

// POST /api/eventos -> registra um evento do funil.
// Chave = tipo:sessionId, então cada sessão conta no máximo 1x por tipo de evento.
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { erro: 'Método não permitido' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { erro: 'JSON inválido.' });
  }

  const { tipo, sessionId, varianteHeadline, varianteCta } = body;
  if (!TIPOS.includes(tipo) || !SESSION_REGEX.test(sessionId || '')) {
    return json(400, { erro: 'Evento inválido.' });
  }

  const chave = `${tipo}:${sessionId}`;
  try {
    const store = getStore('eventos');
    const existente = await store.get(chave, { type: 'json' });
    if (existente) return json(200, { ok: true, duplicado: true });
    await store.setJSON(chave, {
      tipo,
      sessionId,
      varianteHeadline: VARIANTES_HEADLINE.includes(varianteHeadline) ? varianteHeadline : null,
      varianteCta: VARIANTES_CTA.includes(varianteCta) ? varianteCta : null,
      criadoEm: new Date().toISOString(),
    });
    return json(201, { ok: true });
  } catch (err) {
    console.error(err);
    return json(500, { erro: 'Falha ao registrar evento.' });
  }
};
