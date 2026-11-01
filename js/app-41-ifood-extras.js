/* ============================================================================================================
   iFood · recursos OPCIONAIS (todos DESLIGADOS por padrão; ligue em Administrador › Sistema › Integrações e contas › iFood › Ajustes)
   • Conferir repasses  : mostra, em "A receber do iFood", quanto o sistema esperava receber de cada repasse e a diferença.
   • Sugerir resposta   : botão nas avaliações do iFood que escreve um rascunho (você lê, ajusta e só então envia).
   • Acompanhar entrega : no pedido com entrega feita pelo iFood, mostra a posição/previsão do entregador do iFood.
   (O aviso extra de nota 3 é feito no servidor.) Nada aqui muda a venda: só leitura e rascunho.
   ============================================================================================================ */
(function(){
  function opcao_(k){ try{ const it = (typeof integStatus_ !== 'undefined' ? integStatus_ : []).find(i=>i.provedor==='ifood'); return !!(it && it.config && it.config[k]); }catch(e){ return false; } }
  function reais_(n){ return 'R$ ' + (Number(n)||0).toFixed(2).replace('.', ','); }
  function hora_(iso){ if(!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}); }

  /* ---------- 1) conferência de repasses ---------- */
  const finOrig_ = window.carregarIfoodFin_;
  if(typeof finOrig_ === 'function'){
    window.carregarIfoodFin_ = async function(){
      await finOrig_.apply(this, arguments);
      try{
        const box = document.getElementById('ifoodFin'); if(!box) return;
        const r = await apiCall('ifoodConferencia', {});
        if(!r || !r.ok || !r.ligado) return;
        const antigo = document.getElementById('ifoodConf'); if(antigo) antigo.remove();
        const linhas = (r.repasses||[]).map(x=>{
          const dif = Number(x.diferenca)||0; const ok = Math.abs(dif) < 1;
          return `<div class="obs-line" style="color:${ok?'inherit':'#e0a800'};">${ok?'✅':'⚠️'} ${escH(x.pagoEm||'')} · recebido ${reais_(x.recebido)} · esperado ${reais_(x.esperado)} (${x.pedidos} pedido(s))${ok?'':' · diferença '+reais_(dif)}</div>`;
        }).join('') || '<div class="obs-line">Nenhum repasse para conferir ainda.</div>';
        const atr = (r.atrasados||[]).length ? `<div class="obs-line" style="color:#e0a800;">⏳ Pagos no app há mais de 10 dias e ainda sem repasse: ${(r.atrasados||[]).map(a=>'#'+escH(String(a.venda||a.numero||''))).join(', ')}</div>` : '';
        const div = document.createElement('div'); div.id = 'ifoodConf'; div.className = 'notif-card';
        div.innerHTML = `<b>Conferência dos repasses</b>${linhas}${atr}<div class="obs-line txt-muted">Esperado = valor pago no app − comissão estimada dos mesmos pedidos. O iFood pode somar ou descontar outros itens (promoções, ajustes); use a diferença como alerta, não como erro certo.</div>`;
        box.appendChild(div);
      }catch(e){}
    };
  }

  /* ---------- 2) rascunho de resposta às avaliações ---------- */
  function rascunho_(nota){
    const r = (typeof nomeRestaurante_ === 'function' ? nomeRestaurante_() : 'nosso restaurante');
    if(nota >= 4) return `Olá! Muito obrigado pela avaliação e por escolher o ${r}. Ficamos felizes que tenha gostado. Esperamos você de novo!`;
    if(nota === 3) return `Olá! Obrigado pelo retorno. Queremos que sua experiência seja sempre excelente e vamos usar sua avaliação para melhorar. Se puder, conte o que podemos ajustar. Esperamos receber você de novo no ${r}.`;
    return `Olá! Sentimos muito pela sua experiência. Isso não é o padrão que buscamos no ${r}. Pedimos desculpas e queremos resolver: entre em contato com a gente para podermos compensar. Obrigado por nos avisar.`;
  }
  window.ifoodSugerirResposta_ = function(id){
    const inp = document.getElementById('avR_' + id); if(!inp) return;
    const card = inp.closest('.notif-card'); const m = card && /⭐\s*(\d)/.exec(card.textContent || '');
    inp.value = rascunho_(m ? Number(m[1]) : 5).slice(0, 300); inp.focus();
  };
  const avalOrig_ = window.carregarIfoodAval_;
  if(typeof avalOrig_ === 'function'){
    window.carregarIfoodAval_ = async function(){
      await avalOrig_.apply(this, arguments);
      try{
        if(!opcao_('avaliacaoSugestao')) return;
        document.querySelectorAll('#ifoodAval input[id^="avR_"]').forEach(inp=>{
          if(inp.dataset.sug) return; inp.dataset.sug = '1';
          const id = inp.id.slice(4);
          const b = document.createElement('button'); b.type = 'button'; b.className = 'ghost'; b.textContent = '✨ Sugerir resposta';
          b.setAttribute('onclick', `ifoodSugerirResposta_('${id.replace(/'/g, '')}')`);
          inp.insertAdjacentElement('afterend', b);
        });
      }catch(e){}
    };
  }

  /* ---------- 3) onde está o entregador do iFood ---------- */
  let cache_ = { em:0, mapa:{}, ligado:true };
  function preencher_(){
    document.querySelectorAll('[data-rast]').forEach(el=>{
      const x = cache_.mapa[el.getAttribute('data-rast')]; const d = x && x.dados;
      if(!d){ el.innerHTML = ''; return; }
      const ET = {ADR:'Entregador do iFood alocado', GTO:'Entregador do iFood a caminho da loja', AAO:'Entregador do iFood chegou na loja', CLT:'Entregador do iFood pegou o pedido', AAD:'Entregador do iFood chegou ao endereço do cliente', DRGO:'Entregador do iFood voltando à loja', DRDO:'Entregador do iFood voltando à loja'};
      const cod = String(d.etapa || '').toUpperCase();
      const txt = ET[cod] || (cod==='ASSIGN_DRIVER'?ET.ADR:cod==='GOING_TO_ORIGIN'?ET.GTO:cod==='ARRIVED_AT_ORIGIN'?ET.AAO:cod==='COLLECTED'?ET.CLT:cod==='ARRIVED_AT_DESTINATION'?ET.AAD:'');
      if(!txt){ el.innerHTML = ''; return; }
      el.innerHTML = `<div class="obs-line">📍 ${escH(txt)} · às ${escH(hora_(d.em || x.em))}</div>`;
    });
  }
  async function atualizarRastreios_(){
    try{
      if(!document.querySelector('[data-rast]')) return;
      if(!cache_.ligado && Date.now() - cache_.em < 300000) return;   // ajuste desligado: não insiste (reconsulta a cada 5 min)
      if(Date.now() - cache_.em > 25000){
        const r = await apiCall('ifoodRastreios', {});
        cache_.em = Date.now();
        cache_.ligado = !!(r && r.ok && r.ligado);
        cache_.mapa = (r && r.mapa) || {};
      }
      preencher_();
    }catch(e){}
  }
  const entOrig_ = window.renderEntregas;
  if(typeof entOrig_ === 'function'){
    window.renderEntregas = function(){
      const ret = entOrig_.apply(this, arguments);
      try{ preencher_(); setTimeout(atualizarRastreios_, 0); }catch(e){}
      return ret;
    };
  }
})();
