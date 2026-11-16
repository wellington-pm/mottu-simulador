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

    const storeComp = getStore('compartilhamentos');
    const { blobs: blobsComp } = await storeComp.list();
    const compartilhamentos = await Promise.all(blobsComp.map((b) => storeComp.get(b.key, { type: 'json' })));
    const indicadas = registros.filter((r) => r.origem && r.origem.ref);

    return json(200, {
      total: registros.length,
      convertidos: registros.filter((r) => r.convertido).length,
      porDias: contarPor(registros, 'dias'),
      porKm: contarPor(registros, 'km'),
      porProtecao: contarPor(registros, 'protecao'),
      compartilhamento: {
        compartilhamentos: compartilhamentos.length,
        visitas: compartilhamentos.reduce((soma, c) => soma + (c.visitas || 0), 0),
        simulacoesIndicadas: indicadas.length,
        conversoesIndicadas: indicadas.filter((r) => r.convertido).length,
      },
    });
  } catch (err) {
    console.error(err);
    return json(500, { erro: 'Falha ao calcular estatísticas.' });
  }
};
