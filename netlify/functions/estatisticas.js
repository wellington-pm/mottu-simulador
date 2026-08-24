const { getStore } = require('@netlify/blobs');

const ADMIN_KEY = process.env.ADMIN_KEY || 'mottu-admin';
const json = (statusCode, data) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

function contarPor(registros, campo) {
  const contagem = {};
  registros.forEach((r) => {
    contagem[r[campo]] = (contagem[r[campo]] || 0) + 1;
  });
  return Object.entries(contagem).map(([valor, n]) => ({ [campo]: valor, n }));
}

exports.handler = async (event) => {
  const chave = event.queryStringParameters && event.queryStringParameters.key;
  if (chave !== ADMIN_KEY) {
    return json(401, { erro: 'Não autorizado' });
  }

  try {
    const store = getStore('respostas');
    const { blobs } = await store.list();
    const registros = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' })));

    return json(200, {
      total: registros.length,
      convertidos: registros.filter((r) => r.convertido).length,
      porDias: contarPor(registros, 'dias'),
      porKm: contarPor(registros, 'km'),
    });
  } catch (err) {
    console.error(err);
    return json(500, { erro: 'Falha ao calcular estatísticas.' });
  }
};
