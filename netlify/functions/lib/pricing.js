const DIAS_BASE = { '1-2': 129, '3-4': 149, '5-7': 179 };
const KM_ADICIONAL = { ate20: 0, '21-50': 10, '51-100': 25, '100+': 50 };
const PROTECAO_ADICIONAL = { moto: 0, manutencao: 20, completa: 40 };
const FAIXA = 30;

const DIAS_VALIDOS = Object.keys(DIAS_BASE);
const KM_VALIDOS = Object.keys(KM_ADICIONAL);
const PROTECAO_VALIDA = Object.keys(PROTECAO_ADICIONAL);

function calcularPreco({ dias, km, protecao }) {
  const estimado = DIAS_BASE[dias] + KM_ADICIONAL[km] + PROTECAO_ADICIONAL[protecao];
  return {
    precoMin: Math.max(estimado - FAIXA, 79),
    precoEstimado: estimado,
    precoMax: estimado + FAIXA,
  };
}

module.exports = { DIAS_VALIDOS, KM_VALIDOS, PROTECAO_VALIDA, calcularPreco };
