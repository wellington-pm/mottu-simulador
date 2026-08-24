(function () {
  const MOTTU_URL = 'https://mottu.com.br/aluguel';

  const DIAS = [
    { value: '1-2', label: '1 a 2 dias' },
    { value: '3-4', label: '3 a 4 dias' },
    { value: '5-7', label: '5 a 7 dias' },
  ];
  const KM = [
    {
      value: 'ate20',
      label: 'Até 20 km',
      hint: 'Usa menos de meio litro por dia',
    },
    {
      value: '21-50',
      label: '21 a 50 km',
      hint: 'Cerca de 1 a 1,5 litro por dia',
    },
    {
      value: '51-100',
      label: '51 a 100 km',
      hint: 'Aproximadamente meio tanque por dia (2 a 3 litros)',
    },
    {
      value: '100+',
      label: '+ de 100 km',
      hint: 'Gasta quase 1 tanque ou mais por dia',
    },
  ];
  const PROTECAO = [
    {
      value: 'moto',
      label: 'Apenas a moto',
      hint: 'Plano essencial para quem quer o menor custo.',
    },
    {
      value: 'manutencao',
      label: 'Moto + Manutenção preventiva',
      hint: 'Revisões e trocas de peças inclusas.',
    },
    {
      value: 'completa',
      label: 'Plano Completo (Moto + Manutenção + Proteção)',
      hint: 'Rodagem sem preocupação contra roubo, furto e acidentes.',
    },
  ];

  const STEPS = ['home', 'q1', 'q2', 'q3', 'resultado'];

  const state = {
    step: 'home',
    dias: null,
    km: null,
    protecao: null,
    sessionId: getSessionId(),
    respostaId: null,
    precos: null,
  };

  function getSessionId() {
    let id = sessionStorage.getItem('mottu_session_id');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('mottu_session_id', id);
    }
    return id;
  }

  const els = {
    steps: Object.fromEntries(STEPS.map((s) => [s, document.querySelector(`[data-step="${s}"]`)])),
    progress: document.getElementById('progress'),
    dots: document.querySelectorAll('.progress .dot'),
    btnSimularNovamente: document.getElementById('btn-simular-novamente'),
    btnVoltarTopo: document.getElementById('btn-voltar-topo'),

    btnComecar: document.getElementById('btn-comecar'),

    opcoesDias: document.getElementById('opcoes-dias'),
    btnContinuarQ1: document.getElementById('btn-continuar-q1'),

    opcoesKm: document.getElementById('opcoes-km'),
    btnContinuarQ2: document.getElementById('btn-continuar-q2'),

    opcoesProtecao: document.getElementById('opcoes-protecao'),
    btnVerResultado: document.getElementById('btn-ver-resultado'),

    planoNome: document.getElementById('plano-nome'),
    beneficios: document.getElementById('beneficios'),
    precoMin: document.getElementById('preco-min'),
    precoEstimado: document.getElementById('preco-estimado'),
    precoMax: document.getElementById('preco-max'),
    priceHandle: document.getElementById('price-handle'),
    btnContratar: document.getElementById('btn-contratar'),
  };

  function renderOptions(container, list, stateKey, onSelect, { tooltip = true } = {}) {
    container.innerHTML = '';
    list.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option';
      if (opt.hint && tooltip) {
        btn.innerHTML = `
          <span class="option-row">
            <span class="option-label">${opt.label}</span>
            <span class="option-info" role="button" tabindex="0" aria-expanded="false" aria-label="Mais informações sobre ${opt.label}">i</span>
          </span>
          <span class="option-hint hidden">${opt.hint}</span>
        `;
      } else if (opt.hint) {
        btn.innerHTML = `
          <span class="option-label">${opt.label}</span>
          <span class="option-hint">${opt.hint}</span>
        `;
      } else {
        btn.textContent = opt.label;
      }
      btn.setAttribute('aria-pressed', state[stateKey] === opt.value ? 'true' : 'false');
      if (state[stateKey] === opt.value) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        state[stateKey] = opt.value;
        onSelect();
        renderOptions(container, list, stateKey, onSelect, { tooltip });
      });

      const info = btn.querySelector('.option-info');
      if (info) {
        const toggleHint = (e) => {
          e.stopPropagation();
          const hint = btn.querySelector('.option-hint');
          const aberto = !hint.classList.contains('hidden');
          hint.classList.toggle('hidden', aberto);
          info.setAttribute('aria-expanded', String(!aberto));
        };
        info.addEventListener('click', toggleHint);
        info.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleHint(e);
          }
        });
      }
      container.appendChild(btn);
    });
  }

  function goTo(step) {
    state.step = step;
    STEPS.forEach((s) => {
      els.steps[s].hidden = s !== step;
    });

    const isQuiz = ['q1', 'q2', 'q3'].includes(step);
    els.progress.hidden = !isQuiz;
    els.btnVoltarTopo.hidden = !isQuiz;

    if (isQuiz) {
      const idx = { q1: 0, q2: 1, q3: 2 }[step];
      els.dots.forEach((dot, i) => {
        dot.classList.toggle('done', i < idx);
        dot.classList.toggle('current', i === idx);
      });
    }

    window.scrollTo(0, 0);
  }

  function formatBRL(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function planoNomePara(protecao, dias) {
    if (protecao === 'completa') return dias === '5-7' ? 'Mottu Pro' : 'Mottu Completo';
    if (protecao === 'manutencao') return 'Mottu Flex';
    return 'Mottu Start';
  }

  function beneficiosPara({ dias, km, protecao }) {
    const diasLabel = DIAS.find((d) => d.value === dias).label;
    const kmLabel = KM.find((k) => k.value === km).label;
    const lista = [
      `Ideal para quem roda ${diasLabel} por semana`,
      `Para média de ${kmLabel} por dia`,
    ];
    if (protecao === 'manutencao') {
      lista.push('Manutenção completa inclusa');
    } else if (protecao === 'completa') {
      lista.push('Cobertura completa com assistência 24h');
      lista.push('Proteção contra terceiros inclusa');
    } else {
      lista.push('Moto revisada e pronta para rodar');
    }
    return lista;
  }

  async function enviarRespostas() {
    try {
      const res = await fetch('/api/respostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          dias: state.dias,
          km: state.km,
          protecao: state.protecao,
        }),
      });
      if (!res.ok) throw new Error('Falha ao salvar respostas');
      const data = await res.json();
      state.respostaId = data.id;
      state.precos = { min: data.precoMin, estimado: data.precoEstimado, max: data.precoMax };
    } catch (err) {
      console.error(err);
      state.precos = calcularPrecoLocal();
    }
  }

  function calcularPrecoLocal() {
    const DIAS_BASE = { '1-2': 129, '3-4': 149, '5-7': 179 };
    const KM_ADD = { ate20: 0, '21-50': 10, '51-100': 25, '100+': 50 };
    const PROT_ADD = { moto: 0, manutencao: 20, completa: 40 };
    const estimado = DIAS_BASE[state.dias] + KM_ADD[state.km] + PROT_ADD[state.protecao];
    return { min: Math.max(estimado - 30, 79), estimado, max: estimado + 30 };
  }

  function renderResultado() {
    els.planoNome.textContent = planoNomePara(state.protecao, state.dias);
    els.beneficios.innerHTML = '';
    beneficiosPara(state).forEach((texto) => {
      const li = document.createElement('li');
      li.innerHTML = `<span class="check">✓</span> ${texto}`;
      els.beneficios.appendChild(li);
    });

    const { min, estimado, max } = state.precos;
    els.precoMin.textContent = formatBRL(min);
    els.precoEstimado.textContent = formatBRL(estimado);
    els.precoMax.textContent = formatBRL(max);

    const pct = max === min ? 50 : ((estimado - min) / (max - min)) * 100;
    els.priceHandle.style.left = `${Math.min(Math.max(pct, 4), 96)}%`;
  }

  // --- eventos ---

  els.btnComecar.addEventListener('click', () => {
    renderOptions(els.opcoesDias, DIAS, 'dias', () => {
      els.btnContinuarQ1.disabled = !state.dias;
    });
    goTo('q1');
  });

  els.btnContinuarQ1.addEventListener('click', () => {
    renderOptions(els.opcoesKm, KM, 'km', () => {
      els.btnContinuarQ2.disabled = !state.km;
    });
    goTo('q2');
  });

  els.btnContinuarQ2.addEventListener('click', () => {
    renderOptions(
      els.opcoesProtecao,
      PROTECAO,
      'protecao',
      () => {
        els.btnVerResultado.disabled = !state.protecao;
      },
      { tooltip: false }
    );
    goTo('q3');
  });

  els.btnVerResultado.addEventListener('click', async () => {
    els.btnVerResultado.disabled = true;
    els.btnVerResultado.textContent = 'Calculando...';
    await enviarRespostas();
    els.btnVerResultado.textContent = 'Ver resultado';
    els.btnVerResultado.disabled = false;
    renderResultado();
    goTo('resultado');
  });

  els.btnContratar.addEventListener('click', () => {
    if (state.respostaId) {
      fetch(`/api/respostas/${state.respostaId}/conversao`, { method: 'POST' }).catch(() => {});
    }
    window.open(MOTTU_URL, '_blank', 'noopener,noreferrer');
  });

  els.btnSimularNovamente.addEventListener('click', () => {
    state.dias = null;
    state.km = null;
    state.protecao = null;
    state.respostaId = null;
    state.precos = null;
    els.btnContinuarQ1.disabled = true;
    els.btnContinuarQ2.disabled = true;
    els.btnVerResultado.disabled = true;
    goTo('home');
  });

  els.btnVoltarTopo.addEventListener('click', () => {
    const idx = STEPS.indexOf(state.step);
    if (idx > 0) goTo(STEPS[idx - 1]);
  });

  goTo('home');
})();
