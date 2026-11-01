/* ============================================================================================================
   iFood · INDICADORES (Analytics) — Administrador › Sistema › Integrações e contas › iFood › "Indicadores (até ontem)"
   Números AGREGADOS do iFood (faturamento, pedidos, ticket, cancelamentos, canal, pagamento, entrega, dia, hora, tempos).
   Os dados do iFood Analytics são HISTÓRICOS (D-1): chegam sempre até ONTEM, nunca em tempo real e nunca pedido a pedido.
   Precisa de um segundo aplicativo (categoria BI) no Portal do Desenvolvedor; digite o Client ID/Secret dele em Integrações › iFood.
   ============================================================================================================ */
(function(){
  const reais = n => 'R$ ' + (Number(n)||0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const dBr = iso => { const p = String(iso||'').slice(0,10).split('-'); return p.length===3 ? p[2]+'/'+p[1]+'/'+p[0] : ''; };
  const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  let ontem_ = null, timer_ = null;
  const box = () => document.getElementById('ifoodBI');
  const msg = (t, tipo) => { try{ showMsg(integMsgId_(), t, tipo||'warn'); }catch(e){ alert(t); } };

  function periodo_(){
    const de = (document.getElementById('biDe')||{}).value, ate = (document.getElementById('biAte')||{}).value;
    return { de, ate };
  }
  window.biPreset_ = function(tipo){
    const o = ontem_ ? new Date(ontem_ + 'T12:00:00') : new Date(Date.now() - 86400000);
    let de = new Date(o), ate = new Date(o);
    if(tipo === '7') de.setDate(de.getDate() - 6);
    else if(tipo === '30') de.setDate(de.getDate() - 29);
    else if(tipo === 'mes'){ ate = new Date(o.getFullYear(), o.getMonth(), 0, 12); de = new Date(o.getFullYear(), o.getMonth() - 1, 1, 12); }
    document.getElementById('biDe').value = iso(de); document.getElementById('biAte').value = iso(ate);
    carregarIfoodBI_(true);
  };

  window.carregarIfoodBI_ = async function(manter){
    const b = box(); if(!b) return;
    const p = manter === true || manter === 'auto' ? periodo_() : {};
    try{
      const r = await apiCall('ifoodBiLer', p.de ? p : {});
      if(!r || !r.ok){ b.innerHTML = '<div class="obs-line">' + escH((r && r.message) || 'Não foi possível carregar os indicadores.') + '</div>'; return; }
      ontem_ = r.ontem; desenhar_(r);
      clearTimeout(timer_);
      if(r.buscando && document.getElementById('ifoodBI')) timer_ = setTimeout(()=>carregarIfoodBI_('auto'), 5000);
    }catch(e){ if(manter !== 'auto') b.innerHTML = '<div class="obs-line">Sem conexão. Confira a internet e tente de novo.</div>'; }
  };

  window.buscarIfoodBI_ = async function(){
    const p = periodo_();
    try{ const r = await apiCall('ifoodBiBuscar', p); msg((r&&r.message)||'Não foi possível.', r&&r.ok?'ok':'warn'); if(r && r.ok) setTimeout(()=>carregarIfoodBI_('auto'), 1500); }
    catch(e){ msg('Sem conexão. Confira a internet e tente de novo.'); }
  };

  function barras_(lista, fmt){
    const max = Math.max(1, ...lista.map(x=>x.gmv));
    return lista.map(x=>`<div class="obs-line" style="display:flex;gap:8px;align-items:center"><span style="min-width:150px">${escH(x.nome)}</span>
      <span style="flex:1;background:rgba(212,175,55,.15);border-radius:6px;height:10px"><span style="display:block;height:10px;border-radius:6px;background:#d4af37;width:${Math.max(2, Math.round(x.gmv*100/max))}%"></span></span>
      <span style="min-width:190px;text-align:right">${x.pedidos} ped. · ${reais(x.gmv)}</span></div>`).join('') || '<div class="obs-line">Sem dados neste período.</div>';
  }
  function tabela_(tit, lista, dica){
    return `<div class="notif-card"><b>${tit}</b>${dica?'<div class="obs-line"><small>'+dica+'</small></div>':''}${barras_(lista||[])}</div>`;
  }

  function desenhar_(r){
    const b = box();
    const topo = `<div class="notif-card"><b>📊 Indicadores do iFood</b>
      <div class="obs-line" style="border-left:4px solid #e67e22;padding-left:8px">⏳ Os números do iFood chegam <b>com 1 dia de atraso (D-1)</b>: vão <b>até ontem (${escH(dBr(r.ontem))})</b>. Hoje não aparece aqui. Mostra totais por dia, não pedido a pedido.</div>
      ${r.chavesOk ? '' : '<div class="obs-line" style="color:#c0392b">⚠️ Falta digitar o Client ID e o Client Secret do <b>aplicativo BI</b> (Analytics) em Integrações › iFood › chaves. Ele é um segundo aplicativo no Portal do Desenvolvedor do iFood, da categoria BI.</div>'}
      <div class="inline-form" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        De <input type="date" id="biDe" value="${escH(r.de)}" max="${escH(r.ontem)}"> até <input type="date" id="biAte" value="${escH(r.ate)}" max="${escH(r.ontem)}">
        <button onclick="buscarIfoodBI_()">Buscar no iFood</button>
        <button class="ghost" onclick="carregarIfoodBI_(true)">Ver o que já foi buscado</button></div>
      <div class="btnrow"><button class="ghost" onclick="biPreset_('1')">Ontem</button><button class="ghost" onclick="biPreset_('7')">Últimos 7 dias</button><button class="ghost" onclick="biPreset_('30')">Últimos 30 dias</button><button class="ghost" onclick="biPreset_('mes')">Mês passado</button></div></div>`;
    if(r.buscando){ b.innerHTML = topo + '<div class="obs-line">⏳ Buscando os números no iFood… isto atualiza sozinho.</div>'; return; }
    const erro = r.erro ? `<div class="obs-line" style="color:#c0392b;border-left:4px solid #c0392b;padding-left:8px">⚠️ Não foi possível buscar: ${escH(r.erro)}</div>` : '';
    const d = r.dados;
    if(!d){ b.innerHTML = topo + erro + (r.erro ? '' : '<div class="obs-line">Nada buscado para este período ainda. Toque em "Buscar no iFood".</div>'); return; }
    const s = d.resumo || {}, t = d.tempos || {};
    const card = (rot, val, sub) => `<div class="notif-card" style="flex:1 1 150px;min-width:150px"><div class="obs-line"><small>${rot}</small></div><div style="font-size:1.35em;font-weight:700">${val}</div>${sub?'<div class="obs-line"><small>'+sub+'</small></div>':''}</div>`;
    const kpis = `<div style="display:flex;gap:8px;flex-wrap:wrap">
      ${card('Faturamento (concluídos)', reais(s.gmvConcluidos), 'produtos + entrega: ' + reais(s.gmvConcluidos) + ' · só produtos: ' + reais(s.gmvSemEntregaConcluidos))}
      ${card('Pedidos concluídos', s.concluidos||0, 'de ' + (s.pedidosTotal||0) + ' pedidos no período')}
      ${card('Ticket médio', reais(s.ticketMedio), 'faturamento ÷ pedidos concluídos')}
      ${card('Cancelamento', (s.taxaCancelamentoPct||0).toString().replace('.',',') + '%', (s.cancelados||0) + ' pedido(s) · ' + reais(s.gmvCancelados) + ' deixaram de entrar')}
    </div>`;
    const tempos = `<div class="notif-card"><b>⏱ Tempos médios (pedidos concluídos)</b>
      <div class="obs-line">Aceitar o pedido: <b>${t.aceitarMin||0} min</b> · Preparo: <b>${t.preparoMin||0} min</b> · Entrega: <b>${t.entregaMin||0} min</b> (previsto ${t.previstoMin||0} min) · Atraso médio: <b>${t.atrasoMin||0} min</b> · Distância média: <b>${t.distanciaKm||0} km</b> · Reembolsado: <b>${reais(t.reembolsado)}</b></div></div>`;
    const canc = (d.cancelamentos||[]).length ? `<div class="notif-card"><b>❌ Motivos de cancelamento</b>${d.cancelamentos.map(x=>`<div class="obs-line">${escH(x.nome)}: ${x.pedidos} pedido(s) · ${reais(x.gmv)}</div>`).join('')}</div>` : '';
    const avisos = (d.avisos||[]).length ? `<div class="obs-line" style="color:#e0a800">⚠️ Algumas partes não vieram do iFood: ${d.avisos.map(escH).join(' | ')}</div>` : '';
    b.innerHTML = topo + erro + `<div class="obs-line"><small>Período ${escH(dBr(d.de))} a ${escH(dBr(d.ate))} · buscado em ${escH(new Date(r.buscadoEm||d.geradoEm).toLocaleString('pt-BR'))}${d.homologacao?' · <b>MODO TESTE (dados de exemplo do iFood)</b>':''}</small></div>`
      + kpis + tempos
      + tabela_('Por situação do pedido', (d.status||[]).map(x=>Object.assign({}, x)), 'Todos os pedidos do período, de qualquer situação.')
      + tabela_('Por canal de venda', d.canais, 'Concluídos. "App do iFood" = cliente que comprou pelo aplicativo; "Cardápio digital" = pelo link/QR da loja.')
      + tabela_('Quem entregou', d.entregas, 'Concluídos. Entregador do iFood × entrega própria da loja × retirada.')
      + tabela_('Forma de pagamento', d.pagamentos, 'Concluídos.')
      + tabela_('Dia da semana', d.dias, 'Concluídos. Mostra os dias mais fortes.')
      + tabela_('Hora do pedido', d.horas, 'Concluídos. Horário em que o cliente fez o pedido.')
      + tabela_('Clientes novos × recorrentes', d.clientes)
      + canc + avisos
      + `<div class="notif-card"><b>Como ler</b><div class="obs-line"><small>Faturamento (GMV) = valor dos produtos + taxa de entrega cobrada do cliente. "Só produtos" tira a entrega. Ticket médio = faturamento dos concluídos ÷ quantidade de concluídos. Cancelamento % = cancelados ÷ todos os pedidos do período. Estes números vêm do iFood e podem diferir do seu caixa: use-os para comparar dias, canais e horários, não para fechar o financeiro (para isso há a tela Financeiro).</small></div></div>`;
  }
})();
