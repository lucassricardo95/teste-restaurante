/* ============================================================
   VISUAL (Entrega 2): listas compactas com janela de ações, caixa do Modo Desenvolvedor recolhível.
   O botão do Tex compacto e o espaço no fim da página ficam no estilo-13-visual.css.
   ============================================================ */
function vsAcoes(titulo, acoes){
  let ov = document.getElementById('vsAcoesModal');
  if(!ov){
    ov = document.createElement('div'); ov.className = 'modal-overlay'; ov.id = 'vsAcoesModal';
    ov.innerHTML = '<div class="modal-box vs-acoes" role="dialog" aria-modal="true" aria-labelledby="vsAcoesTit"><div class="modal-header"><h2 id="vsAcoesTit"></h2><button class="close-btn" type="button" aria-label="Fechar" onclick="vsAcoesFechar()">✕</button></div><div id="vsAcoesLista"></div></div>';
    ov.addEventListener('click', e => { if(e.target === ov) vsAcoesFechar(); });
    document.body.appendChild(ov);
  }
  document.getElementById('vsAcoesTit').textContent = titulo;
  window.__vsAcoes = acoes || [];
  document.getElementById('vsAcoesLista').innerHTML = window.__vsAcoes.map((a, i) => `<button type="button" class="vs-acao${a.perigo ? ' perigo' : ''}" onclick="vsAcoesExec(${i})">${a.t}</button>`).join('');
  ov.classList.add('open');
  const b = ov.querySelector('.vs-acao'); if(b){ try{ b.focus(); }catch(err){} }
}
function vsAcoesExec(i){ const a = (window.__vsAcoes || [])[i]; vsAcoesFechar(); if(a && typeof a.fn === 'function') setTimeout(a.fn, 30); }
function vsAcoesFechar(){ const ov = document.getElementById('vsAcoesModal'); if(ov) ov.classList.remove('open'); }
document.addEventListener('keydown', e => { if(e.key === 'Escape') vsAcoesFechar(); });

function vsAcoesEstoque(id){
  const i = (estoque || []).find(x => x.id === id); if(!i) return;
  vsAcoes(i.nome + ' · ' + i.quantidade + ' ' + (i.unidade || 'un'), [
    { t:'✏️ Editar (nome, unidade, preço)', fn:() => editarEstoquePrompt(id) },
    { t:'➕ Entrada (chegou mercadoria)', fn:() => entradaEstoquePrompt(id) },
    { t:'➖ Perda (estragou, caiu, venceu)', fn:() => perdaEstoquePrompt(id) },
    { t:'📋 Inventário (contei, corrigir)', fn:() => inventarioEstoquePrompt(id) },
    { t:'🗑️ Excluir', fn:() => excluirEstoqueConfirm(id), perigo:true }
  ]);
}
function vsAcoesProduto(id){
  const p = (produtos || []).find(x => x.id === id); if(!p) return;
  vsAcoes(p.nome, [
    { t:'✏️ Editar', fn:() => abrirEditarProduto(id) },
    { t:'📄 Duplicar', fn:() => duplicarProduto_(id) },
    { t:'🗑️ Excluir', fn:() => excluirProdutoConfirm(id), perigo:true }
  ]);
}
function vsAcoesCombo(id){
  const c = (combos || []).find(x => x.id === id); if(!c) return;
  vsAcoes(c.nome, [
    { t:'✏️ Editar', fn:() => abrirEditarCombo(id) },
    { t:'🗑️ Excluir', fn:() => excluirComboConfirm(id), perigo:true }
  ]);
}
function vsAcoesUsuario(idx){
  const u = (usuarios || [])[idx]; if(!u) return;
  const ac = [{ t:'✏️ Editar', fn:() => editarUsuarioPrompt(u.login) },
              { t: u.ativo ? '⏸️ Desativar (não entra mais)' : '▶️ Ativar', fn:() => toggleAtivoUsuario(u.login, !!u.ativo) }];
  if(u.nivel !== 'Desenvolvedor') ac.push({ t:'🗑️ Excluir', fn:() => excluirUsuarioPrompt(u.login), perigo:true });
  vsAcoes(u.login + ' · ' + u.nivel, ac);
}

/* Caixa do Modo Desenvolvedor: recolhe para uma linha (lembra a escolha neste aparelho) */
(function(){
  const CHAVE = 'texas_devbar_recolhida';
  function resumo(){
    const sel = document.getElementById('devVerComo'), r = document.getElementById('devBarResumo');
    if(sel && r){ const o = sel.options[sel.selectedIndex]; r.textContent = o ? o.textContent : ''; }
  }
  function aplicar(rec){
    const bar = document.getElementById('devBar'), bt = document.getElementById('devBarBtn'); if(!bar) return;
    bar.classList.toggle('recolhida', rec);
    if(bt){ bt.textContent = rec ? '▸' : '▾'; bt.setAttribute('aria-expanded', rec ? 'false' : 'true'); bt.setAttribute('aria-label', rec ? 'Mostrar opções do Modo Desenvolvedor' : 'Recolher Modo Desenvolvedor'); }
    resumo();
  }
  function iniciar(){
    const bar = document.getElementById('devBar'); if(!bar || document.getElementById('devBarBtn')) return;
    const bt = document.createElement('button'); bt.type = 'button'; bt.id = 'devBarBtn'; bt.className = 'vs-dev-btn';
    const r = document.createElement('span'); r.id = 'devBarResumo'; r.className = 'vs-dev-resumo';
    bar.insertBefore(r, bar.querySelector('#devVerComo'));
    bar.insertBefore(bt, bar.firstChild);
    bt.addEventListener('click', () => { const rec = !bar.classList.contains('recolhida'); try{ localStorage.setItem(CHAVE, rec ? '1' : '0'); }catch(err){} aplicar(rec); });
    const sel = document.getElementById('devVerComo'); if(sel) sel.addEventListener('change', resumo);
    let rec = true; try{ rec = localStorage.getItem(CHAVE) !== '0'; }catch(err){}
    aplicar(rec);
    try{ new MutationObserver(resumo).observe(sel, { childList:true }); }catch(err){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

/* ============================================================
   JANELA SIMPLES (pente fino): substitui as caixinhas de digitar do navegador.
   vsForm({ titulo, texto, ok, perigo, campos:[{ id, rotulo, tipo:'texto'|'numero'|'data'|'escolha', valor, obrigatorio,
            maiorQueZero, minimo, sufixo, minLetras, sugestoes:[...], opcoes:[{ v, t }], mostrarSe:{ campo, valor } }] })
   Devolve uma Promise com { id: valor } ou null (tocou em Voltar / fechou).
   ============================================================ */
let _vsFormRes_ = null;
function vsForm(cfg){
  return new Promise(res => {
    if(_vsFormRes_){ const ant = _vsFormRes_; _vsFormRes_ = null; ant(null); }
    let ov = document.getElementById('vsFormModal');
    if(!ov){
      ov = document.createElement('div'); ov.className = 'modal-overlay'; ov.id = 'vsFormModal';
      ov.innerHTML = '<div class="modal-box vs-form" role="dialog" aria-modal="true" aria-labelledby="vsFormTit"><div class="modal-header"><h2 id="vsFormTit"></h2><button class="close-btn" type="button" aria-label="Fechar" onclick="vsFormFechar_(null)">✕</button></div><form id="vsFormCorpo" novalidate autocomplete="off"></form></div>';
      ov.addEventListener('click', e => { if(e.target === ov) vsFormFechar_(null); });
      ov.querySelector('form').addEventListener('submit', e => { e.preventDefault(); vsFormOk_(); });
      document.body.appendChild(ov);
    }
    _vsFormRes_ = res; window.__vsForm = cfg || {}; window.__vsFormEsc = {};
    const c = window.__vsForm, campos = c.campos || [];
    document.getElementById('vsFormTit').textContent = c.titulo || '';
    const html = [];
    if(c.texto) html.push('<p class="sub vs-form-texto">' + escH(c.texto) + '</p>');
    campos.forEach((f, i) => {
      const fid = 'vsF_' + i, se = f.mostrarSe ? ` data-se-campo="${escH(f.mostrarSe.campo)}" data-se-valor="${escH(f.mostrarSe.valor)}"` : '';
      const rot = escH(f.rotulo || '') + (f.sufixo ? ' (' + escH(f.sufixo) + ')' : '');
      let h = `<div class="vs-campo" data-campo="${escH(f.id)}"${se}>`;
      if(f.tipo === 'escolha'){
        const ops = f.opcoes || [];
        window.__vsFormEsc[f.id] = (f.valor !== undefined ? f.valor : (ops[0] && ops[0].v));
        h += (f.rotulo ? `<div class="vs-rot">${rot}</div>` : '') + `<div class="vs-escolha" role="group" aria-label="${escH(f.rotulo || c.titulo || '')}">` +
          ops.map((o, j) => `<button type="button" class="vs-op" data-campo="${escH(f.id)}" data-v="${escH(o.v)}" aria-pressed="${o.v === window.__vsFormEsc[f.id] ? 'true' : 'false'}" onclick="vsFormEscolher_(${i},${j})">${escH(o.t)}</button>`).join('') + '</div>';
      } else {
        h += `<label for="${fid}">${rot}</label>`;
        const val = f.valor === undefined || f.valor === null ? '' : String(f.valor);
        if(f.tipo === 'numero') h += `<input type="text" inputmode="decimal" id="${fid}" value="${escH(val)}">`;
        else if(f.tipo === 'data') h += `<input type="date" id="${fid}" value="${escH(val)}">`;
        else if(f.tipo === 'longo') h += `<textarea id="${fid}" rows="5" maxlength="${f.max || 1000}">${escH(val)}</textarea>`;
        else h += `<input type="text" id="${fid}" maxlength="${f.max || 200}" value="${escH(val)}">`;
        if(f.sugestoes && f.sugestoes.length) h += '<div class="vs-chips">' + f.sugestoes.map(s => `<button type="button" class="vs-chip" onclick="vsFormSugestao_(${i},this)">${escH(s)}</button>`).join('') + '</div>';
      }
      html.push(h + '</div>');
    });
    html.push('<div class="msg" id="vsFormMsg"></div>');
    html.push(`<div class="vs-form-botoes"><button type="submit" class="primary${c.perigo ? ' vs-perigo' : ''}" id="vsFormOk">${escH(c.ok || 'Confirmar')}</button><button type="button" class="ghost" onclick="vsFormFechar_(null)">Voltar</button></div>`);
    document.getElementById('vsFormCorpo').innerHTML = html.join('');
    vsFormVisiveis_();
    ov.classList.add('open');
    const primeiro = ov.querySelector('.vs-campo:not([hidden]) input');
    setTimeout(() => { try{ (primeiro || document.getElementById('vsFormOk')).focus(); if(primeiro && primeiro.select && primeiro.type === 'text') primeiro.select(); }catch(err){} }, 60);
  });
}
function vsFormVisiveis_(){
  document.querySelectorAll('#vsFormCorpo .vs-campo[data-se-campo]').forEach(d => { d.hidden = String(window.__vsFormEsc[d.dataset.seCampo]) !== d.dataset.seValor; });
}
function vsFormEscolher_(i, j){
  const f = (window.__vsForm.campos || [])[i]; if(!f) return; const o = (f.opcoes || [])[j]; if(!o) return;
  window.__vsFormEsc[f.id] = o.v;
  document.querySelectorAll('#vsFormCorpo .vs-op').forEach(b => { if(b.dataset.campo === f.id) b.setAttribute('aria-pressed', b.dataset.v === String(o.v) ? 'true' : 'false'); });
  vsFormVisiveis_();
}
function vsFormSugestao_(i, bt){ const el = document.getElementById('vsF_' + i); if(el){ el.value = bt.textContent; try{ el.focus(); }catch(err){} } }
function vsFormNum_(txt){
  let s = String(txt == null ? '' : txt).trim().replace(/\s/g, '');
  if(s.indexOf(',') !== -1) s = s.replace(/\./g, '').replace(',', '.');
  return s === '' ? NaN : Number(s);
}
function vsFormOk_(){
  const c = window.__vsForm || {}, out = {};
  const erro = m => { showMsg('vsFormMsg', m, 'warn'); };
  const campos = c.campos || [];
  for(let i = 0; i < campos.length; i++){
    const f = campos[i], box = document.querySelector('#vsFormCorpo .vs-campo[data-campo="' + f.id + '"]');
    if(box && box.hidden) continue;
    const nome = f.rotulo || 'este campo';
    if(f.tipo === 'escolha'){ out[f.id] = window.__vsFormEsc[f.id]; continue; }
    const el = document.getElementById('vsF_' + i), bruto = el ? String(el.value || '').trim() : '';
    if(f.tipo === 'numero'){
      if(bruto === ''){ if(f.obrigatorio){ erro('Preencha: ' + nome + '.'); try{ el.focus(); }catch(e){} return; } out[f.id] = null; continue; }
      const n = vsFormNum_(bruto);
      if(!isFinite(n)){ erro('Use só números em: ' + nome + ' (ex.: 2 ou 1,5).'); try{ el.focus(); }catch(e){} return; }
      if(f.maiorQueZero && !(n > 0)){ erro('Informe um valor maior que zero em: ' + nome + '.'); try{ el.focus(); }catch(e){} return; }
      if(f.minimo !== undefined && n < f.minimo){ erro('O menor valor aceito em ' + nome + ' é ' + f.minimo + '.'); try{ el.focus(); }catch(e){} return; }
      out[f.id] = n; continue;
    }
    if(f.obrigatorio && !bruto){ erro('Preencha: ' + nome + '.'); try{ el.focus(); }catch(e){} return; }
    if(f.minLetras && bruto && bruto.length < f.minLetras){ erro('Escreva pelo menos ' + f.minLetras + ' letras em: ' + nome + '.'); try{ el.focus(); }catch(e){} return; }
    if(f.tipo === 'data' && bruto && !/^\d{4}-\d{2}-\d{2}$/.test(bruto)){ erro('Data inválida em: ' + nome + '.'); return; }
    out[f.id] = bruto;
  }
  vsFormFechar_(out);
}
function vsFormFechar_(valores){
  const ov = document.getElementById('vsFormModal'); if(ov) ov.classList.remove('open');
  const r = _vsFormRes_; _vsFormRes_ = null; if(r) r(valores);
}
document.addEventListener('keydown', e => { if(e.key === 'Escape' && _vsFormRes_) vsFormFechar_(null); });
