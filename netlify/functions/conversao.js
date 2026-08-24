const { getStore } = require('@netlify/blobs');

const json = (statusCode, data) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { erro: 'Método não permitido' });
  }

  const id = event.queryStringParameters && event.queryStringParameters.id;
  if (!id) {
    return json(400, { erro: 'id inválido' });
  }

  try {
    const store = getStore('respostas');
    const registro = await store.get(id, { type: 'json' });
    if (!registro) {
      return json(404, { erro: 'Resposta não encontrada' });
    }

    registro.convertido = true;
    registro.atualizadoEm = new Date().toISOString();
    await store.setJSON(id, registro);

    return json(200, { ok: true });
  } catch (err) {
    console.error(err);
    return json(500, { erro: 'Falha ao marcar conversão.' });
  }
};
