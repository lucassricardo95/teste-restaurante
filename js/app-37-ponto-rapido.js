/* ============================================================
   BOTÃO DISCRETO "ESCALA E PONTO" (18/10/2026)
   Relógio no topo (todos os perfis ligados a um funcionário) → janela com a minha escala dos próximos 7 dias,
   bater entrada/saída (com localização) e trocas de turno. Usa as mesmas chamadas do cartão "Minha escala" do Início.
   ============================================================ */
var prVinculado_ = null, prAberto_ = false;
function prBotao_(){ return document.getElementById('prBtnTopo'); }
async function prVisibilidade_(){
  const b = prBotao_(); if(!b) return;
  if(typeof currentUser === 'undefined' || !currentUser || typeof apiConfigurada === 'function' && !apiConfigurada()){ b.style.display = 'none'; return; }
  try{
    const e = await apiCall('pontoEstado', {});
    prVinculado_ = !!(e && e.ok && e.vinculado); prAberto_ = prVinculado_ && !!e.aberto;
  }catch(err){ prVinculado_ = null; }
  b.style.display = prVinculado_ ? '' : 'none';
  b.classList.toggle('pr-on', prAberto_);
  b.title = prAberto_ ? 'Escala e ponto (você está em turno)' : 'Escala e ponto';
}
function prHtmlDias_(m){
  const hoje = escISO_(new Date()), porDia = {};
  ((m && m.turnos) || []).forEach(t => { const k = String(t.data).slice(0, 10); (porDia[k] = porDia[k] || []).push(t); });
  let h = '';
  for(let i = 0; i < 7; i++){
    const iso = escSomar_(hoje, i), d = escData_(iso), ts = porDia[iso] || [];
    h += '<div style="padding:5px 0;border-bottom:1px solid var(--line);' + (i === 0 ? 'font-weight:700;' : '') + '"><span style="display:inline-block;width:92px;color:var(--muted);">' + (i === 0 ? 'Hoje' : ESC_DIAS_[(d.getDay() + 6) % 7] + ' ' + escDM_(iso)) + '</span>' +
      (ts.length ? ts.map(t => escChip_(t, false)).join('') : '<span style="color:var(--muted);">sem escala</span>') + '</div>';
  }
  return h;
}
async function prAtualizar_(){
  const corpo = document.getElementById('prCorpo'), m = document.getElementById('prModal');
  prVisibilidade_();
  if(!corpo || !m || !m.classList.contains('open')) return;
  try{
    const r = await minhaExtrasHtml_();
    corpo.innerHTML = r.h + '<h3 style="margin:14px 0 4px;">Próximos 7 dias</h3>' + prHtmlDias_(r.m) +
      '<div class="btn-row" style="margin-top:12px;"><button type="button" class="ghost small" onclick="escEquipeAbrir()">Ver a escala da equipe</button><button type="button" class="ghost small" onclick="mrAbrir()">📋 Meus registros</button></div>';
  }catch(e){ corpo.innerHTML = '<p class="sub">Não foi possível carregar agora. Tente de novo.</p>'; }
}
async function prAbrir(){
  let m = document.getElementById('prModal');
  if(!m){
    m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'prModal';
    m.innerHTML = '<div class="modal-box" style="max-width:520px;"><div class="modal-header"><h2>Escala e ponto</h2><button class="close-btn" onclick="fecharFormModal(\'prModal\')" aria-label="Fechar">✕</button></div><div id="prCorpo" style="margin-top:4px;"><p class="sub">Carregando…</p></div></div>';
    document.body.appendChild(m);
  }
  abrirFormModal('prModal'); await prAtualizar_();
}
/* depois de bater o ponto, atualiza a janela e o selo do botão */
(function(){
  if(typeof pontoBater === 'function'){ const orig = pontoBater; pontoBater = async function(){ const r = await orig.apply(this, arguments); try{ prAtualizar_(); }catch(e){} return r; }; }
  if(typeof renderInicio === 'function'){ const o2 = renderInicio; renderInicio = function(){ const r = o2.apply(this, arguments); try{ prVisibilidade_(); }catch(e){} return r; }; }
})();
