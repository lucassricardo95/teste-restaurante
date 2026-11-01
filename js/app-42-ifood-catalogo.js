/* ============================================================================================================
   iFood · CARDÁPIO NO IFOOD (Catalog): categorias, itens (nome, descrição, preço, foto, pausa), grupos de complementos e
   complementos, e preço/status em massa. Tela em Administrador › Integrações e contas › iFood › "Cardápio no iFood".
   O sistema guarda o modelo e o servidor envia ao iFood (só o Administrador). Nada aqui muda os produtos do seu cardápio.
   ⚠️ Ainda não testado com o iFood de verdade: se o iFood recusar, o motivo aparece em vermelho no registro.
   ============================================================================================================ */
(function(){
  let dados_ = [];          /* registros do servidor */
  let form_ = null;         /* { tipo, id } do formulário aberto */
  let fotoNova_ = null;     /* foto escolhida (data URL) para o formulário aberto */

  const ROT_ = { categoria:'Categorias', item:'Itens', grupo:'Grupos de complementos', opcao:'Complementos' };
  const reais_ = n => 'R$ ' + (Number(n)||0).toFixed(2).replace('.', ',');
  const msg_ = (t, k)=>{ try{ showMsg(integMsgId_(), t, k||'ok'); }catch(e){} };
  const por_ = tipo => dados_.filter(x=>x.tipo===tipo);
  const acha_ = id => dados_.find(x=>x.id===id);
  const stRot_ = s => s==='UNAVAILABLE' ? 'Pausado' : 'Ativo';
  const estRot_ = x => ({ rascunho:'✏️ não enviado', pendente:'⏳ enviando…', enviado:'✅ enviado', erro:'❌ erro' })[x.estado] || x.estado;

  window.carregarIfoodCat_ = async function(){
    const box = document.getElementById('ifoodCat'); if(!box) return;
    try{
      const r = await apiCall('ifoodCat', {});
      if(!r || !r.ok){ box.innerHTML = '<div class="obs-line">' + escH((r && r.message) || 'Não foi possível carregar.') + '</div>'; return; }
      dados_ = r.itens || []; render_();
    }catch(e){ box.innerHTML = '<div class="obs-line">Sem conexão.</div>'; }
  };

  function linha_(x){
    const d = x.dados || {};
    let info = '';
    if(x.tipo==='item' || x.tipo==='opcao') info = reais_(d.preco) + ' · ' + stRot_(d.status) + (d.combo?' · combo':'');
    else if(x.tipo==='categoria') info = stRot_(d.status);
    else if(x.tipo==='grupo') info = ({OFFER_UNIT:'escolha',INGREDIENTS:'ingredientes',SPECIFICATION:'preparo',CUTLERY:'talheres'})[d.tipoGrupo||'OFFER_UNIT'] + ' · ' + ((d.opcoes||[]).map(o=>{ const c = acha_(o.id); return c ? c.nome : ''; }).filter(Boolean).join(', ')) || 'sem complementos';
    const enviavel = x.tipo==='categoria' || x.tipo==='item';
    return `<div class="notif-card" style="border-left:4px solid ${x.estado==='erro'?'#c0392b':x.estado==='enviado'?'#2e9e5b':'#888'};">
      <b>${escH(x.nome)}</b> <span class="obs-line" style="display:inline;">· ${escH(info)} · ${estRot_(x)}${d.foto?' · 📷':''}${d.temFotoPendente?' · 📷 nova foto aguardando envio':''}</span>
      ${x.erro?`<div class="obs-line" style="color:#c0392b;">iFood: ${escH(x.erro)}</div>`:''}
      <div class="btnrow mt-2"><button class="ghost" onclick="ifCatForm_('${x.tipo}','${x.id}')">Editar</button>
        ${enviavel?`<button class="small-gold" onclick="ifCatEnviar_('${x.id}')">${x.estado==='enviado'?'Enviar alterações':'Enviar ao iFood'}</button>`:''}
        <button class="ghost" onclick="ifCatEsconder_('${x.id}')">Tirar da lista</button></div></div>`;
  }

  function render_(){
    const box = document.getElementById('ifoodCat'); if(!box) return;
    const secoes = ['categoria','item','grupo','opcao'].map(t=>`<div class="obs-line mt-2"><b>${ROT_[t]}</b> <button class="ghost" style="width:auto;padding:2px 10px;min-height:28px;" onclick="ifCatForm_('${t}','')">+ Novo</button></div>${por_(t).map(linha_).join('') || '<div class="obs-line txt-muted">Nenhum ainda.</div>'}`).join('');
    box.innerHTML = `<div class="notif-card" style="border-left:4px solid #888;"><b>Cardápio no iFood</b>
      <div class="obs-line">Aqui você cria e edita o cardápio direto no iFood: crie a categoria, o item (com preço e foto), os complementos e os grupos, e toque em "Enviar ao iFood". Preço e pausa, depois de enviados, vão por chamadas próprias do iFood. Grupos e complementos seguem junto com o item.</div>
      <div class="btnrow mt-2"><button class="ghost" onclick="carregarIfoodCat_()">Atualizar</button></div></div>
      <div id="ifCatForm"></div>${secoes}<div id="ifCatLote"></div><div id="ifCatDiag"></div>`;
    if(form_) abrirForm_(form_.tipo, form_.id, true);
    renderLote_(); carregarDiag_();
  }

  /* ---------- formulário ---------- */
  window.ifCatForm_ = function(tipo, id){ form_ = { tipo, id }; fotoNova_ = null; abrirForm_(tipo, id); };
  function opcoesStatus_(v){ return `<option value="AVAILABLE" ${v!=='UNAVAILABLE'?'selected':''}>Ativo</option><option value="UNAVAILABLE" ${v==='UNAVAILABLE'?'selected':''}>Pausado</option>`; }
  function abrirForm_(tipo, id, manter){
    const alvo = document.getElementById('ifCatForm'); if(!alvo) return;
    const x = id ? acha_(id) : null; const d = (x && x.dados) || {};
    const campoFoto = `<label>Foto ${d.foto?'(já enviada; escolha outra só para trocar)':''}</label><input type="file" id="ifcFoto" accept="image/*" onchange="ifCatFoto_(this)"><div class="obs-line" id="ifcFotoInfo">${fotoNova_?'Foto escolhida.':''}</div>`;
    let corpo = `<label>Nome *</label><input type="text" id="ifcNome" maxlength="100" value="${escH(x?x.nome:'')}">`;
    if(tipo==='categoria') corpo += `<label>Status</label><select id="ifcStatus">${opcoesStatus_(d.status)}</select>`;
    if(tipo==='item' || tipo==='opcao'){
      corpo += `<label>Descrição</label><input type="text" id="ifcDesc" maxlength="500" value="${escH(d.descricao||'')}">
        <label>Preço (R$) *${tipo==='item'?' (maior que zero)':''}</label><input type="number" id="ifcPreco" step="0.01" min="0" inputmode="decimal" value="${d.preco!==undefined?escH(String(d.preco)):''}">
        <label>Status</label><select id="ifcStatus">${opcoesStatus_(d.status)}</select>${campoFoto}`;
    }
    if(tipo==='item'){
      const cats = por_('categoria');
      corpo += `<label>Categoria *</label><select id="ifcCat"><option value="">Escolher…</option>${cats.map(c=>`<option value="${c.id}" ${d.categoriaId===c.id?'selected':''}>${escH(c.nome)}${(c.dados||{}).ifoodId?'':' (não enviada)'}</option>`).join('')}</select>
        <div class="obs-line mt-2"><label style="display:inline;"><input type="checkbox" id="ifcCombo" ${d.combo?'checked':''}> É um combo (o iFood o trata como combo e o inclui nas campanhas automáticas; o PRIMEIRO grupo marcado abaixo é o principal)</label></div>
        <div class="obs-line mt-2"><b>Grupos de complementos deste item</b></div>` +
        (por_('grupo').map(g=>{ const at = (d.grupos||[]).find(z=>z.id===g.id); return `<div class="obs-line"><label style="display:inline;"><input type="checkbox" class="ifcG" value="${g.id}" ${at?'checked':''}> ${escH(g.nome)}</label> mín <input type="number" class="ifcGmin" data-g="${g.id}" min="0" value="${at?at.min:0}" style="width:60px;display:inline;"> máx <input type="number" class="ifcGmax" data-g="${g.id}" min="1" value="${at?at.max:1}" style="width:60px;display:inline;"></div>`; }).join('') || '<div class="obs-line txt-muted">Crie um grupo em "Grupos de complementos" para usar aqui.</div>');
    }
    if(tipo==='grupo'){
      const ops = por_('opcao');
      const tg = d.tipoGrupo || 'OFFER_UNIT';
      corpo += `<label>Tipo do grupo *</label><select id="ifcTipoGrupo">${[['OFFER_UNIT','Escolha ou adicional (ex.: escolha o refrigerante, adicionais)'],['INGREDIENTS','Retirar ou acrescentar ingrediente (ex.: sem cebola)'],['SPECIFICATION','Especificação de preparo (ex.: ponto da carne)'],['CUTLERY','Talheres e guardanapo']].map(([v,t])=>`<option value="${v}" ${tg===v?'selected':''}>${t}</option>`).join('')}</select>` + `<div class="obs-line mt-2"><b>Complementos deste grupo</b></div>` + (ops.map(o=>`<div class="obs-line"><label style="display:inline;"><input type="checkbox" class="ifcO" value="${o.id}" ${(d.opcoes||[]).some(z=>z.id===o.id)?'checked':''}> ${escH(o.nome)} (${reais_((o.dados||{}).preco)})</label></div>`).join('') || '<div class="obs-line txt-muted">Crie complementos em "Complementos" para usar aqui.</div>');
    }
    alvo.innerHTML = `<div class="notif-card" style="border-left:4px solid var(--gold);"><b>${x?'Editar':'Novo'} · ${escH(({categoria:'categoria',item:'item',grupo:'grupo de complementos',opcao:'complemento'})[tipo])}</b>
      ${corpo}
      <div class="btnrow mt-2"><button class="primary" onclick="ifCatSalvar_()">Salvar</button><button class="ghost" onclick="ifCatFechar_()">Cancelar</button></div></div>`;
    if(!manter) try{ alvo.scrollIntoView({ behavior:'smooth', block:'start' }); }catch(e){}
  }
  window.ifCatFechar_ = function(){ form_ = null; fotoNova_ = null; const a = document.getElementById('ifCatForm'); if(a) a.innerHTML = ''; };

  /* foto: reduz no aparelho (lado maior 1000 px, JPEG) para o envio ser leve */
  window.ifCatFoto_ = function(inp){
    const f = inp.files && inp.files[0]; if(!f) return;
    const info = document.getElementById('ifcFotoInfo'); if(info) info.textContent = 'Preparando a foto…';
    const rd = new FileReader();
    rd.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        const k = Math.min(1, 1000 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width*k); c.height = Math.round(img.height*k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        fotoNova_ = c.toDataURL('image/jpeg', 0.82);
        if(info) info.textContent = 'Foto pronta (' + c.width + '×' + c.height + ').';
      };
      img.onerror = ()=>{ fotoNova_ = null; if(info) info.textContent = 'Não consegui ler essa foto.'; };
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
  };

  window.ifCatSalvar_ = async function(){
    if(!form_) return;
    const tipo = form_.tipo, id = form_.id || '';
    const nome = (document.getElementById('ifcNome')||{}).value || '';
    if(!nome.trim()) return msg_('Informe o nome.', 'warn');
    const dd = {};
    const v = k => (document.getElementById(k)||{}).value;
    if(v('ifcStatus') !== undefined) dd.status = v('ifcStatus');
    if(tipo==='item' || tipo==='opcao'){
      if(v('ifcPreco')==='' ) return msg_('Informe o preço.', 'warn');
      dd.preco = Number(v('ifcPreco')); dd.descricao = (v('ifcDesc')||'').trim();
      if(fotoNova_) dd.fotoPendente = fotoNova_;
    }
    if(tipo==='item'){
      dd.categoriaId = v('ifcCat') || '';
      if(!dd.categoriaId) return msg_('Escolha a categoria.', 'warn');
      dd.combo = !!(document.getElementById('ifcCombo')||{}).checked;
      dd.grupos = [];
      document.querySelectorAll('.ifcG:checked').forEach(ch=>{
        const g = ch.value; const mn = document.querySelector('.ifcGmin[data-g="'+g+'"]'), mx = document.querySelector('.ifcGmax[data-g="'+g+'"]');
        dd.grupos.push({ id:g, min:Math.max(0, Number(mn&&mn.value)||0), max:Math.max(1, Number(mx&&mx.value)||1) });
      });
    }
    if(tipo==='grupo'){ dd.tipoGrupo = v('ifcTipoGrupo') || 'OFFER_UNIT'; dd.opcoes = []; document.querySelectorAll('.ifcO:checked').forEach(ch=>dd.opcoes.push({ id:ch.value })); }
    try{
      const r = await apiCall('ifoodCatSalvar', { id, tipo, nome:nome.trim(), dados:dd });
      if(r && r.ok){ dados_ = r.itens || []; form_ = null; fotoNova_ = null; render_(); msg_('Salvo no sistema. Toque em "Enviar ao iFood" quando estiver pronto.'); }
      else msg_((r && r.message) || 'Não foi possível salvar.', 'warn');
    }catch(e){ msg_('Sem conexão.', 'warn'); }
  };

  window.ifCatEnviar_ = async function(id){
    const x = acha_(id); if(!x) return;
    if(!await confirmarTxt_('Enviar "' + x.nome + '" ao iFood agora?')) return;
    try{
      const r = await apiCall('ifoodCatEnviar', { id });
      if(r && r.ok){ dados_ = r.itens || []; render_(); msg_(r.message || 'Enviando.'); setTimeout(carregarIfoodCat_, 8000); setTimeout(carregarIfoodCat_, 20000); }
      else msg_((r && r.message) || 'Não foi possível enviar.', 'warn');
    }catch(e){ msg_('Sem conexão.', 'warn'); }
  };
  window.ifCatEsconder_ = async function(id){
    const x = acha_(id); if(!x) return;
    if(!await confirmarTxt_('Tirar "' + x.nome + '" desta lista? No iFood nada é apagado.')) return;
    const senhaAdminConfirmacao = await pedirSenha_(); if(!senhaAdminConfirmacao) return;
    try{ const r = await apiCall('ifoodCatExcluir', { id, senhaAdminConfirmacao }); if(r && r.ok){ dados_ = r.itens || []; render_(); } else msg_((r && r.message) || 'Não foi possível.', 'warn'); }catch(e){ msg_('Sem conexão.', 'warn'); }
  };

  /* ---------- por que o item não aparece no app do iFood (unsellableItems) ---------- */
  async function carregarDiag_(){
    const box = document.getElementById('ifCatDiag'); if(!box) return;
    let corpo = '<div class="obs-line txt-muted">Ainda sem diagnóstico. Toque em "Perguntar ao iFood".</div>';
    try{
      const r = await apiCall('ifoodCatDiag', {});
      if(r && r.ok && !r.vazio){
        const it = r.itens || [];
        corpo = `<div class="obs-line">Último diagnóstico: ${escH(new Date(r.em).toLocaleString('pt-BR'))}</div>` + (it.length ? it.map(i=>`<div class="obs-line" style="border-left:4px solid #e67e22;padding-left:8px;"><b>${escH(i.nome||'')}</b><br>${escH(i.oQueFazer||'')}</div>`).join('') : '<div class="obs-line">✅ Nenhum item bloqueado: todos os itens enviados estão vendáveis.</div>');
      } else if(r && !r.ok) corpo = '<div class="obs-line">' + escH(r.message||'Não foi possível carregar o diagnóstico.') + '</div>';
    }catch(e){ corpo = '<div class="obs-line">Sem conexão ao carregar o diagnóstico.</div>'; }
    box.innerHTML = `<div class="notif-card" style="border-left:4px solid #888;"><b>Por que um item não aparece no app do iFood?</b>
      <div class="obs-line">O iFood diz quais itens estão bloqueados para venda (categoria ou item pausado, sem preço, grupo obrigatório sem complemento disponível).</div>
      <div class="btnrow mt-2"><button class="ghost" onclick="ifCatDiagPedir_()">Perguntar ao iFood</button><button class="ghost" onclick="ifCatDiagAtualizar_()">Atualizar diagnóstico</button></div>${corpo}</div>`;
  }
  window.ifCatDiagAtualizar_ = carregarDiag_;
  window.ifCatDiagPedir_ = async function(){
    try{ const r = await apiCall('ifoodCatDiagPedir', {}); msg_((r&&r.message)||'Não foi possível.', r&&r.ok?'ok':'warn'); if(r&&r.ok){ setTimeout(carregarDiag_, 8000); setTimeout(carregarDiag_, 20000); } }catch(e){ msg_('Sem conexão.', 'warn'); }
  };

  /* ---------- preço / status em massa ---------- */
  let lote_ = { alvo:'item', modo:'preco' };
  function renderLote_(){
    const box = document.getElementById('ifCatLote'); if(!box) return;
    const lista = por_(lote_.alvo).filter(x=>(x.dados||{}).enviado);
    const preco = lote_.modo==='preco';
    box.innerHTML = `<div class="notif-card" style="border-left:4px solid #888;"><b>Preço e status em massa</b>
      <div class="obs-line">Muda vários de uma vez, em uma única chamada ao iFood. Só aparecem os já enviados.</div>
      <div class="btnrow mt-2"><select id="ifLoteAlvo" onchange="ifCatLoteMuda_()"><option value="item" ${lote_.alvo==='item'?'selected':''}>Itens</option><option value="opcao" ${lote_.alvo==='opcao'?'selected':''}>Complementos</option></select>
        <select id="ifLoteModo" onchange="ifCatLoteMuda_()"><option value="preco" ${preco?'selected':''}>Preço</option><option value="status" ${!preco?'selected':''}>Ativar / pausar</option></select></div>
      ${lista.map(x=>`<div class="obs-line" style="display:flex;gap:6px;align-items:center;"><label style="flex:1;"><input type="checkbox" class="ifLoteCk" value="${x.id}"> ${escH(x.nome)} <span class="txt-muted">(${reais_((x.dados||{}).preco)} · ${stRot_((x.dados||{}).status)})</span></label>
        ${preco?`<input type="number" step="0.01" min="0" class="ifLoteVal" data-id="${x.id}" placeholder="novo preço" style="width:110px;">`:''}</div>`).join('') || '<div class="obs-line txt-muted">Nada enviado ainda.</div>'}
      ${(!preco && lista.length)?`<div class="btnrow mt-2"><select id="ifLoteSt"><option value="UNAVAILABLE">Pausar os marcados</option><option value="AVAILABLE">Ativar os marcados</option></select></div>`:''}
      ${lista.length?`<div class="btnrow mt-2"><button class="primary" onclick="ifCatLoteEnviar_()">Enviar em massa</button></div>`:''}</div>`;
  }
  window.ifCatLoteMuda_ = function(){ lote_.alvo = document.getElementById('ifLoteAlvo').value; lote_.modo = document.getElementById('ifLoteModo').value; renderLote_(); };
  window.ifCatLoteEnviar_ = async function(){
    const marcados = Array.from(document.querySelectorAll('.ifLoteCk:checked')).map(c=>c.value);
    if(!marcados.length) return msg_('Marque ao menos um.', 'warn');
    const preco = lote_.modo==='preco'; const itens = [];
    for(const id of marcados){
      if(preco){ const el = document.querySelector('.ifLoteVal[data-id="'+id+'"]'); if(!el || el.value==='') return msg_('Informe o novo preço de todos os marcados.', 'warn'); itens.push({ id, valor:Number(el.value) }); }
      else itens.push({ id, valor:(document.getElementById('ifLoteSt')||{}).value || 'UNAVAILABLE' });
    }
    if(!await confirmarTxt_('Enviar ' + itens.length + ' alteração(ões) ao iFood de uma vez?')) return;
    try{
      const r = await apiCall('ifoodCatLote', { modo:(lote_.alvo==='opcao'?'opcao_':'') + lote_.modo, itens });
      msg_((r && r.message) || 'Não foi possível.', r && r.ok ? 'ok' : 'warn');
      if(r && r.ok){ setTimeout(carregarIfoodCat_, 8000); setTimeout(carregarIfoodCat_, 20000); }
    }catch(e){ msg_('Sem conexão.', 'warn'); }
  };
})();
