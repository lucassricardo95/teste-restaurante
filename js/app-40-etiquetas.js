/* ============================================================
   ETIQUETAS DE VALIDADE (18/10/2026) — para a vigilância sanitária
   Botão discreto no topo (Admin, Operador de caixa e Cozinha). Escolhe o item, o tipo (aberto, manipulado, descongelado ou fechado),
   a validade é calculada pelos dias que o dono cadastrou (e pode ser trocada na hora) e imprime em 58 mm ou 80 mm (térmica).
   O dono cadastra os dias em "Itens e validades"; o sistema mostra uma SUGESTÃO geral como dica, mas nunca preenche sozinho.
   Cada impressão fica registrada (quem, quando, o quê) por 45 dias.
   ============================================================ */
const ET_TIPOS_ = [
  { id:'Aberto', chave:'aberto', rot:'Aberto', data:'Aberto em' },
  { id:'Manipulado', chave:'manipulado', rot:'Manipulado', data:'Manipulado em' },
  { id:'Descongelado', chave:'descongelado', rot:'Descongelado', data:'Descongelado em' },
  { id:'Fechado', chave:'fechado', rot:'Fechado (validade do fabricante)', data:'Etiquetado em' }
];
const ET_CONSERV_ = ['Refrigerado', 'Congelado', 'Ambiente'];
let etItens_ = [], etTipo_ = 'Aberto';

/* ---------- sugestão geral (só dica; o dono decide) ---------- */
const ET_SUGESTOES_ = [
  { re:/(frango|peito|coxa|sobrecoxa|ave)/i, d:{ aberto:2, manipulado:2, descongelado:1 } },
  { re:/(bacon|calabresa|lingui|salsicha|presunto|mortadela|peperoni|pepperoni|apresuntado|frios?)/i, d:{ aberto:3, manipulado:2, descongelado:1 } },
  { re:/(carne|hamb|blend|bovin|costela|picanha|patinho|cupim|steak|burger)/i, d:{ aberto:3, manipulado:2, descongelado:1 } },
  { re:/(queijo|mussarela|muçarela|cheddar|catupiry|requeij|parmes|prato|provolone|cream cheese)/i, d:{ aberto:5, manipulado:3 } },
  { re:/(alface|tomate|cebola|pepino|rúcula|rucula|repolho|cenoura|pimentão|pimentao|picles|salada|legume|verdura|vinagrete|cheiro)/i, d:{ aberto:2, manipulado:2 } },
  { re:/(maionese|ketchup|catchup|mostarda|barbecue|molho|geleia|creme|chantilly|nata|leite|iogurte)/i, d:{ aberto:5, manipulado:3 } },
  { re:/(ovo)/i, d:{ aberto:2, manipulado:2 } },
  { re:/(pão|pao|brioche|bisnaga)/i, d:{ aberto:3, manipulado:2 } },
  { re:/(batata|nugget|empanado|onion|anéis|aneis)/i, d:{ aberto:3, manipulado:1 } }
];
function etSugerir_(nome){
  const n = String(nome || '');
  let d = { aberto:3, manipulado:2, descongelado:1 };
  for(const s of ET_SUGESTOES_){ if(s.re.test(n)){ d = s.d; break; } }
  let c = 'Refrigerado';
  if(/(congelad|sorvete)/i.test(n)) c = 'Congelado';
  else if(/(refrigerante|suco|água|agua|cerveja|bebida|óleo|oleo|farinha|açúcar|acucar|sal\b|tempero|guardanapo|embalagem|caixa|pão|pao|brioche|bisnaga)/i.test(n)) c = 'Ambiente';
  return { dias:d, conservacao:c };
}
function etSugestaoTxt_(nome){
  const s = etSugerir_(nome).dias, p = [];
  if(s.aberto != null) p.push('aberto ' + s.aberto); if(s.manipulado != null) p.push('manipulado ' + s.manipulado); if(s.descongelado != null) p.push('descongelado ' + s.descongelado);
  return p.join(' · ') + ' dia(s)';
}

/* ---------- botão do topo ---------- */
function etPodeUsar_(){ const n = currentUser && currentUser.nivel; return n === 'Admin' || n === 'Operador' || n === 'Cozinha' || n === 'Desenvolvedor'; }
function etVisibilidade_(){
  const b = document.getElementById('etBtnTopo'); if(!b) return;
  b.style.display = (currentUser && etPodeUsar_()) ? '' : 'none';
}
(function(){
  if(typeof renderInicio === 'function'){ const o = renderInicio; renderInicio = function(){ const r = o.apply(this, arguments); try{ etVisibilidade_(); }catch(e){} return r; }; }
  if(typeof aplicarPermissoesNivel === 'function'){ const o = aplicarPermissoesNivel; aplicarPermissoesNivel = function(){ const r = o.apply(this, arguments); try{ etVisibilidade_(); }catch(e){} return r; }; }
})();

/* ---------- utilidades de data ---------- */
function etPad_(n){ return String(n).padStart(2, '0'); }
function etLocalIso_(d){ return d.getFullYear() + '-' + etPad_(d.getMonth() + 1) + '-' + etPad_(d.getDate()) + 'T' + etPad_(d.getHours()) + ':' + etPad_(d.getMinutes()); }
function etSomaDias_(isoDataHora, dias){ const d = new Date(isoDataHora); if(isNaN(d)) return ''; d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + dias); return d.getFullYear() + '-' + etPad_(d.getMonth() + 1) + '-' + etPad_(d.getDate()); }
function etBr_(iso){ const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function etBrHora_(isoLocal){ const m = String(isoLocal || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : ''; }

/* ---------- janela de imprimir ---------- */
async function etAbrir(){
  let m = document.getElementById('etModal');
  if(!m){
    m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'etModal';
    m.innerHTML = '<div class="modal-box" style="max-width:520px;"><div class="modal-header"><h2>🏷 Etiqueta de validade</h2><button class="close-btn" onclick="fecharFormModal(\'etModal\')" aria-label="Fechar">✕</button></div><div id="etCorpo"></div></div>';
    document.body.appendChild(m);
  }
  abrirFormModal('etModal');
  document.getElementById('etCorpo').innerHTML = '<p class="sub">Carregando…</p>';
  try{
    const r = await apiCall('etiquetasLista', {});
    if(!r || !r.ok) throw new Error((r && r.message) || 'Não foi possível carregar.');
    etItens_ = r.itens || [];
  }catch(e){ document.getElementById('etCorpo').innerHTML = '<p class="sub">' + escH(e.message || 'Não foi possível carregar agora.') + '</p>'; return; }
  etDesenhar_();
}
function etDesenhar_(){
  const admin = currentUser && (currentUser.nivel === 'Admin' || currentUser.nivel === 'Desenvolvedor');
  const fmt = lerFormato ? (function(){ try{ return localStorage.getItem('txbFmtEtiqueta') === '58mm' ? '58mm' : '80mm'; }catch(e){ return '80mm'; } })() : '80mm';
  const agora = etLocalIso_(new Date());
  document.getElementById('etCorpo').innerHTML =
    '<datalist id="etLista">' + etItens_.map(i => '<option value="' + escH(i.nome) + '"></option>').join('') + '</datalist>'
    + '<label class="lbl">Item (escolha da lista ou escreva um nome)</label><input id="etNome" list="etLista" maxlength="60" placeholder="Ex.: Molho da casa" oninput="etItemMudou_()" autocomplete="off">'
    + '<label class="lbl" style="margin-top:8px;">Tipo</label><div id="etTipos" class="btn-row" style="flex-wrap:wrap;gap:6px;">' + ET_TIPOS_.map(t => '<button type="button" class="' + (t.id === etTipo_ ? 'small-gold' : 'ghost small') + '" onclick="etTipo(\'' + t.id + '\')">' + t.rot + '</button>').join('') + '</div>'
    + '<label class="lbl" id="etDataRot" style="margin-top:8px;">Aberto em</label><input id="etMan" type="datetime-local" value="' + agora + '" onchange="etRecalcular_()">'
    + '<label class="lbl" style="margin-top:8px;">Validade <span id="etValDica" class="obs-line"></span></label><input id="etVal" type="date">'
    + '<label class="lbl" style="margin-top:8px;">Conservação</label><select id="etCons">' + ET_CONSERV_.map(c => '<option>' + c + '</option>').join('') + '</select>'
    + '<label class="lbl" style="margin-top:8px;">Lote ou fornecedor (opcional)</label><input id="etLote" maxlength="40" placeholder="Opcional">'
    + '<div class="btn-row" style="gap:10px;margin-top:8px;"><div style="flex:1;"><label class="lbl">Quantidade de etiquetas</label><input id="etQtd" type="number" min="1" max="100" value="1" inputmode="numeric"></div>'
    + '<div style="flex:1;"><label class="lbl">Tamanho</label><select id="etFmt"><option value="80mm"' + (fmt === '80mm' ? ' selected' : '') + '>80 mm</option><option value="58mm"' + (fmt === '58mm' ? ' selected' : '') + '>58 mm</option></select></div></div>'
    + '<p class="sub" id="etMsg" style="min-height:1.2em;"></p>'
    + '<div class="btn-row" style="gap:8px;flex-wrap:wrap;"><button type="button" class="small-gold" id="etBtnImp" onclick="etImprimir()">🖨 Imprimir</button>' + (admin ? '<button type="button" class="ghost" onclick="etItensAbrir()">Itens e validades</button>' : '') + '</div>';
  etItemMudou_();
}
function etTipo(t){ etTipo_ = t; document.querySelectorAll('#etTipos button').forEach((b, i) => { b.className = ET_TIPOS_[i].id === t ? 'small-gold' : 'ghost small'; }); etItemMudou_(); }
function etAchar_(nome){ const n = String(nome || '').trim().toLowerCase(); return etItens_.find(i => i.nome.toLowerCase() === n) || null; }
function etItemMudou_(){
  const it = etAchar_(document.getElementById('etNome').value);
  if(it){ const c = document.getElementById('etCons'); if(c && ET_CONSERV_.includes(it.conservacao)) c.value = it.conservacao; }
  etRecalcular_();
}
function etRecalcular_(){
  const t = ET_TIPOS_.find(x => x.id === etTipo_), it = etAchar_(document.getElementById('etNome').value);
  document.getElementById('etDataRot').textContent = t.data;
  const dias = it && it.dias ? it.dias[t.chave] : null, dica = document.getElementById('etValDica'), val = document.getElementById('etVal');
  if(dias != null && dias !== ''){ val.value = etSomaDias_(document.getElementById('etMan').value, Number(dias)); dica.textContent = '· ' + dias + ' dia(s) cadastrado(s); pode trocar'; }
  else { val.value = ''; dica.textContent = it ? '· sem dias cadastrados para este tipo: informe a data' : '· informe a data'; }
}
async function etImprimir(){
  const msg = document.getElementById('etMsg'), btn = document.getElementById('etBtnImp');
  const nome = document.getElementById('etNome').value.trim(), man = document.getElementById('etMan').value, val = document.getElementById('etVal').value;
  const cons = document.getElementById('etCons').value, lote = document.getElementById('etLote').value.trim(), qtd = parseInt(document.getElementById('etQtd').value, 10), fmt = document.getElementById('etFmt').value;
  if(!nome){ msg.textContent = 'Informe o item.'; return; }
  if(!man){ msg.textContent = 'Informe a data e a hora.'; return; }
  if(!val){ msg.textContent = 'Informe a validade.'; return; }
  if(val < man.slice(0, 10)){ msg.textContent = 'A validade não pode ser antes da data da etiqueta.'; return; }
  if(!(qtd >= 1 && qtd <= 100)){ msg.textContent = 'A quantidade de etiquetas deve ficar entre 1 e 100.'; return; }
  btn.disabled = true; msg.textContent = 'Registrando…';
  try{
    const r = await apiCall('etiquetaRegistrar', { nome, tipo: etTipo_, qtd, validade: val, manipuladoEm: new Date(man).toISOString(), conservacao: cons, lote });
    if(!r || !r.ok){ msg.textContent = (r && r.message) || 'Não foi possível registrar.'; btn.disabled = false; return; }
    try{ localStorage.setItem('txbFmtEtiqueta', fmt); }catch(e){}
    etImprimirHtml_({ nome, tipo: etTipo_, man, val, cons, lote, resp: r.responsavel || (currentUser && (currentUser.nome || currentUser.login)) || '' }, qtd, fmt);
    msg.textContent = qtd + ' etiqueta(s) enviada(s) para impressão.';
  }catch(e){ msg.textContent = 'Não foi possível agora. Tente de novo.'; }
  btn.disabled = false;
}

/* ---------- impressão (uma etiqueta por folha da térmica) ---------- */
function etImprimirHtml_(d, qtd, fmt){
  /* letras grandes e informação separada em linhas bem claras (leitura rápida na cozinha) */
  const t = ET_TIPOS_.find(x => x.id === d.tipo), larg = fmt === '58mm' ? '58mm' : '80mm', fs = fmt === '58mm' ? 17 : 22;
  const linha = (rot, val) => '<div class="l"><span class="r">' + rot + '</span><span class="v">' + val + '</span></div>';
  const uma = '<div class="et"><div class="nome">' + escH(d.nome.toUpperCase()) + '</div><div class="tipo">' + escH(d.tipo.toUpperCase()) + '</div>'
    + linha(t.data.toUpperCase(), etBrHora_(d.man))
    + '<div class="val"><span class="r2">VALIDADE</span>' + etBr_(d.val) + '</div>'
    + linha('CONSERVAR', escH(d.cons.toUpperCase()))
    + (d.lote ? linha('LOTE/FORNEC.', escH(d.lote)) : '')
    + linha('RESPONSÁVEL', escH(d.resp)) + '</div>';
  const css = '@page{size:' + larg + ' auto;margin:0}*{box-sizing:border-box}body{margin:0;width:' + larg + ';font-family:Arial,Helvetica,sans-serif;color:#000;font-size:' + fs + 'px;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    + '.et{width:' + larg + ';padding:3mm 3.5mm;page-break-after:always;break-after:page;line-height:1.2}.et:last-child{page-break-after:auto;break-after:auto}'
    + '.nome{font-size:1.7em;font-weight:900;line-height:1.1;word-break:break-word;margin-bottom:4px}'
    + '.tipo{font-size:1.15em;font-weight:900;background:#000;color:#fff;display:inline-block;padding:2px 10px;margin:2px 0 6px;letter-spacing:.05em}'
    + '.l{margin:3px 0}.r{display:block;font-size:.62em;font-weight:700;letter-spacing:.06em}.v{display:block;font-size:1.2em;font-weight:900}'
    + '.val{font-size:1.9em;font-weight:900;border:3px solid #000;padding:3px 6px;margin:6px 0;text-align:center}.r2{display:block;font-size:.42em;font-weight:700;letter-spacing:.1em}';
  const ifr = document.createElement('iframe');
  ifr.style.cssText = 'position:fixed;left:-10000px;top:0;border:0;width:' + (fmt === '58mm' ? 219 : 302) + 'px;height:800px;';
  document.body.appendChild(ifr);
  const dc = ifr.contentWindow.document;
  dc.open(); dc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiqueta ' + escH(d.nome) + '</title><style>' + css + '</style></head><body>' + new Array(qtd + 1).join(uma) + '</body></html>'); dc.close();
  setTimeout(() => {
    try{ ifr.contentWindow.focus(); ifr.contentWindow.print(); }
    catch(e){ try{ avisar('Este aparelho não abriu a impressão.'); }catch(_){} }
    setTimeout(() => { try{ ifr.remove(); }catch(e){} }, 60000);
  }, 200);
}

/* ---------- Admin: itens e validades ---------- */
let etTodos_ = [], etFiltro_ = '', etSoSem_ = false;
async function etItensAbrir(){
  let m = document.getElementById('etItensModal');
  if(!m){
    m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'etItensModal';
    m.innerHTML = '<div class="modal-box" style="max-width:640px;"><div class="modal-header"><h2>Itens e validades</h2><button class="close-btn" onclick="fecharFormModal(\'etItensModal\');etCarregarLista_()" aria-label="Fechar">✕</button></div><div id="etItensCorpo"></div></div>';
    document.body.appendChild(m);
  }
  abrirFormModal('etItensModal'); await etItensCarregar_();
}
async function etItensCarregar_(){
  const c = document.getElementById('etItensCorpo'); c.innerHTML = '<p class="sub">Carregando…</p>';
  try{ const r = await apiCall('etiquetasLista', { todos: true }); if(!r || !r.ok) throw new Error((r && r.message) || ''); etTodos_ = r.itens || []; }
  catch(e){ c.innerHTML = '<p class="sub">Não foi possível carregar agora.</p>'; return; }
  etItensDesenhar_();
}
function etItensDesenhar_(){
  const c = document.getElementById('etItensCorpo'); if(!c) return;
  const f = etFiltro_.toLowerCase();
  const semDias = i => !i.dias || !Object.keys(i.dias).length;
  const lista = etTodos_.filter(i => (!f || i.nome.toLowerCase().includes(f)) && (!etSoSem_ || semDias(i)));
  c.innerHTML = '<p class="sub">Preencha os dias de validade de cada item (deixe em branco o que não usa). Embaixo de cada item há uma <b>sugestão geral</b> só como dica: confira com a regra da sua vigilância sanitária e coloque o que você quiser. O sistema nunca preenche sozinho.</p>'
    + '<div class="btn-row" style="gap:8px;flex-wrap:wrap;margin:6px 0;"><button type="button" class="small-gold" onclick="etNovoItem()">+ Novo item</button><button type="button" class="ghost" onclick="etImportar()">Trazer ingredientes do estoque</button></div>'
    + '<input id="etBusca" placeholder="Buscar item" value="' + escH(etFiltro_) + '" oninput="etFiltro_=this.value;etItensDesenhar_();document.getElementById(\'etBusca\').focus()">'
    + '<label style="display:block;margin:6px 0;"><input type="checkbox" ' + (etSoSem_ ? 'checked' : '') + ' onchange="etSoSem_=this.checked;etItensDesenhar_()"> Mostrar só os que ainda não têm dias preenchidos (' + etTodos_.filter(semDias).length + ')</label>'
    + '<p class="sub" id="etItensMsg" style="min-height:1.2em;"></p>'
    + (lista.length ? lista.map(i => etCartaoItem_(i)).join('') : '<p class="sub">Nenhum item.' + (etTodos_.length ? '' : ' Toque em "Trazer ingredientes do estoque" para começar.') + '</p>');
}
function etCartaoItem_(i){
  const id = i.id || 'novo', sug = etSugerir_(i.nome), d = i.dias || {};
  const campo = (k, rot) => '<label style="flex:1;min-width:70px;"><span class="obs-line">' + rot + '</span><input type="number" min="0" max="3650" inputmode="numeric" id="etd-' + id + '-' + k + '" value="' + (d[k] != null ? d[k] : '') + '" placeholder="' + (sug.dias[k] != null ? sug.dias[k] : '') + '"></label>';
  return '<div class="notif-card" style="' + (i.ativo === false ? 'opacity:.55;' : '') + '"><div class="btn-row" style="gap:6px;"><input id="etn-' + id + '" value="' + escH(i.nome) + '" maxlength="60" style="flex:1;font-weight:700;">'
    + '<select id="etc-' + id + '">' + ET_CONSERV_.map(c => '<option' + (c === i.conservacao ? ' selected' : '') + '>' + c + '</option>').join('') + '</select></div>'
    + '<div class="btn-row" style="gap:6px;margin-top:6px;">' + campo('aberto', 'Aberto (dias)') + campo('manipulado', 'Manipulado') + campo('descongelado', 'Descongelado') + campo('fechado', 'Fechado') + '</div>'
    + '<div class="obs-line" style="margin-top:4px;">Sugestão: ' + escH(etSugestaoTxt_(i.nome)) + ' · ' + escH(sug.conservacao) + ' <button type="button" class="ghost small" onclick="etUsarSugestao(\'' + id + '\')">Usar sugestão</button></div>'
    + '<div class="btn-row" style="gap:8px;margin-top:6px;"><button type="button" class="small-gold" onclick="etSalvarItem(\'' + id + '\')">Salvar</button>'
    + (i.id ? '<button type="button" class="ghost small" onclick="etAtivar(\'' + id + '\',' + (i.ativo === false ? 'true' : 'false') + ')">' + (i.ativo === false ? 'Reativar' : 'Tirar da lista') + '</button>' : '') + '</div></div>';
}
function etUsarSugestao(id){
  const nome = document.getElementById('etn-' + id).value, s = etSugerir_(nome);
  ['aberto', 'manipulado', 'descongelado'].forEach(k => { document.getElementById('etd-' + id + '-' + k).value = s.dias[k] != null ? s.dias[k] : ''; });
  document.getElementById('etc-' + id).value = s.conservacao;
}
function etLerCartao_(id){
  const dias = {}; ['aberto', 'manipulado', 'descongelado', 'fechado'].forEach(k => { const v = document.getElementById('etd-' + id + '-' + k).value.trim(); if(v !== '') dias[k] = v; });
  return { id: id === 'novo' ? '' : id, nome: document.getElementById('etn-' + id).value.trim(), conservacao: document.getElementById('etc-' + id).value, dias };
}
async function etSalvarItem(id, ativo){
  const p = etLerCartao_(id); if(ativo !== undefined) p.ativo = ativo;
  const msg = document.getElementById('etItensMsg');
  try{ const r = await apiCall('etiquetaSalvar', p); showMsg('etItensMsg', (r && r.message) || 'Não foi possível salvar.', r && r.ok ? 'ok' : 'warn'); if(r && r.ok) await etItensCarregar_(); }
  catch(e){ if(msg) msg.textContent = 'Não foi possível salvar agora.'; }
}
async function etAtivar(id, ativo){
  const it = etTodos_.find(x => x.id === id); if(!it) return;
  try{ const r = await apiCall('etiquetaSalvar', { id, nome: it.nome, conservacao: it.conservacao, dias: it.dias || {}, ativo }); if(r && r.ok) await etItensCarregar_(); else showMsg('etItensMsg', (r && r.message) || 'Não foi possível.', 'warn'); }
  catch(e){ showMsg('etItensMsg', 'Não foi possível agora.', 'warn'); }
}
function etNovoItem(){
  const c = document.getElementById('etItensCorpo'), cont = document.createElement('div');
  cont.innerHTML = etCartaoItem_({ id: '', nome: '', dias: {}, conservacao: 'Refrigerado' });
  const msg = document.getElementById('etItensMsg'); if(msg) msg.parentNode.insertBefore(cont.firstChild, msg.nextSibling);
  const n = document.getElementById('etn-novo'); if(n){ n.placeholder = 'Nome do item (ex.: Molho da casa)'; n.focus(); }
}
async function etImportar(){
  try{ const r = await apiCall('etiquetaImportarEstoque', {}); showMsg('etItensMsg', (r && r.message) || 'Pronto.', r && r.ok ? 'ok' : 'warn'); if(r && r.ok) await etItensCarregar_(); }
  catch(e){ showMsg('etItensMsg', 'Não foi possível agora.', 'warn'); }
}
async function etCarregarLista_(){ try{ const r = await apiCall('etiquetasLista', {}); if(r && r.ok){ etItens_ = r.itens || []; if(document.getElementById('etNome')) etDesenhar_(); } }catch(e){} }
