/* Fotos opcionais em três lançamentos (18/10/2026): perda de estoque, recebimento de compra e ocorrência de pedido.
   Depois de lançar, o sistema pergunta se a pessoa quer anexar até 3 fotos (pode pular). Ficam 90 dias no Drive.
   Quem vê: Admin (perda e recebimento) e Admin/Operador (ocorrência), pelo botão 📷 no próprio lançamento. */
const FV_ROTULO_ = { perda:'Perda de estoque', recebimento:'Recebimento da compra', ocorrencia:'Ocorrência' };
const FV_OFERECIDOS_ = new Set();
let fvCtx_ = null;

/* ---------- foto: reduz para ~1024 px e devolve base64 ---------- */
function fvReduzir_(file){
  return new Promise((ok, erro) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const m = 1024, f = Math.min(1, m / Math.max(img.width, img.height)), cv = document.createElement('canvas');
      cv.width = Math.max(1, Math.round(img.width * f)); cv.height = Math.max(1, Math.round(img.height * f));
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      ok(cv.toDataURL('image/jpeg', 0.75).split(',').pop());
    };
    img.onerror = () => { URL.revokeObjectURL(url); erro(new Error('Não consegui abrir essa foto.')); };
    img.src = url;
  });
}

/* ---------- oferecer foto depois do lançamento ---------- */
function fvOferecer_(tipo, refId){
  const chave = tipo + ':' + refId;
  if(!refId || FV_OFERECIDOS_.has(chave)) return;
  FV_OFERECIDOS_.add(chave);
  setTimeout(() => fvAbrir_(tipo, refId), 900);
}
function fvAbrir_(tipo, refId){
  fvCtx_ = { tipo, refId, fotos:[], enviando:false };
  let m = document.getElementById('fvModal');
  if(!m){
    m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'fvModal';
    m.innerHTML = '<div class="modal-box" style="max-width:460px;"><div class="modal-header"><h2 id="fvTitulo">📷 Foto do lançamento</h2><button class="close-btn" onclick="fvPular()" aria-label="Fechar">✕</button></div>'
      + '<div id="fvCorpo"></div><input type="file" id="fvArq" accept="image/*" capture="environment" style="display:none"></div>';
    document.body.appendChild(m);
    document.getElementById('fvArq').addEventListener('change', fvEscolheu_);
  }
  document.getElementById('fvTitulo').textContent = '📷 ' + FV_ROTULO_[tipo] + ': foto?';
  fvDesenhar_();
  abrirFormModal('fvModal');
}
function fvDesenhar_(msg){
  const c = fvCtx_; if(!c) return;
  const miniaturas = c.fotos.map((b, i) => '<span style="position:relative;display:inline-block;margin:0 6px 6px 0;"><img alt="Foto ' + (i + 1) + '" style="width:84px;height:84px;object-fit:cover;border-radius:8px;" src="data:image/jpeg;base64,' + b + '"><button type="button" class="ghost small" style="position:absolute;top:2px;right:2px;padding:0 6px;" onclick="fvTirar(' + i + ')" aria-label="Tirar foto ' + (i + 1) + '">✕</button></span>').join('');
  document.getElementById('fvCorpo').innerHTML =
    '<p class="sub">Opcional. Serve de prova se precisar conferir depois. A foto fica guardada por 90 dias e só o dono vê' + (c.tipo === 'ocorrencia' ? ' (e o operador)' : '') + '.</p>'
    + (miniaturas ? '<div style="margin:8px 0;">' + miniaturas + '</div>' : '')
    + (msg ? '<p class="sub" id="fvMsg">' + escH(msg) + '</p>' : '')
    + '<div class="btn-row" style="gap:8px;flex-wrap:wrap;">'
    + (c.enviando ? '<button type="button" class="small-gold" disabled>Enviando…</button>'
      : (c.fotos.length < 3 ? '<button type="button" class="' + (c.fotos.length ? 'ghost' : 'small-gold') + '" onclick="document.getElementById(\'fvArq\').click()">📷 ' + (c.fotos.length ? 'Outra foto' : 'Tirar foto') + '</button>' : '')
        + (c.fotos.length ? '<button type="button" class="small-gold" onclick="fvEnviar()">Salvar ' + c.fotos.length + ' foto' + (c.fotos.length > 1 ? 's' : '') + '</button>' : '')
        + '<button type="button" class="ghost" onclick="fvPular()">' + (c.fotos.length ? 'Cancelar' : 'Pular') + '</button>')
    + '</div>';
}
async function fvEscolheu_(ev){
  const c = fvCtx_, f = ev.target.files && ev.target.files[0]; ev.target.value = '';
  if(!c || !f) return;
  try{ c.fotos.push(await fvReduzir_(f)); fvDesenhar_(); }
  catch(e){ fvDesenhar_(e.message || 'Foto inválida.'); }
}
function fvTirar(i){ if(fvCtx_ && !fvCtx_.enviando){ fvCtx_.fotos.splice(i, 1); fvDesenhar_(); } }
function fvPular(){ fvCtx_ = null; fecharFormModal('fvModal'); }
async function fvEnviar(){
  const c = fvCtx_; if(!c || c.enviando || !c.fotos.length) return;
  c.enviando = true; fvDesenhar_();
  let ok = 0, ultimo = '';
  for(const b of c.fotos){
    let feito = false;
    for(let t = 0; t < 2 && !feito; t++){
      try{
        const j = await sb410Edge_('evidencia-foto', { acao:'enviar', tipo:c.tipo, refId:c.refId, base64Data:b }, 60000);
        if(j && j.ok){ feito = true; ok++; } else { ultimo = (j && j.message) || ''; if(/prazo|3 fotos|Não foi possível anexar/i.test(ultimo)) break; }
      }catch(e){ ultimo = e.message || ''; }
      if(!feito) await new Promise(r => setTimeout(r, 1200));
    }
  }
  const tipo = c.tipo;
  fvCtx_ = null; fecharFormModal('fvModal');
  try{ avisar(ok === c.fotos.length ? (ok > 1 ? 'Fotos salvas.' : 'Foto salva.') : (ok + ' de ' + c.fotos.length + ' fotos salvas.' + (ultimo ? ' ' + ultimo : ''))); }catch(e){}
  fvMarcarTudo_();
}

/* ---------- gancho: depois que o lançamento dá certo ---------- */
(function(){
  if(typeof apiCall !== 'function') return;
  const orig = apiCall;
  apiCall = async function(action, payload){
    const r = await orig.apply(this, arguments);
    try{
      if(r && r.ok && !r.enfileirado){
        if(action === 'registrarPerdaEstoque' && r.id) fvOferecer_('perda', r.id);
        else if(action === 'receberCompra' && payload && payload.id) fvOferecer_('recebimento', payload.id);
        else if(action === 'registrarCompra' && r.id && payload && payload.status === 'Recebida') fvOferecer_('recebimento', r.id);
        else if(action === 'registrarOcorrencia' && r.id) fvOferecer_('ocorrencia', r.id);
      }
    }catch(e){}
    return r;
  };
})();

/* ---------- botão 📷 nos lançamentos que têm foto ---------- */
function fvEhAdmin_(){ const n = currentUser && currentUser.nivel; return n === 'Admin' || n === 'Desenvolvedor'; }
function fvPodeVer_(tipo){ const n = currentUser && currentUser.nivel; return tipo === 'ocorrencia' ? (fvEhAdmin_() || n === 'Operador') : fvEhAdmin_(); }
let fvTimer_ = null;
function fvMarcarTudo_(){ clearTimeout(fvTimer_); fvTimer_ = setTimeout(() => { ['perda', 'recebimento', 'ocorrencia'].forEach(fvMarcar_); }, 250); }
async function fvMarcar_(tipo){
  if(!fvPodeVer_(tipo)) return;
  let caixa, itens, ids;
  if(tipo === 'perda'){
    caixa = document.getElementById('movEstoqueLista'); if(!caixa) return;
    itens = Array.from(caixa.querySelectorAll(':scope > .log-item'));
    const l = (movimentacoesEstoque || []).slice(0, 30); if(l.length !== itens.length) return;
    ids = l.map(m => m.tipo === 'Perda' ? m.id : null);
  } else if(tipo === 'ocorrencia'){
    caixa = document.getElementById('ocLista'); if(!caixa) return;
    itens = Array.from(caixa.querySelectorAll(':scope > .notif-card'));
    const l = (filtroOcorrencias === 'abertas' ? ocorrenciasAbertas_() : (ocorrencias || [])).slice().sort((a, b) => b.numero - a.numero); if(l.length !== itens.length) return;
    ids = l.map(o => o.id);
  } else {
    caixa = document.getElementById('cpLista'); if(!caixa) return;
    itens = Array.from(caixa.querySelectorAll(':scope > .notif-card'));
    const l = (typeof _compras_ !== 'undefined' && _compras_ && _compras_.compras) || []; if(l.length !== itens.length) return;
    ids = l.map(c => c.status === 'Recebida' ? c.id : null);
  }
  const pedir = ids.filter(Boolean); if(!pedir.length) return;
  let mapa = {};
  try{ const r = await apiCall('evidenciasLista', { tipo, ids: pedir }); if(r && r.ok && r.mapa) mapa = r.mapa; }catch(e){ return; }
  itens.forEach((el, i) => {
    el.querySelectorAll(':scope .fv-btn').forEach(b => b.remove());
    const n = ids[i] && mapa[ids[i]]; if(!n) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost small fv-btn'; b.style.marginTop = '6px';
    b.textContent = '📷 ' + (n > 1 ? n + ' fotos' : 'Foto'); b.setAttribute('onclick', "fvVer('" + tipo + "','" + ids[i] + "',0)");
    el.appendChild(b);
  });
}
['renderMovimentacoesEstoque', 'renderOcorrencias', 'renderCompras_'].forEach(nome => {
  const orig = window[nome]; if(typeof orig !== 'function') return;
  window[nome] = function(){ const r = orig.apply(this, arguments); try{ fvMarcarTudo_(); }catch(e){} return r; };
});

/* ---------- ver a foto ---------- */
async function fvVer(tipo, refId, indice){
  let m = document.getElementById('fvVerModal');
  if(!m){ m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'fvVerModal';
    m.innerHTML = '<div class="modal-box" style="max-width:520px;"><div class="modal-header"><h2 id="fvVerTitulo">Foto</h2><button class="close-btn" onclick="fecharFormModal(\'fvVerModal\')" aria-label="Fechar">✕</button></div><div id="fvVerCorpo"></div></div>'; document.body.appendChild(m); }
  abrirFormModal('fvVerModal');
  document.getElementById('fvVerTitulo').textContent = '📷 ' + FV_ROTULO_[tipo];
  const corpo = document.getElementById('fvVerCorpo'); corpo.innerHTML = '<p class="sub">Abrindo a foto…</p>';
  try{
    const j = await sb410Edge_('evidencia-foto', { acao:'ver', tipo, refId, indice: indice || 0 }, 60000);
    if(!j || !j.ok || !j.base64) throw new Error((j && j.message) || 'Não consegui abrir a foto.');
    let abas = '';
    if(j.total > 1){ abas = '<div class="btn-row" style="margin-bottom:8px;">'; for(let i = 0; i < j.total; i++) abas += '<button type="button" class="' + (i === (indice || 0) ? 'small-gold' : 'ghost small') + '" onclick="fvVer(\'' + tipo + '\',\'' + refId + '\',' + i + ')">Foto ' + (i + 1) + '</button>'; abas += '</div>'; }
    corpo.innerHTML = abas + '<img alt="Foto do lançamento" style="width:100%;border-radius:10px;" src="data:' + (j.tipo || 'image/jpeg') + ';base64,' + j.base64 + '"><div class="obs-line" style="margin-top:6px;">Guardada por 90 dias.</div>';
  }catch(e){ corpo.innerHTML = '<p class="sub">' + escH(e.message || 'Não consegui abrir a foto.') + '</p>'; }
}
