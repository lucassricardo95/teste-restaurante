/* =====================================================================
   v1.15 (Fase 7 — iFood, preparação para a homologação)
   1) "🩺 Estado dos módulos" no cartão do iFood: cada módulo (pedidos, eventos, loja, catálogo, avaliações, financeiro…)
      com OK / recusado (401/403) / limite (429) / erro, último sucesso e último erro. E se a loja configurada pertence ao app.
   2) Cancelar pedido do iFood: a equipe escolhe um dos MOTIVOS OFICIAIS do iFood (exigência da homologação).
   3) Códigos: "código do entregador do iFood" (coleta) e "código de entrega" (quando o iFood pede) com campo para digitar,
      nas telas Pedidos e Entregas.
   Erros sempre aparecem na tela.
   ===================================================================== */
(function(){
  'use strict';
  const fmt = iso => iso ? new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—';
  const erroBox = t => '<div class="msg warn" role="alert" style="display:block;">⚠️ ' + escH(t) + '</div>';

  /* ---------- 1) estado dos módulos ---------- */
  const NOMES = { authentication:'Acesso (token)', events:'Eventos (novos pedidos)', order:'Pedidos', merchant:'Loja (aberta/fechada, horário)', catalog:'Cardápio no iFood',
    review:'Avaliações', financial:'Financeiro', shipping:'Entrega sob demanda', analytics:'Indicadores (Analytics)', logistics:'Logística', outro:'Outros' };
  window.carregarIfoodModulos_ = async function(){
    const box = document.getElementById('ifoodModulos'); if(!box) return;
    box.innerHTML = '<div class="obs-line">⏳ Carregando…</div>';
    try{
      const r = await apiCall('ifoodModulos', {});
      if(!r || !r.ok){ box.innerHTML = erroBox((r && r.message) || 'Não foi possível carregar.'); return; }
      const l = r.loja || {}, mods = r.modulos || [];
      const linha = m => {
        const st = Number(m.status) || 0, ok = st === 200;
        const sit = ok ? '🟢 OK' : st === 401 ? '🔴 Credenciais recusadas (401)' : st === 403 ? '🔴 Não liberado para o app (403)' : st === 429 ? '🟠 Limite de chamadas (429)' : st === 404 ? '🟠 Não encontrado (404)' : '🟠 Erro' + (st ? ' (' + st + ')' : ' de conexão');
        return '<tr><td>' + escH(NOMES[m.modulo] || m.modulo) + '</td><td>' + sit + '</td><td>' + fmt(m.ultimoOk) + '</td><td>' + (m.ultimoErroEm ? fmt(m.ultimoErroEm) + (m.msg && !ok ? '<div class="fs-xs txt-muted">' + escH(String(m.msg).slice(0, 140)) + '</div>' : '') : '—') + '</td></tr>';
      };
      box.innerHTML = '<div class="notif-card"><b>🩺 Estado dos módulos do iFood</b>'
        + '<p class="sub fs-xs" style="margin:4px 0 8px;">Atualiza a cada rodada (30 s). "Não liberado para o app (403)" quer dizer que o iFood ainda não liberou esse módulo: peça no Portal do Desenvolvedor (Permissões / homologação).</p>'
        + (l.merchantValido === false ? erroBox('A loja configurada (Merchant ID) NÃO está entre as lojas deste app no iFood. Confira o Merchant ID.') : l.merchantValido === true ? '<div class="obs-line">✅ A loja configurada pertence a este app (conferido em ' + fmt(l.lojasEm) + ').</div>' : '<div class="obs-line">A lista de lojas do app ainda não foi conferida (acontece 1 vez por dia).</div>')
        + (l.verificadoEm ? '<div class="obs-line">Loja: ' + (l.disponivel ? '🟢 aberta' : '🔴 fechada/indisponível') + (l.motivo ? ' · ' + escH(l.motivo) : '') + ' · conferido ' + fmt(l.verificadoEm) + '</div>' : '')
        + (mods.length ? '<div style="overflow-x:auto;"><table class="tbl fs-xs" style="width:100%;margin-top:6px;"><thead><tr><th>Módulo</th><th>Situação</th><th>Último OK</th><th>Último erro</th></tr></thead><tbody>' + mods.map(linha).join('') + '</tbody></table></div>'
          : '<div class="obs-line">Ainda sem registro: aparece depois da primeira rodada com a integração ligada.</div>')
        + '<div class="btnrow mt-2"><button class="ghost" type="button" onclick="carregarIfoodModulos_()">🔄 Atualizar</button></div></div>';
    }catch(e){ box.innerHTML = erroBox('Sem conexão para carregar o estado dos módulos.'); }
  };
  const extraOrig = window.ifoodExtraHtml_;
  if(typeof extraOrig === 'function' && !extraOrig.__hom){
    const novo = function(it, parte){
      let h = extraOrig.apply(this, arguments);
      if(parte !== 'setup' && typeof h === 'string' && h.indexOf('id="ifoodModulos"') === -1){
        h = h.replace('<div class="btnrow">', '<div class="btnrow"><button class="ghost" onclick="carregarIfoodModulos_()">🩺 Estado dos módulos</button><button class="ghost" onclick="abrirAdministrador(\'ifoodfin\')">💰 Vendas e repasses</button>');
        h = h.replace('<div id="ifoodLoja"></div>', '<div id="ifoodModulos"></div><div id="ifoodLoja"></div>');
      }
      return h;
    };
    novo.__hom = true; window.ifoodExtraHtml_ = novo;
  }

  /* ---------- 2) motivo oficial do iFood ao cancelar ---------- */
  let ctx = null, timer = null;
  function caixa_(){
    let b = document.getElementById('cancelIfoodBox');
    if(!b){
      const sel = document.getElementById('cancelMotivoSelect'); if(!sel) return null;
      b = document.createElement('div'); b.id = 'cancelIfoodBox'; b.style.cssText = 'display:none;margin:10px 0;padding:10px;border:1px solid var(--gold,#d9a21b);border-radius:10px;';
      const lb = document.querySelector('label[for="cancelMotivoSelect"]'), ref = (lb && lb.parentNode === sel.parentNode) ? lb : sel;
      ref.parentNode.insertBefore(b, ref);   // a caixa do iFood fica ANTES do "Motivo do cancelamento" (o motivo interno continua logo abaixo do rótulo dele)
    }
    return b;
  }
  function desenharMotivos_(r){
    const b = caixa_(); if(!b || !ctx) return;
    const lista = (r && r.motivos) || [];
    let h = '<b>🛵 Pedido do iFood: motivo para o iFood *</b><p class="sub fs-xs" style="margin:2px 0 6px;">O iFood só aceita os motivos dele. Escolha o que mais combina.</p>';
    if(lista.length){
      h += '<select id="cancelIfoodMotivo"><option value="">— escolha —</option>' + lista.map(m => '<option value="' + escH(m.codigo) + '"' + (ctx.escolhido === m.codigo ? ' selected' : '') + '>' + escH(m.descricao || m.codigo) + '</option>').join('') + '</select>';
      if(r && r.aguardando) h += '<div class="obs-line fs-xs">⏳ Atualizando a lista com o iFood…</div>';
    } else if(r && r.simulado){
      h += '<div class="obs-line">Pedido de simulação: não há motivo do iFood. Pode cancelar normalmente.</div>';
    } else if(r && r.erro){
      h += erroBox('O iFood não devolveu os motivos (' + r.erro + '). Você pode cancelar mesmo assim: o sistema usa o motivo do iFood mais parecido.') + '<button type="button" class="ghost mt-1" onclick="cancelIfoodRecarregar_()">🔄 Tentar de novo</button>';
    } else {
      h += '<div class="obs-line">⏳ Buscando os motivos no iFood (até 30 segundos)…</div>';
    }
    b.innerHTML = h; b.style.display = 'block';
    ctx.lista = lista; ctx.simulado = !!(r && r.simulado);
    // sem lista: só libera cancelar sem o motivo do iFood quando o iFood respondeu com erro ou a busca desistiu (nunca enquanto ainda está buscando)
    ctx.carregando = !lista.length && !(r && (r.erro || r.simulado)) && !ctx.desistiu;
    ctx.semMotivos = !lista.length && !ctx.carregando;
  }
  async function buscar_(tentativa){
    if(!ctx) return;
    try{
      const r = await apiCall('ifoodMotivos', { vendaId: ctx.vendaId });
      if(!ctx) return;
      if(!r || !r.ok){ const b = caixa_(); if(b){ b.style.display = 'block'; b.innerHTML = erroBox((r && r.message) || 'Não foi possível buscar os motivos do iFood.'); } return; }
      if(!r.ifood){ const b = caixa_(); if(b) b.style.display = 'none'; ctx = null; return; }
      desenharMotivos_(r);
      if((r.aguardando || !(r.motivos || []).length) && !r.erro && !r.simulado && tentativa < 18){ timer = setTimeout(() => buscar_(tentativa + 1), 3000); }
      else if(!(r.motivos || []).length && !r.erro && !r.simulado){   // ~1 min sem resposta do iFood
        ctx.desistiu = true; desenharMotivos_({ motivos: [], erro: 'o iFood não respondeu em 1 minuto' });
      }
    }catch(e){ const b = caixa_(); if(b){ b.style.display = 'block'; b.innerHTML = erroBox('Sem conexão para buscar os motivos do iFood.'); } }
  }
  window.cancelIfoodRecarregar_ = () => { clearTimeout(timer); buscar_(0); };
  const abrirOrig = window.abrirModalCancelar;
  if(typeof abrirOrig === 'function' && !abrirOrig.__hom){
    const novo = function(tipo, id){
      const ret = abrirOrig.apply(this, arguments);
      clearTimeout(timer); ctx = null;
      const b = caixa_(); if(b){ b.style.display = 'none'; b.innerHTML = ''; }
      try{
        const v = tipo === 'venda' && (vendas || []).find(x => x.id === id);
        if(v && String(v.canal || '') === 'iFood'){ ctx = { vendaId: id }; desenharMotivos_(null); buscar_(0); }
      }catch(e){}
      return ret;
    };
    novo.__hom = true; window.abrirModalCancelar = novo;
  }
  const fecharOrig = window.fecharModalCancelar;
  if(typeof fecharOrig === 'function' && !fecharOrig.__hom){
    const novo = function(){ clearTimeout(timer); ctx = null; return fecharOrig.apply(this, arguments); };
    novo.__hom = true; window.fecharModalCancelar = novo;
  }
  const confOrig = window.confirmarCancelamento;
  if(typeof confOrig === 'function' && !confOrig.__hom){
    const novo = async function(){
      if(ctx && ctx.carregando){ showMsg('cancelMsg', 'Aguarde: buscando no iFood os motivos oficiais (até 1 minuto).', 'warn'); return; }
      if(ctx && !ctx.simulado && !ctx.semMotivos){
        const sel = document.getElementById('cancelIfoodMotivo');
        const cod = sel ? sel.value : '';
        if(!cod){ showMsg('cancelMsg', 'Escolha o motivo do iFood (lista com a borda dourada).', 'warn'); try{ sel && sel.focus(); }catch(e){} return; }
        const desc = (ctx.lista.find(m => m.codigo === cod) || {}).descricao || '';
        try{
          const r = await apiCall('ifoodMotivoEscolher', { vendaId: ctx.vendaId, codigo: cod, descricao: desc });
          if(!r || !r.ok){ showMsg('cancelMsg', (r && r.message) || 'Não foi possível guardar o motivo do iFood. Nada foi cancelado.', 'warn'); return; }
          ctx.escolhido = cod;
        }catch(e){ showMsg('cancelMsg', 'Sem conexão: o motivo do iFood não foi guardado. Nada foi cancelado.', 'warn'); return; }
      }
      return confOrig.apply(this, arguments);
    };
    novo.__hom = true; window.confirmarCancelamento = novo;
  }

  /* ---------- 3) códigos de coleta e de entrega ---------- */
  let codigos = [], codEm = 0, codBusy = false, codFalha = 0;
  async function atualizarCodigos_(forcar){
    if(codBusy) return;
    if(!forcar && Date.now() - codEm < 20000){ desenharCodigos_(); return; }
    codBusy = true;
    try{ const r = await apiCall('ifoodCodigosPendentes', {}); if(r && r.ok){ codigos = r.lista || []; codEm = Date.now(); codFalha = 0; } else codFalha++; }
    catch(e){ codFalha++; } finally { codBusy = false; }
    if(codFalha >= 3 && codigos.length){ try{ avisar('📡 Não consegui conferir os códigos do iFood agora. Confira a internet.', 'erro', 8000); }catch(e){} codFalha = 0; }
    desenharCodigos_();
  }
  function desenharCodigos_(){
    ['tab-pedidos', 'tab-entregas'].forEach(tid => {
      const sec = document.getElementById(tid); if(!sec) return;
      let b = sec.querySelector('.ifood-codigos');
      if(!codigos.length){ if(b) b.remove(); return; }
      if(!b){ b = document.createElement('div'); b.className = 'card ifood-codigos'; b.style.borderLeft = '4px solid var(--gold,#d9a21b)'; const nav = sec.querySelector('.admin-subnav'); sec.insertBefore(b, nav ? nav.nextSibling : sec.firstChild); }
      const ativo = document.activeElement && b.contains(document.activeElement);
      if(ativo) return;   // não redesenha enquanto alguém digita
      b.innerHTML = '<b>🔐 O iFood precisa de um código</b>' + codigos.map(c => {
        const t = c.tipo === 'coleta' ? 'Peça ao ENTREGADOR DO iFOOD o código de coleta e digite aqui antes de entregar o pedido a ele.' : 'O iFood pediu o CÓDIGO DE ENTREGA: o cliente informa ao entregador. Digite aqui para concluir.';
        const id = 'ifCod_' + c.vendaId;
        return '<div class="mt-2" style="border-top:1px solid var(--line,#3a2d1d);padding-top:8px;"><div><b>Pedido #' + escH(String(c.numero)) + '</b> · iFood #' + escH(String(c.ifood || '')) + ' · ' + escH(c.cliente || '') + '</div>'
          + '<div class="sub fs-xs" style="margin:2px 0 6px;">' + t + '</div>'
          + (c.erro ? erroBox('O iFood recusou: ' + c.erro + '. Confira e digite de novo.') : '')
          + (c.enviando ? '<div class="obs-line">⏳ Código enviado; aguardando a resposta do iFood (até 30 s)…</div>'
             : '<div class="d-flex" style="gap:6px;"><input id="' + id + '" inputmode="numeric" autocomplete="one-time-code" maxlength="12" placeholder="Código" style="max-width:140px;"><button class="primary" type="button" onclick="ifoodEnviarCodigo_(\'' + c.vendaId + '\',\'' + c.tipo + '\')">Enviar</button></div>')
          + '<div id="ifCodMsg_' + c.vendaId + '" class="msg"></div></div>';
      }).join('');
    });
  }
  window.ifoodEnviarCodigo_ = async function(vendaId, tipo){
    const inp = document.getElementById('ifCod_' + vendaId), codigo = inp ? inp.value.trim() : '';
    if(!codigo){ showMsg('ifCodMsg_' + vendaId, 'Digite o código.', 'warn'); return; }
    try{
      const r = await apiCall('ifoodCodigo', { vendaId, tipo, codigo });
      if(r && r.ok){ if(inp) inp.blur(); showMsg('ifCodMsg_' + vendaId, r.message || 'Enviado.', 'ok'); setTimeout(() => atualizarCodigos_(true), 1500); setTimeout(() => atualizarCodigos_(true), 32000); }
      else showMsg('ifCodMsg_' + vendaId, (r && r.message) || 'Não foi possível enviar.', 'warn');
    }catch(e){ showMsg('ifCodMsg_' + vendaId, 'Sem conexão. O código não foi enviado.', 'warn'); }
  };
  ['renderPedidos', 'renderEntregas'].forEach(nome => {
    const o = window[nome];
    if(typeof o !== 'function' || o.__homc) return;
    const n = function(){ const r = o.apply(this, arguments); try{ if(currentUser && apiConfigurada()) atualizarCodigos_(false); }catch(e){} return r; };
    Object.keys(o).forEach(k => { try{ n[k] = o[k]; }catch(e){} });
    n.__homc = true; window[nome] = n;
  });
  setInterval(() => {
    try{
      if(document.hidden || !currentUser || !apiConfigurada()) return;
      const ativa = ['tab-pedidos', 'tab-entregas'].some(id => { const s = document.getElementById(id); return s && s.classList.contains('active'); });
      if(ativa) atualizarCodigos_(false);
    }catch(e){}
  }, 20000);
})();
