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

// Teste A/B do CTA: exibições = respostas que chegaram ao resultado; conversões = cliques no CTA.
function testeCta(registros) {
  const grupos = {};
  registros
    .filter((r) => r.varianteCta)
    .forEach((r) => {
      const g = (grupos[r.varianteCta] = grupos[r.varianteCta] || { exibicoes: 0, conversoes: 0 });
      g.exibicoes += 1;
      if (r.convertido) g.conversoes += 1;
    });
  return Object.entries(grupos).map(([variante, g]) => ({
    variante,
    ...g,
    taxaConversao: g.exibicoes ? Number(((g.conversoes / g.exibicoes) * 100).toFixed(2)) : 0,
  }));
}

// Teste A/B da headline, por sessão: viu a home -> começou -> chegou ao resultado -> clicou no CTA.
function testeHeadline(eventos, registros) {
  const grupos = {};
  const grupo = (v) => (grupos[v] = grupos[v] || { visualizacoes: new Set(), inicios: new Set(), resultados: new Set(), conversoes: new Set() });
  eventos.forEach((e) => {
    if (!e.varianteHeadline) return;
    if (e.tipo === 'visualizacao_home') grupo(e.varianteHeadline).visualizacoes.add(e.sessionId);
    if (e.tipo === 'inicio') grupo(e.varianteHeadline).inicios.add(e.sessionId);
  });
  registros.forEach((r) => {
    if (!r.varianteHeadline) return;
    grupo(r.varianteHeadline).resultados.add(r.sessionId);
    if (r.convertido) grupo(r.varianteHeadline).conversoes.add(r.sessionId);
  });
  const pct = (a, b) => (b ? Number(((a / b) * 100).toFixed(2)) : 0);
  return Object.entries(grupos).map(([variante, g]) => ({
    variante,
    visualizacoes: g.visualizacoes.size,
    inicios: g.inicios.size,
    resultados: g.resultados.size,
    conversoes: g.conversoes.size,
    taxaInicio: pct(g.inicios.size, g.visualizacoes.size),
    taxaConclusao: pct(g.resultados.size, g.inicios.size),
    taxaConversaoTotal: pct(g.conversoes.size, g.visualizacoes.size),
  }));
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
    const storeEventos = getStore('eventos');
    const { blobs: blobsEventos } = await storeEventos.list();
    const eventos = await Promise.all(blobsEventos.map((b) => storeEventos.get(b.key, { type: 'json' })));

    const indicadas = registros.filter((r) => r.origem && r.origem.ref);

    return json(200, {
      total: registros.length,
      convertidos: registros.filter((r) => r.convertido).length,
      porDias: contarPor(registros, 'dias'),
      porKm: contarPor(registros, 'km'),
      porProtecao: contarPor(registros, 'protecao'),
      testeCta: testeCta(registros),
      testeHeadline: testeHeadline(eventos, registros),
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
