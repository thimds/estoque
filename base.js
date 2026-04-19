

// ---- VOZ ----
function initVoz() {
  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Rec) return;

  var rec = new Rec();
  rec.lang = 'pt-BR';
  rec.continuous = true;
  rec.interimResults = true;

  var ativo = false;
  var fila  = [];
  var btn    = document.getElementById('btn-voz');
  var status = document.getElementById('voz-status');
  var painel = document.getElementById('voz-fila');
  var interimEl = document.getElementById('voz-interim');

  function norm(s) {
    return s.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/virgula|ponto/g, '.')
      .replace(/[^a-z0-9.\s]/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  var NUMS = {
    'zero':0,'um':1,'uma':1,'dois':2,'duas':2,'tres':3,'quatro':4,
    'cinco':5,'seis':6,'sete':7,'oito':8,'nove':9,'dez':10,
    'onze':11,'doze':12,'treze':13,'catorze':14,'quinze':15,
    'dezesseis':16,'dezessete':17,'dezoito':18,'dezenove':19,
    'vinte':20,'trinta':30,'quarenta':40,'cinquenta':50,
    'meia':0.5,'meio':0.5
  };

  function extrairNum(s) {
    var m = s.match(/(\d+(?:\.\d+)?)/);
    if (m) return parseFloat(m[1]);
    var palavras = s.split(' '), soma = 0, achou = false;
    for (var i = 0; i < palavras.length; i++) {
      if (NUMS[palavras[i]] !== undefined) { soma += NUMS[palavras[i]]; achou = true; }
    }
    return achou ? soma : null;
  }

  function encontrarItem(texto) {
    var rows = document.querySelectorAll('.item-row');
    var melhor = null, melhorScore = 0;
    var t = norm(texto);
    rows.forEach(function(row) {
      var nomeEl = row.querySelector('.item-name');
      if (!nomeEl) return;
      var nome = norm(nomeEl.textContent);
      var palavras = nome.split(' ').filter(function(p){ return p.length > 2; });
      var score = 0;
      palavras.forEach(function(p){ if (t.indexOf(p) !== -1) score++; });
      if (t.indexOf(nome.split(' ')[0]) !== -1) score += 0.5;
      if (score > melhorScore) { melhorScore = score; melhor = row; }
    });
    return melhorScore > 0 ? melhor : null;
  }

  function setStatus(txt, cor) {
    if (!status) return;
    status.textContent = txt;
    status.style.color = cor || 'var(--muted)';
    status.style.display = txt ? 'block' : 'none';
  }

  function renderFila() {
    if (!painel) return;
    if (!fila.length) { painel.innerHTML = ''; painel.style.display = 'none'; return; }
    painel.style.display = 'block';
    var html = '<div class="voz-fila-title">Confirme os itens reconhecidos</div>';
    fila.forEach(function(item, idx) {
      html += '<div class="voz-item">' +
        '<div class="voz-item-info">' +
          '<span class="voz-item-nome">' + item.nome + '</span>' +
          '<span class="voz-item-qtd">' + item.qtd + ' ' + item.un + '</span>' +
        '</div>' +
        '<div class="voz-item-acoes">' +
          '<button class="voz-btn-ok"   onclick="confirmarVoz(' + idx + ')">✓</button>' +
          '<button class="voz-btn-edit" onclick="editarVoz('    + idx + ')">✎</button>' +
          '<button class="voz-btn-del"  onclick="descartarVoz(' + idx + ')">✕</button>' +
        '</div>' +
      '</div>';
    });
    if (fila.length > 1) {
      html += '<button class="voz-btn-todos" onclick="confirmarTodos()">✓ Confirmar todos (' + fila.length + ')</button>';
    }
    painel.innerHTML = html;
  }

  function aplicarItem(item) {
    var ins = item.row.querySelectorAll('input[type=number]');
    if (ins[0]) {
      ins[0].value = item.qtd;
      ins[0].dispatchEvent(new Event('input', { bubbles: true }));
      ins[0].style.background = '#d4edda';
      setTimeout(function(){ ins[0].style.background = ''; }, 1000);
    }
    if (typeof saveLocal_ === 'function') saveLocal_();
  }

  window.confirmarVoz = function(idx) {
    var item = fila[idx]; if (!item) return;
    aplicarItem(item);
    fila.splice(idx, 1);
    renderFila();
  };

  window.confirmarTodos = function() {
    fila.forEach(function(item){ aplicarItem(item); });
    fila = []; renderFila();
  };

  window.descartarVoz = function(idx) {
    fila.splice(idx, 1); renderFila();
  };

  window.editarVoz = function(idx) {
    var item = fila[idx]; if (!item) return;
    var nova = prompt('Quantidade para ' + item.nome + ':', item.qtd);
    if (nova === null) return;
    var n = parseFloat(nova);
    if (!isNaN(n)) { fila[idx].qtd = n; renderFila(); }
  };

  rec.onresult = function(e) {
    var interim = '';
    for (var i = e.resultIndex; i < e.results.length; i++) {
      var r = e.results[i];
      if (r.isFinal) {
        var transcript = r[0].transcript.trim();
        if (interimEl) interimEl.textContent = '';
        var t = norm(transcript);
        var num = extrairNum(t);
        var row = encontrarItem(t);
        if (row && num !== null) {
          var nomeEl = row.querySelector('.item-name');
          var nome = nomeEl ? nomeEl.textContent.trim() : '';
          var un = (row.querySelector('.unit-lbl') || {}).textContent || '';
          var ja = fila.findIndex(function(f){ return f.row === row; });
          if (ja >= 0) fila[ja].qtd = num;
          else fila.push({ row: row, nome: nome, qtd: num, un: un.trim() });
          renderFila();
          setStatus('"' + transcript + '" → ' + nome + ' ' + num, '#1a6b3a');
        } else {
          setStatus('Não entendeu: "' + transcript + '"', '#c07000');
        }
      } else {
        interim += r[0].transcript;
      }
    }
    if (interimEl) interimEl.textContent = interim ? interim + '...' : '';
  };

  rec.onerror = function(e) {
    if (e.error === 'no-speech') return;
    setStatus('Erro: ' + e.error, '#c0392b');
    pararVoz();
  };

  rec.onend = function() { if (ativo) { try { rec.start(); } catch(ex){} } };

  function iniciarVoz() {
    ativo = true;
    fila  = [];
    renderFila();
    try { rec.start(); } catch(ex){}
    if (btn) btn.classList.add('voz-ativa');
    setStatus('Ouvindo... fale o produto e a quantidade', '#1a4a7a');
  }

  function pararVoz() {
    ativo = false;
    try { rec.stop(); } catch(ex){}
    if (btn) btn.classList.remove('voz-ativa');
    if (interimEl) interimEl.textContent = '';
    if (fila.length) setStatus(fila.length + ' item(s) aguardando confirmação', '#1a4a7a');
    else setStatus('', '');
  }

  if (btn) {
    btn.style.display = 'flex';
    btn.addEventListener('click', function(){ if (ativo) pararVoz(); else iniciarVoz(); });
  }
}
// ---- FIM VOZ ----

// ---- CONVERSOR DE EMBALAGEM ----
// Unidades suportadas: L, KG, UN
// Se embalagem vem em ml → converte para L (÷1000)
// Se embalagem vem em g  → converte para KG (÷1000)
// Tudo mais trata como UN

function calcConv() {
  var g  = function(id){ var el=document.getElementById(id); return el?el.value.trim():''; };
  var gn = function(id){ return parseFloat(g(id))||0; };

  var qtd   = gn('conv-qtd-cx');   // quantidade comprada (ex: 750)
  var un    = g('conv-un-emb');    // unidade (ex: ml)
  var preco = gn('conv-preco');    // preço pago (ex: 89.90)

  var valorEl   = document.getElementById('conv-valor');
  var formulaEl = document.getElementById('conv-formula');

  var vazio = function(msg) {
    if (valorEl)   { valorEl.textContent = '—'; valorEl.style.color = ''; }
    if (formulaEl) { formulaEl.textContent = msg || ''; formulaEl.style.color = ''; }
    window._convCusto = 0;
  };

  if (!qtd || !un || !preco) { vazio('preencha os campos acima'); return; }

  // Conversão para unidade base
  // Regra: o que o usuário digita é a quantidade NA UNIDADE DA EMBALAGEM
  // Ex: 750 ml → divide por 1000 → 0,75 L → R$89,90 / 0,75 = R$119,87/L
  var uBase, fator, labelBase;
  var u = un.toLowerCase();

  if (u === 'ml') {
    fator = 1000; uBase = 'L'; labelBase = 'L';
  } else if (u === 'l') {
    fator = 1; uBase = 'L'; labelBase = 'L';
  } else if (u === 'g') {
    fator = 1000; uBase = 'KG'; labelBase = 'KG';
  } else if (u === 'kg') {
    fator = 1; uBase = 'KG'; labelBase = 'KG';
  } else {
    fator = 1; uBase = 'UN'; labelBase = 'UN';
  }

  // qtdBase = quantidade convertida para a unidade base
  var qtdBase = qtd / fator;
  if (qtdBase <= 0) { vazio('quantidade inválida'); return; }

  var custo = preco / qtdBase;
  window._convCusto = custo;

  // Exibe resultado
  if (valorEl) {
    valorEl.textContent = 'R$ ' + custo.toFixed(4) + ' / ' + labelBase;
    valorEl.style.color = '#1a6b3a';
  }

  // Fórmula explicada passo a passo
  var formula = '';
  if (fator !== 1) {
    // houve conversão de unidade
    var qtdBaseStr = qtdBase.toFixed(6).replace(/\.?0+$/, '');
    formula = qtd + ' ' + un + ' ÷ ' + fator + ' = ' + qtdBaseStr + ' ' + labelBase
            + '   →   R$ ' + preco.toFixed(2) + ' ÷ ' + qtdBaseStr + ' ' + labelBase
            + ' = R$ ' + custo.toFixed(4) + '/' + labelBase;
  } else {
    formula = 'R$ ' + preco.toFixed(2) + ' ÷ ' + qtd + ' ' + labelBase
            + ' = R$ ' + custo.toFixed(4) + '/' + labelBase;
  }

  if (formulaEl) {
    formulaEl.textContent = formula;
    formulaEl.style.color = '#1a6b3a';
  }
}

function aplicarConv() {
  var el = document.getElementById('new-custo');
  if (el && window._convCusto > 0) {
    el.value = Number(window._convCusto.toFixed(4));
  }
}
// ---- FIM CONVERSOR ----
const BASE_CATS = [
  { cat: "Peixes e Frutos do Mar", emoji: "🐟", items: [
    { nome: "Atum", un: "kg", custo: 72 },
    { nome: "Salmão", un: "kg", custo: 64 },
    { nome: "Salmão barriga", un: "kg", custo: null },
    { nome: "Carapau", un: "kg", custo: 32 },
    { nome: "Pregereba", un: "kg", custo: 36 },
    { nome: "Uni", un: "kg", custo: 78 },
    { nome: "Massago", un: "kg", custo: 126.5 },
    { nome: "Ikura", un: "kg", custo: null },
    { nome: "Vieira", un: "kg", custo: null },
    { nome: "Camarão", un: "kg", custo: 105 },
    { nome: "Panceta", un: "kg", custo: null },
  ]},
  { cat: "Carnes", emoji: "🥩", items: [
    { nome: "Alcatra", un: "kg", custo: null },
    { nome: "Lombo", un: "kg", custo: 26.8 },
    { nome: "Costela", un: "kg", custo: null },
    { nome: "Filé mignon", un: "kg", custo: null },
    { nome: "Filé de frango", un: "kg", custo: null },
    { nome: "Coxão mole", un: "kg", custo: null },
    { nome: "Carne moída", un: "kg", custo: null },
  ]},
  { cat: "Congelados", emoji: "🧊", items: [
    { nome: "Lagarto inteiro", un: "kg", custo: null },
    { nome: "Robalo", un: "kg", custo: null },
    { nome: "Salmão filé rubim", un: "pp", custo: null },
    { nome: "Camarão cinza limpo", un: "kg", custo: null },
    { nome: "Gyoza vegetariana", un: "un", custo: null },
    { nome: "Edamame", un: "kg", custo: null },
    { nome: "Morango", un: "kg", custo: null },
  ]},
  { cat: "Laticínios", emoji: "🧴", items: [
    { nome: "Maionese", un: "L", custo: null },
    { nome: "Cream cheese", un: "kg", custo: 27.45 },
    { nome: "Missô", un: "kg", custo: null },
  ]},
  { cat: "Secos", emoji: "🌾", items: [
    { nome: "Arroz", un: "kg", custo: 3.98 },
    { nome: "Arroz japonês", un: "kg", custo: 11.11 },
    { nome: "Tempurá", un: "kg", custo: 9.23 },
    { nome: "Sal", un: "kg", custo: 18.46 },
    { nome: "Sal grosso", un: "kg", custo: null },
    { nome: "Feijão preto", un: "kg", custo: 5.9 },
    { nome: "Kombu", un: "kg", custo: 180 },
    { nome: "Shitake", un: "kg", custo: 588 },
    { nome: "Açúcar", un: "kg", custo: 3.9 },
    { nome: "Açúcar mascavo", un: "kg", custo: 18.9 },
    { nome: "Wakame", un: "kg", custo: 287.5 },
    { nome: "Togarashi", un: "kg", custo: null },
    { nome: "Gergelim", un: "kg", custo: 29 },
    { nome: "Amido", un: "kg", custo: 7.38 },
    { nome: "Panko", un: "kg", custo: 21.17 },
    { nome: "Katsuobushi", un: "kg", custo: null },
    { nome: "Tarê", un: "L", custo: 25.36 },
    { nome: "Farinha de trigo", un: "kg", custo: 3.98 },
    { nome: "Gengibre", un: "kg", custo: 13.9 },
    { nome: "Gengibre vermelho", un: "kg", custo: 15.36 },
  ]},
  { cat: "Molhos", emoji: "🍶", items: [
    { nome: "Molho ostra", un: "kg", custo: 39.8 },
    { nome: "Sriracha", un: "kg", custo: 43.95 },
    { nome: "Ponzu", un: "kg", custo: null },
    { nome: "Óleo de gergelim", un: "L", custo: null },
    { nome: "Molho de soja", un: "L", custo: null },
    { nome: "Shoyu", un: "L", custo: 12.73 },
    { nome: "Vinagre", un: "L", custo: null },
    { nome: "Missô", un: "kg", custo: null },
    { nome: "Flor de sal", un: "kg", custo: null },
    { nome: "Nori", un: "pct", custo: null },
  ]},
  { cat: "Alcóolicos", emoji: "🍾", items: [
    { nome: "Sake seco", un: "L", custo: null },
    { nome: "Sake licoroso", un: "L", custo: null },
  ]},
  { cat: "Limpeza e Higiene", emoji: "🧹", items: [
    { nome: "Esponja", un: "un", custo: 0 },
    { nome: "Esponja aço", un: "un", custo: 2.95 },
    { nome: "Ultra branqueador", un: "L", custo: null },
    { nome: "Desinfetante", un: "L", custo: null },
    { nome: "Álcool", un: "L", custo: 9.35 },
  ]},
];

function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

function buildCatalog(extras) {
  var cats = deepClone(BASE_CATS);
  (extras || []).forEach(function(extra) {
    var cat = cats.find(function(c) { return c.cat === extra.cat; });
    if (!cat) { cat = { cat: extra.cat, emoji: extra.emoji || "📦", items: [] }; cats.push(cat); }
    (extra.items || []).forEach(function(item) {
      if (!cat.items.find(function(i) { return i.nome === item.nome; })) cat.items.push(item);
    });
    if (extra.remove) extra.remove.forEach(function(nome) {
      cat.items = cat.items.filter(function(i) { return i.nome !== nome; });
    });
  });
  // ordena itens de cada categoria alfabeticamente
  cats.forEach(function(cat) {
    cat.items.sort(function(a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
  });
  return cats;
}

function brl(v) {
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Função global — chamada pelo oninput dos inputs de estoque e custo
// Lê os inputs da própria linha e multiplica. Simples.
function calcLinha(inp) {
  var row = inp.closest('.item-row');
  if (!row) return;
  var ins = row.querySelectorAll('input[type=number]');
  // ins[0]=estoque, ins[1]=pedir, ins[2]=custo
  var est   = parseFloat(ins[0] ? ins[0].value : 0) || 0;
  var custo = parseFloat(ins[2] ? ins[2].value : 0) || 0;
  var tot   = est * custo;

  var totEl = row.querySelector('.total-cell');
  if (totEl) {
    totEl.textContent = tot > 0 ? brl(tot) : '—';
    totEl.classList.toggle('has-val', tot > 0);
  }

  // subtotal da categoria
  var block = row.closest('.cat-block');
  if (block) {
    var sub = 0;
    block.querySelectorAll('.item-row').forEach(function(r) {
      var i = r.querySelectorAll('input[type=number]');
      var e = parseFloat(i[0] ? i[0].value : 0) || 0;
      var c = parseFloat(i[2] ? i[2].value : 0) || 0;
      sub += e * c;
    });
    var subEl = block.querySelector('.cat-subtotal');
    if (subEl) subEl.textContent = sub > 0 ? brl(sub) : '';
  }
}


// Funções globais de atualização de estado — chamadas pelos inputs via data-nome
function atualizarMin(inp) {
  var n = inp.dataset.nome;
  if (!n) return;
  if (inp.value === '') delete window._MIN_[n]; else window._MIN_[n] = inp.value;
  window._save_();
}
function atualizarEst(inp) {
  var n = inp.dataset.nome;
  if (!n) return;
  var anterior = window._EST_[n] || 0;
  var novo     = inp.value === '' ? 0 : inp.value;
  // registra movimentação se mudou
  if (typeof registrarMovimentacao === 'function' && parseFloat(anterior) !== parseFloat(novo)) {
    var un = inp.closest('.inp-cell') ? (inp.closest('.inp-cell').querySelector('.unit-lbl') || {}).textContent || '' : '';
    registrarMovimentacao(n, un.trim(), anterior, novo);
  }
  if (inp.value === '') delete window._EST_[n]; else window._EST_[n] = inp.value;
  window._save_();
}
function atualizarPed(inp) {
  var n = inp.dataset.nome;
  if (!n) return;
  if (inp.value === '') delete window._PED_[n]; else window._PED_[n] = inp.value;
  window._save_();
}
function atualizarCusto(inp) {
  var n = inp.dataset.nome;
  if (!n) return;
  if (inp.value === '') delete window._CUSTO_[n]; else window._CUSTO_[n] = inp.value;
  window._save_();
}


// Renderiza os gráficos do dashboard — chamada após dados estarem prontos e canvas visível
// --- SAÍDA DE ESTOQUE ---
function abrirSaida(nome, un) {
  // fecha qualquer painel aberto
  document.querySelectorAll('.saida-panel').forEach(function(p){ p.remove(); });

  // acha a row pelo nome
  var rows = document.querySelectorAll('.item-row');
  var targetRow = null;
  rows.forEach(function(r){
    var n = r.querySelector('.item-name');
    if (n && n.textContent.trim() === nome) targetRow = r;
  });
  if (!targetRow) return;

  var estAtual = parseFloat(window._EST_[nome]) || 0;

  var panel = document.createElement('div');
  panel.className = 'saida-panel';
  panel.innerHTML =
    '<div class="saida-title">Registrar saída — <strong>' + nome + '</strong></div>' +
    '<div class="saida-row">' +
      '<div class="saida-info">Estoque atual: <strong>' + estAtual + ' ' + un + '</strong></div>' +
    '</div>' +
    '<div class="saida-row">' +
      '<input class="saida-inp" id="saida-qtd" type="number" min="0" step="0.1" placeholder="Quanto saiu?" autofocus/>' +
      '<span class="saida-un">' + un + '</span>' +
    '</div>' +
    '<div class="saida-actions">' +
      '<button class="saida-btn-ok" data-nome="' + nome.replace(/"/g,'&quot;') + '" data-un="' + un + '" onclick="confirmarSaidaBtn(this)">✓ Confirmar saída</button>' +
      '<button class="saida-btn-cancel" onclick="fecharSaida()">Cancelar</button>' +
    '</div>';

  targetRow.after(panel);
  setTimeout(function(){ var el=document.getElementById('saida-qtd'); if(el) el.focus(); }, 80);
}

function fecharSaida() {
  document.querySelectorAll('.saida-panel').forEach(function(p){ p.remove(); });
}

function confirmarSaidaBtn(btn) {
  var nome = btn.dataset.nome;
  var un   = btn.dataset.un;
  confirmarSaida(nome, un);
}

function confirmarSaida(nome, un) {
  var inp = document.getElementById('saida-qtd');
  if (!inp) return;
  var qtd = parseFloat(inp.value);
  if (!qtd || qtd <= 0) { inp.style.borderColor='#e8742a'; inp.focus(); return; }

  var estAtual = parseFloat(window._EST_[nome]) || 0;
  var novo = Math.max(0, Math.round((estAtual - qtd) * 1000) / 1000);

  // Atualiza estado interno
  window._EST_[nome] = String(novo);
  window._save_();

  // Registra no histórico
  if (typeof registrarMovimentacao === 'function') {
    registrarMovimentacao(nome, un, estAtual, novo);
  }

  // Fecha painel e re-renderiza
  document.querySelectorAll('.saida-panel').forEach(function(p){ p.remove(); });
  window.render();

  // Toast de confirmação
  var toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = '− ' + qtd + ' ' + un + ' de ' + nome + ' registrado';
    toast.classList.add('show');
    setTimeout(function(){ toast.classList.remove('show'); }, 3000);
  }
}

function desenharGraficos() {
  if (!window.Chart) {
    // Chart.js ainda não carregou — tenta de novo em 300ms
    setTimeout(desenharGraficos, 300);
    return;
  }
  var cd = window._chartData;
  if (!cd) return;

  requestAnimationFrame(function() {
    // Gráfico 1: valor por categoria
    var ctxCats = document.getElementById('chart-cats');
    if (ctxCats && cd.catData && cd.catData.length) {
      if (ctxCats._ci) { try { ctxCats._ci.destroy(); } catch(e){} }
      ctxCats.style.display = 'block';
      ctxCats._ci = new Chart(ctxCats, {
        type: 'bar',
        data: {
          labels: cd.catData.map(function(c){ return c.cat; }),
          datasets: [{
            data: cd.catData.map(function(c){ return Math.round(c.sub * 100) / 100; }),
            backgroundColor: '#1a3a2a',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { ticks: { callback: function(v){ return 'R$ ' + v.toLocaleString('pt-BR'); } } },
            x: { ticks: { maxRotation: 30, font: { size: 10 } } }
          }
        }
      });
    }

    // Gráfico 2: top 10 itens por valor
    var ctxTop = document.getElementById('chart-top');
    if (ctxTop && cd.catData) {
      var todas = [];
      cd.catData.forEach(function(c){ c.linhas.forEach(function(l){ todas.push(l); }); });
      todas.sort(function(a, b){ return b.tot - a.tot; });
      var top = todas.slice(0, 10);
      if (top.length) {
        if (ctxTop._ci) { try { ctxTop._ci.destroy(); } catch(e){} }
        ctxTop.style.display = 'block';
        ctxTop._ci = new Chart(ctxTop, {
          type: 'bar',
          data: {
            labels: top.map(function(i){ return i.nome; }),
            datasets: [{
              data: top.map(function(i){ return Math.round(i.tot * 100) / 100; }),
              backgroundColor: '#2D6A4F',
              borderRadius: 6
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { callback: function(v){ return 'R$ ' + v.toLocaleString('pt-BR'); } } },
              y: { ticks: { font: { size: 11 } } }
            }
          }
        });
      }
    }
  });
}


function initApp(config) {
  var restaurante = config.restaurante;
  var CATS = config.catalogo;
  var STORE_KEY = 'ped_' + restaurante.toLowerCase().replace(/[^a-z0-9]/g, '_');

  // estado interno — fonte da verdade
  var _EST = {}, _PED = {}, _CUSTO = {}, _MIN = {}, _DELETADOS = {}, _CATS_CUSTOM = [];

  function saveLocal() {
    var data = { est: _EST, ped: _PED, custo: _CUSTO, min: _MIN, del: _DELETADOS, cats: _CATS_CUSTOM };
    // salva local
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch(e) {}
    // salva no Firebase (sincroniza com outros dispositivos)
    if (typeof salvarFirebase === 'function') salvarFirebase(data);
    // atualiza status
    var el = document.getElementById('sync-status');
    if (el) { el.textContent = 'salvando...'; el.className = 'sync-saving'; }
  }

  function aplicarDados(raw) {
    if (!raw) return;
    if (raw.est !== undefined || raw.ped !== undefined || raw.custo !== undefined || raw.cats !== undefined) {
      _EST         = raw.est   || {};
      _PED         = raw.ped   || {};
      _CUSTO       = raw.custo || {};
      _MIN         = raw.min   || {};
      _DELETADOS   = raw.del   || {};
      _CATS_CUSTOM = raw.cats  || [];
      window._EST_         = _EST;
      window._PED_         = _PED;
      window._CUSTO_       = _CUSTO;
      window._MIN_         = _MIN;
      window._CATS_CUSTOM_ = _CATS_CUSTOM;
      _CATS_CUSTOM.forEach(function(cc) {
        var cat = CATS.find(function(c) { return c.cat === cc.cat; });
        if (!cat) { cat = { cat: cc.cat, emoji: cc.emoji || '📦', items: [] }; CATS.push(cat); }
        (cc.items || []).forEach(function(item) {
          if (!cat.items.find(function(i) { return i.nome === item.nome; })) cat.items.push(item);
        });
      });
    } else {
      Object.keys(raw).forEach(function(k) {
        if (raw[k] && typeof raw[k] === 'object' && !Array.isArray(raw[k])) {
          if (raw[k].est   !== undefined && raw[k].est   !== '') _EST[k]   = raw[k].est;
          if (raw[k].ped   !== undefined && raw[k].ped   !== '') _PED[k]   = raw[k].ped;
          if (raw[k].custo !== undefined && raw[k].custo !== '') _CUSTO[k] = raw[k].custo;
        }
      });
    }
  }

  function loadLocal() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
      aplicarDados(raw);
    } catch(e) {}
  }

  loadLocal(); // popula _EST/_PED/_CUSTO do localStorage
  // expõe objetos internos globalmente para os oninputs inline
  window._EST_         = _EST;
  window._PED_         = _PED;
  window._CUSTO_       = _CUSTO;
  window._CATS_CUSTOM_ = _CATS_CUSTOM;
  window._MIN_ = _MIN;
  window._save_        = saveLocal;
  window.saveLocal_ = saveLocal;

  window.switchTab = function(t) {
    document.querySelectorAll('.tab').forEach(function(el) {
      el.classList.toggle('active', el.dataset.tab === t);
    });
    document.querySelectorAll('.section').forEach(function(el) { el.classList.remove('active'); });
    document.getElementById('tab-' + t).classList.add('active');
    if (t === 'adicionar') populateCatSelect();
    if (t === 'resumo') { renderResumo(); setTimeout(desenharGraficos, 100); }
    if (t === 'historico') renderHistorico();
  };

  function populateCatSelect() {
    var s = document.getElementById('new-cat');
    if (s) s.innerHTML = CATS.map(function(c) {
      return '<option value="' + c.cat + '">' + c.emoji + ' ' + c.cat + '</option>';
    }).join('');
  }

  window.adicionarProduto = function() {
    var nome = document.getElementById('new-nome').value.trim();
    var custom = document.getElementById('new-cat-custom').value.trim();
    var catNome = custom || document.getElementById('new-cat').value;
    var emoji = custom ? (document.getElementById('new-emoji').value || '📦') : '';
    var un = document.getElementById('new-un').value;
    var custoVal = document.getElementById('new-custo').value;
    if (!nome) { alert('Informe o nome do produto.'); return; }
    var cat = CATS.find(function(c) { return c.cat === catNome; });
    if (!cat) { cat = { cat: catNome, emoji: emoji, items: [] }; CATS.push(cat); }
    if (cat.items.find(function(i) { return i.nome === nome; })) { alert('Produto já existe.'); return; }
    cat.items.push({ nome: nome, un: un, custo: custoVal !== '' ? parseFloat(custoVal) : null });

    // salva estoque inicial e custo nos objetos internos
    var qtdInicial = document.getElementById('new-qtd') ? document.getElementById('new-qtd').value : '';
    if (qtdInicial !== '') _EST[nome]   = qtdInicial;
    if (custoVal   !== '') _CUSTO[nome] = custoVal;
    var minVal = document.getElementById('new-min') ? document.getElementById('new-min').value : '';
    if (minVal !== '') _MIN[nome] = minVal;
    // persiste categoria e item em _CATS_CUSTOM para sobreviver ao reload
    var ccExist = _CATS_CUSTOM.find(function(c) { return c.cat === catNome; });
    if (!ccExist) {
      ccExist = { cat: catNome, emoji: emoji || cat.emoji || '📦', items: [] };
      _CATS_CUSTOM.push(ccExist);
    }
    if (!ccExist.items.find(function(i) { return i.nome === nome; })) {
      ccExist.items.push({ nome: nome, un: un, custo: custoVal !== '' ? parseFloat(custoVal) : null });
    }
    saveLocal();

    ['new-nome','new-qtd','new-custo','new-min','new-cat-custom'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    document.getElementById('new-emoji') && (document.getElementById('new-emoji').value = '');
    window.switchTab('pedido');
    window.render();
  };

  window.removerItem = function(catNome, nome) {
    var cat = CATS.find(function(c) { return c.cat === catNome; });
    if (cat) cat.items = cat.items.filter(function(i) { return i.nome !== nome; });
    // persiste a deleção — chave = "cat||nome"
    _DELETADOS[catNome + '||' + nome] = 1;
    // limpa dados do item deletado
    delete _EST[nome]; delete _PED[nome]; delete _CUSTO[nome];
    // remove de _CATS_CUSTOM também para não reaparecer no reload
    var ccCat = _CATS_CUSTOM.find(function(c) { return c.cat === catNome; });
    if (ccCat) ccCat.items = ccCat.items.filter(function(i) { return i.nome !== nome; });
    saveLocal();
    window.render();
  };

  window.editarItem = function(catNome, nomeAtual) {
    // fecha qualquer edição aberta
    document.querySelectorAll('.edit-panel').forEach(function(p){ p.remove(); });

    var cat = CATS.find(function(c){ return c.cat === catNome; });
    if (!cat) return;
    var item = cat.items.find(function(i){ return i.nome === nomeAtual; });
    if (!item) return;

    // encontra a row do item no DOM
    var rows = document.querySelectorAll('.item-row');
    var targetRow = null;
    rows.forEach(function(r){
      var n = r.querySelector('.item-name');
      if (n && n.textContent.trim() === nomeAtual) targetRow = r;
    });
    if (!targetRow) return;

    var panel = document.createElement('div');
    panel.className = 'edit-panel';
    panel.innerHTML =
      '<div class="edit-panel-title">Editar produto</div>' +
      '<div class="edit-grid">' +
        '<div class="field">' +
          '<label>Nome</label>' +
          '<input type="text" id="edit-nome" value="' + item.nome.replace(/"/g,'&quot;') + '"/>' +
        '</div>' +
        '<div class="field">' +
          '<label>Unidade</label>' +
          '<select id="edit-un">' +
            ['kg','L','un','pct','pp','cx','ml','g'].map(function(u){
              return '<option' + (u === item.un ? ' selected' : '') + '>' + u + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label>Custo R$/un</label>' +
          '<input type="number" id="edit-custo" min="0" step="0.0001" value="' + (item.custo || '') + '"/>' +
        '</div>' +
        '<div class="field">' +
          '<label>Categoria</label>' +
          '<select id="edit-cat">' +
            CATS.map(function(c){
              return '<option value="' + c.cat.replace(/"/g,'&quot;') + '"' + (c.cat === catNome ? ' selected' : '') + '>' + c.emoji + ' ' + c.cat + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="edit-actions">' +
        '<button class="edit-btn-save" onclick="salvarEdicao(\'' + catNome.replace(/'/g,"\\'") + '\',\'' + nomeAtual.replace(/'/g,"\\'") + '\')">✓ Salvar</button>' +
        '<button class="edit-btn-cancel" onclick="cancelarEdicao()">Cancelar</button>' +
      '</div>';

    targetRow.after(panel);
    document.getElementById('edit-nome').focus();
  };

  window.salvarEdicao = function(catNomeAntigo, nomeAntigo) {
    var novoNome  = (document.getElementById('edit-nome').value || '').trim();
    var novaUn    = document.getElementById('edit-un').value;
    var novoCusto = document.getElementById('edit-custo').value;
    var novaCat   = document.getElementById('edit-cat').value;

    if (!novoNome) { alert('Informe o nome.'); return; }

    // verifica duplicado (ignora o próprio item)
    var nomeNorm = novoNome.toLowerCase();
    var dup = null;
    CATS.forEach(function(c){
      c.items.forEach(function(i){
        if (i.nome.toLowerCase() === nomeNorm && i.nome !== nomeAntigo) dup = c.cat;
      });
    });
    if (dup) { alert('Produto "' + novoNome + '" já existe em "' + dup + '".'); return; }

    // recupera dados do item antigo dos objetos internos
    var sv = { est: _EST[nomeAntigo], ped: _PED[nomeAntigo], custo: _CUSTO[nomeAntigo] };

    // remove da categoria antiga
    var catAntiga = CATS.find(function(c){ return c.cat === catNomeAntigo; });
    if (catAntiga) catAntiga.items = catAntiga.items.filter(function(i){ return i.nome !== nomeAntigo; });

    // adiciona na categoria nova (ou mesma) com dados atualizados
    var catNova = CATS.find(function(c){ return c.cat === novaCat; });
    if (!catNova) { catNova = { cat: novaCat, emoji: '📦', items: [] }; CATS.push(catNova); }
    catNova.items.push({
      nome:  novoNome,
      un:    novaUn,
      custo: novoCusto !== '' ? parseFloat(novoCusto) : null
    });

    // migra dados internos para o novo nome
    if (novoNome !== nomeAntigo) {
      if (_EST[nomeAntigo]   !== undefined) { _EST[novoNome]   = _EST[nomeAntigo];   delete _EST[nomeAntigo]; }
      if (_PED[nomeAntigo]   !== undefined) { _PED[novoNome]   = _PED[nomeAntigo];   delete _PED[nomeAntigo]; }
      if (_CUSTO[nomeAntigo] !== undefined) { _CUSTO[novoNome] = _CUSTO[nomeAntigo]; delete _CUSTO[nomeAntigo]; }
      try { localStorage.setItem(STORE_KEY, JSON.stringify({ est: _EST, ped: _PED, custo: _CUSTO })); } catch(e){}
    }

    document.querySelectorAll('.edit-panel').forEach(function(p){ p.remove(); });
    window.render();
  };

  window.cancelarEdicao = function() {
    document.querySelectorAll('.edit-panel').forEach(function(p){ p.remove(); });
  };

  window.limpar = function() {
    document.querySelectorAll('.ped-inp').forEach(function(el) { el.value = ''; });
    saveLocal();
  };

  window.render = function() {
    var fl = (document.getElementById('search').value || '').toLowerCase();
    var container = document.getElementById('lista');
    if (!container) return;
    container.innerHTML = '';

    CATS.forEach(function(cat) {
      var items = cat.items.filter(function(i) {
        // esconde itens deletados
        if (_DELETADOS[cat.cat + '||' + i.nome]) return false;
        return !fl || i.nome.toLowerCase().includes(fl) || cat.cat.toLowerCase().includes(fl);
      });
      // ordena alfabeticamente
      items.sort(function(a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); });
      if (!items.length) return;

      var b = document.createElement('div');
      b.className = 'cat-block';
      b.innerHTML =
        '<div class="cat-title">' +
          '<div class="cat-title-left"><span class="cat-emoji">' + cat.emoji + '</span>' + cat.cat + '</div>' +
          '<span class="cat-subtotal"></span>' +
        '</div>' +
        '<div class="col-heads">' +
          '<div class="col-head col-left">produto</div>' +
          '<div class="col-head">estoque</div>' +
          '<div class="col-head">pedir</div>' +
          '<div class="col-head col-custo">custo/un</div>' +
          '<div class="col-head">total</div>' +
          '<div class="col-head col-min">mínimo</div>' +
          '<div class="col-head" style="color:#c05000">saída</div>' +
          '<div></div>' +
        '</div>';

      items.forEach(function(item) {
        var estV   = _EST[item.nome]   !== undefined ? _EST[item.nome]   : '';
        var pedV   = _PED[item.nome]   !== undefined ? _PED[item.nome]   : '';
        var custoV = _CUSTO[item.nome] !== undefined && _CUSTO[item.nome] !== ''
          ? _CUSTO[item.nome]
          : (item.custo !== null && item.custo !== undefined ? item.custo : '');

        // calcula total já na renderização
        var est  = parseFloat(estV)   || 0;
        var cst  = parseFloat(custoV) || 0;
        var tot  = est * cst;

        var cn = cat.cat.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        var nn = item.nome.replace(/\\/g,'\\\\').replace(/'/g,"\\'");

        var minV = _MIN[item.nome] !== undefined ? _MIN[item.nome] : '';
        var estNum = parseFloat(estV) || 0;
        var minNum = parseFloat(minV) || 0;
        var alertClass = (minV !== '' && estNum < minNum) ? 'alert-min' : '';

        var row = document.createElement('div');
        row.className = 'item-row' + (alertClass ? ' row-alert' : '');
        row.innerHTML =
          '<div class="item-name">' + item.nome + '</div>' +
          '<div class="item-inputs">' +
            '<div class="inp-group">' +
              '<span class="inp-label">estoque</span>' +
              '<div class="inp-cell">' +
                '<input class="est-inp" type="number" min="0" step="0.1" placeholder="—" value="' + estV + '" data-nome="' + nn + '" oninput="atualizarEst(this);calcLinha(this);">' +
                '<span class="unit-lbl">' + item.un + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="inp-group">' +
              '<span class="inp-label">pedir</span>' +
              '<div class="inp-cell">' +
                '<input class="ped-inp" type="number" min="0" step="0.5" placeholder="0" value="' + pedV + '" data-nome="' + nn + '" oninput="atualizarPed(this);">' +
                '<span class="unit-lbl">' + item.un + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="inp-group">' +
              '<span class="inp-label blue">custo/un</span>' +
              '<div class="inp-cell">' +
                '<input class="custo-inp" type="number" min="0" step="0.01" placeholder="—" value="' + custoV + '" data-nome="' + nn + '" oninput="atualizarCusto(this);calcLinha(this);">' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="total-row">' +
            '<span class="total-label">total em estoque</span>' +
            '<span class="total-cell ' + (tot > 0 ? 'has-val' : '') + '">' + (tot > 0 ? brl(tot) : '—') + '</span>' +
          '</div>' +
          '<div class="min-cell ' + alertClass + '">' +
            '<input class="min-inp" type="number" min="0" step="0.1" placeholder="—" value="' + minV + '" data-nome="' + nn + '" oninput="atualizarMin(this);">' +
            (alertClass ? '<span class="min-alert-dot" title="Abaixo do mínimo!">!</span>' : '') +
          '</div>' +
          '<button class="btn-saida" onclick="abrirSaida(\'' + nn + '\',\'' + item.un + '\')" title="Registrar saída">−</button>' +
          '<div class="item-btns">' +
          '<button class="btn-edit" onclick="editarItem(\'' + cn + '\',\'' + nn + '\')">✎</button>' +
          '<button class="btn-del"  onclick="removerItem(\'' + cn + '\',\'' + nn + '\')">✕</button>' +
        '</div>' +
        '<button class="btn-saida-full" onclick="abrirSaida(\'' + nn + '\',\'' + item.un + '\')">' +
          '− Registrar saída' +
        '</button>';
        b.appendChild(row);
      });

      // calcula subtotal do bloco após inserir as linhas
      var sub = 0;
      b.querySelectorAll('.item-row').forEach(function(r) {
        var ins = r.querySelectorAll('input[type=number]');
        var e = parseFloat(ins[0] ? ins[0].value : 0) || 0;
        var c = parseFloat(ins[2] ? ins[2].value : 0) || 0;
        sub += e * c;
      });
      var subEl = b.querySelector('.cat-subtotal');
      if (subEl) subEl.textContent = sub > 0 ? brl(sub) : '';

      container.appendChild(b);
    });
  };

  window.renderResumo = function() {
    // --- ALERTAS DE ESTOQUE MÍNIMO ---
    var alertasEl = document.getElementById('resumo-alertas');
    if (alertasEl) {
      var alertas = [];
      CATS.forEach(function(cat) {
        cat.items.forEach(function(i) {
          if (_DELETADOS[cat.cat + '||' + i.nome]) return;
          var est = parseFloat(_EST[i.nome]) || 0;
          var min = parseFloat(_MIN[i.nome]);
          if (!isNaN(min) && min > 0 && est < min) {
            alertas.push({ nome: i.nome, est: est, min: min, un: i.un, cat: cat.cat });
          }
        });
      });
      if (!alertas.length) {
        alertasEl.innerHTML = '<div class="alerta-ok">✓ Todos os itens acima do estoque mínimo</div>';
      } else {
        alertasEl.innerHTML = alertas.map(function(a) {
          var pct = Math.round((a.est / a.min) * 100);
          return '<div class="alerta-item">' +
            '<div class="alerta-info">' +
              '<span class="alerta-nome">' + a.nome + '</span>' +
              '<span class="alerta-cat">' + a.cat + '</span>' +
            '</div>' +
            '<div class="alerta-nums">' +
              '<span class="alerta-est">' + a.est + a.un + '</span>' +
              '<span class="alerta-sep">de</span>' +
              '<span class="alerta-min">' + a.min + a.un + '</span>' +
            '</div>' +
            '<div class="alerta-bar-wrap"><div class="alerta-bar" style="width:' + Math.min(pct,100) + '%"></div></div>' +
          '</div>';
        }).join('');
      }
    }


    var totalGeral = 0, totalItens = 0, catData = [];
    document.querySelectorAll('.cat-block').forEach(function(block) {
      var catTitleEl = block.querySelector('.cat-title-left');
      var emojiEl = catTitleEl && catTitleEl.querySelector('.cat-emoji');
      var emoji = emojiEl ? emojiEl.textContent : '';
      var catNome = catTitleEl ? catTitleEl.textContent.replace(emoji, '').trim() : '';
      var sub = 0, linhas = [];
      block.querySelectorAll('.item-row').forEach(function(row) {
        var nomeEl = row.querySelector('.item-name');
        var ins = row.querySelectorAll('input[type=number]');
        var e = parseFloat(ins[0] ? ins[0].value : 0) || 0;
        var c = parseFloat(ins[2] ? ins[2].value : 0) || 0;
        var tot = e * c;
        if (tot > 0) {
          sub += tot; totalGeral += tot; totalItens++;
          var un = (row.querySelector('.unit-lbl') || {}).textContent || '';
          linhas.push({ nome: (nomeEl || {}).textContent || '', est: e, un: un, c: c, tot: tot });
        }
      });
      if (sub > 0) catData.push({ cat: catNome, emoji: emoji, sub: sub, linhas: linhas });
    });

    // --- GRÁFICOS ---
    // guarda dados para renderizar depois que o canvas estiver visível
    window._chartData = { catData: catData };
    desenharGraficos();

    document.getElementById('resumo-geral').innerHTML =
      '<div class="resumo-card"><div class="resumo-label">Valor total em estoque</div><div class="resumo-val resumo-total">' + brl(totalGeral) + '</div></div>' +
      '<div class="resumo-card"><div class="resumo-label">Itens precificados</div><div class="resumo-val">' + totalItens + '</div></div>';

    var rc = document.getElementById('resumo-cats');
    rc.innerHTML = '';
    if (!catData.length) { rc.innerHTML = '<p class="resumo-empty">Nenhum item com custo e estoque preenchidos ainda.</p>'; return; }
    catData.forEach(function(cd) {
      var div = document.createElement('div');
      div.className = 'resumo-cat-block';
      div.innerHTML = '<div class="cat-title"><div class="cat-title-left"><span class="cat-emoji">' + cd.emoji + '</span>' + cd.cat + '</div><span class="resumo-cat-total">' + brl(cd.sub) + '</span></div>';
      cd.linhas.forEach(function(l) {
        var row = document.createElement('div');
        row.className = 'resumo-row';
        row.innerHTML = '<span class="resumo-nome">' + l.nome + '</span><span class="resumo-calc">' + l.est + l.un + ' × ' + brl(l.c) + '</span><span class="resumo-tot">' + brl(l.tot) + '</span>';
        div.appendChild(row);
      });
      rc.appendChild(div);
    });
  };

  window.exportar = function() {
    var linhasPorCat = {};
    document.querySelectorAll('.item-row').forEach(function(row) {
      var nomeEl = row.querySelector('.item-name');
      var ins = row.querySelectorAll('input[type=number]');
      if (!nomeEl || ins.length < 2) return;
      var pedNum = parseFloat(ins[1].value);
      if (!ins[1].value.trim() || isNaN(pedNum) || pedNum <= 0) return;

      var block = row.closest('.cat-block');
      var titleLeft = block && block.querySelector('.cat-title-left');
      var emojiEl = titleLeft && titleLeft.querySelector('.cat-emoji');
      var emoji = emojiEl ? emojiEl.textContent.trim() : '';
      var catNome = titleLeft ? titleLeft.textContent.replace(emoji, '').trim() : '';
      var un = (row.querySelector('.unit-lbl') || {}).textContent || '';
      var estStr = ins[0].value ? parseFloat(ins[0].value) + un : '—';
      var custoStr = ins[2] && ins[2].value ? ' | R$' + parseFloat(ins[2].value).toFixed(2) + '/' + un : '';

      if (!linhasPorCat[catNome]) linhasPorCat[catNome] = { emoji: emoji, linhas: [] };
      linhasPorCat[catNome].linhas.push(nomeEl.textContent.trim() + ' ' + estStr + ' / ' + pedNum + un + custoStr);
    });

    if (!Object.keys(linhasPorCat).length) { alert('Preencha ao menos um item na coluna "Pedir".'); return; }

    var msg = '*PEDIDO — ' + restaurante.toUpperCase() + '*\n_' + new Date().toLocaleDateString('pt-BR') + '_\n';
    Object.keys(linhasPorCat).forEach(function(cat) {
      var d = linhasPorCat[cat];
      msg += '\n' + d.emoji + ' *' + cat.toUpperCase() + '*\n';
      d.linhas.forEach(function(l) { msg += l + '\n'; });
    });

    function copy(txt) {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(txt);
      var ta = document.createElement('textarea'); ta.value = txt;
      ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta);
      ta.select(); try { document.execCommand('copy'); } catch(e) {}
      document.body.removeChild(ta); return Promise.resolve();
    }
    copy(msg).then(function() {
      var el = document.getElementById('toast');
      el.classList.add('show'); setTimeout(function() { el.classList.remove('show'); }, 3000);
    });
  };


  window.exportarExcel = function() {
    var rows = [['Categoria','Produto','Estoque','Unidade','Custo/un (R$)','Total (R$)']];
    var totalGeral = 0;

    document.querySelectorAll('.cat-block').forEach(function(block) {
      var catTitleEl = block.querySelector('.cat-title-left');
      var emojiEl = catTitleEl && catTitleEl.querySelector('.cat-emoji');
      var emoji = emojiEl ? emojiEl.textContent : '';
      var catNome = catTitleEl ? catTitleEl.textContent.replace(emoji,'').trim() : '';

      block.querySelectorAll('.item-row').forEach(function(row) {
        var nomeEl = row.querySelector('.item-name');
        var ins = row.querySelectorAll('input[type=number]');
        if (!nomeEl || ins.length < 3) return;
        var nome  = nomeEl.textContent.trim();
        var est   = parseFloat(ins[0].value) || 0;
        var ped   = parseFloat(ins[1].value) || 0;
        var custo = parseFloat(ins[2].value) || 0;
        var tot   = est * custo;
        var un    = (row.querySelector('.unit-lbl') || {}).textContent || '';
        totalGeral += tot;
        rows.push([catNome, nome, est, un, custo || '', tot || '']);
      });
    });

    // linha de total
    rows.push(['','','','','TOTAL GERAL', totalGeral]);

    // gera CSV com BOM para Excel abrir com acentos
    var BOM = '﻿';
    var csv = BOM + rows.map(function(r) {
      return r.map(function(c) {
        var s = String(c).replace(/"/g, '""');
        return '"' + s + '"';
      }).join(';');
    }).join('\n');

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    var data = new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');
    a.href     = url;
    a.download = 'inventario_' + restaurante.replace(/\s+/g,'_') + '_' + data + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  window.renderHistorico = function() {
    var cont = document.getElementById('tab-historico');
    if (!cont) return;
    cont.innerHTML = '<div class="hist-loading">Carregando histórico...</div>';

    if (typeof carregarHistorico !== 'function') {
      cont.innerHTML = '<p class="resumo-empty">Firebase não conectado. Histórico disponível após sincronização.</p>';
      return;
    }

    var dias = parseInt((document.getElementById('hist-dias') || {}).value || 7);

    carregarHistorico(dias, function(movs) {
      if (!movs.length) {
        cont.innerHTML = '<div class="hist-filtros">' + renderFiltros(dias) + '</div><p class="resumo-empty">Nenhuma movimentação nos últimos ' + dias + ' dias.</p>';
        return;
      }

      // Agrupa por produto para o gráfico
      var porProduto = {};
      movs.forEach(function(m) {
        if (!porProduto[m.produto]) porProduto[m.produto] = [];
        porProduto[m.produto].push(m);
      });

      // Top produtos por número de movimentações
      var topProd = Object.keys(porProduto).sort(function(a,b){
        return porProduto[b].length - porProduto[a].length;
      }).slice(0, 8);

      // Monta HTML
      var html = '<div class="hist-filtros">' + renderFiltros(dias) + '</div>';

      // Cards resumo
      var entradas = movs.filter(function(m){ return m.tipo === 'entrada'; }).length;
      var saidas   = movs.filter(function(m){ return m.tipo === 'saida'; }).length;
      html += '<div class="resumo-cards" style="margin-bottom:1rem;">' +
        '<div class="resumo-card"><div class="resumo-label">Movimentações</div><div class="resumo-val">' + movs.length + '</div></div>' +
        '<div class="resumo-card"><div class="resumo-label">Entradas / Saídas</div><div class="resumo-val"><span style="color:#1a6b3a">+' + entradas + '</span> / <span style="color:#c0392b">-' + saidas + '</span></div></div>' +
      '</div>';

      // Gráfico de barras por produto
      html += '<div class="dashboard-section"><div class="dash-title">Movimentações por produto (últimos ' + dias + ' dias)</div><canvas id="chart-hist" height="220"></canvas></div>';

      // Tabela
      html += '<div class="dashboard-section"><div class="dash-title">Registro de movimentações</div>' +
        '<div class="hist-table-wrap"><table class="hist-table">' +
        '<thead><tr><th>Data</th><th>Hora</th><th>Produto</th><th>Anterior</th><th>Novo</th><th>Diferença</th></tr></thead><tbody>' +
        movs.slice(0, 100).map(function(m) {
          var cls = m.tipo === 'entrada' ? 'hist-entrada' : 'hist-saida';
          var sinal = m.diff > 0 ? '+' : '';
          return '<tr class="' + cls + '">' +
            '<td>' + m.data + '</td>' +
            '<td>' + m.hora + '</td>' +
            '<td class="hist-prod">' + m.produto + '</td>' +
            '<td>' + m.anterior + (m.unidade ? ' ' + m.unidade : '') + '</td>' +
            '<td>' + m.novo + (m.unidade ? ' ' + m.unidade : '') + '</td>' +
            '<td class="hist-diff">' + sinal + m.diff + (m.unidade ? ' ' + m.unidade : '') + '</td>' +
          '</tr>';
        }).join('') +
        '</tbody></table></div></div>';

      cont.innerHTML = html;

      // Desenha gráfico
      setTimeout(function() {
        var ctx = document.getElementById('chart-hist');
        if (ctx && window.Chart) {
          if (ctx._ci) { try { ctx._ci.destroy(); } catch(e){} }
          ctx._ci = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: topProd,
              datasets: [
                {
                  label: 'Entradas',
                  data: topProd.map(function(p){
                    return porProduto[p].filter(function(m){ return m.tipo==='entrada'; }).length;
                  }),
                  backgroundColor: '#2D6A4F', borderRadius: 4
                },
                {
                  label: 'Saídas',
                  data: topProd.map(function(p){
                    return porProduto[p].filter(function(m){ return m.tipo==='saida'; }).length;
                  }),
                  backgroundColor: '#c0392b', borderRadius: 4
                }
              ]
            },
            options: {
              responsive: true,
              plugins: { legend: { position: 'top' } },
              scales: { x: { stacked: false }, y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
          });
        }
      }, 80);
    });
  };

  function renderFiltros(diasAtual) {
    return '<div class="hist-filtro-row">' +
      '<label class="hist-filtro-label">Período:</label>' +
      [7, 14, 30].map(function(d) {
        var ativo = d === diasAtual ? ' hist-btn-ativo' : '';
        return '<button class="hist-btn' + ativo + '" onclick="alterarPeriodo(' + d + ')">' + d + ' dias</button>';
      }).join('') +
    '</div>';
  }

  window.alterarPeriodo = function(dias) {
    var el = document.getElementById('hist-dias');
    if (el) el.value = dias;
    window.renderHistorico();
  };

  document.getElementById('search').addEventListener('input', window.render);
  window.render();
  initVoz();

  // Inicializa Firebase — sincroniza em tempo real com outros dispositivos
  if (typeof initFirebase === 'function') {
    initFirebase(restaurante, function(dadosRemoto) {
      // recebeu dados do Firebase — aplica se for mais recente
      var localRaw = {};
      try { localRaw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch(e) {}
      var tsLocal  = localRaw._ts  || 0;
      var tsRemoto = dadosRemoto._ts || 0;
      if (tsRemoto >= tsLocal) {
        aplicarDados(dadosRemoto);
        try { localStorage.setItem(STORE_KEY, JSON.stringify(dadosRemoto)); } catch(e) {}
        window.render();
        var el = document.getElementById('sync-status');
        if (el) { el.textContent = '✓ sincronizado'; el.className = 'sync-ok'; }
      }
    });
  }
}
