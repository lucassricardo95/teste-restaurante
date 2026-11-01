/* ---------- PEDIDO DETALHADO (telas Pedidos e Entregas) ---------- */
function pdEntregadorNome_(login){
  const u = (usuarios||[]).find(x=>String(x.login).toLowerCase()===String(login||'').toLowerCase());
  return u ? (u.nome||u.login) : (login||'');
}
function pdMapsUrl_(v){
  const end = [v.endereco, v.complemento].filter(Boolean).join(', ');
  return end ? 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(end) : '';
}
function pdClienteHtml_(v){
  const L = [];
  const linha = (k, val)=>L.push('<div class="pd-row"><span class="pd-k">'+k+'</span><span class="pd-v">'+val+'</span></div>');
  if(v.tipoEntrega==='Mesa') linha('🍽️ Mesa', escH(nomeMesa(v.mesaId)));
  else linha('👤 Cliente', escH(v.clienteNome||'Sem cadastro'));
  const ic_ = ifoodContato_(v);
  if(ic_){
    linha('📞 iFood', (ic_.telefone ? '<a href="tel:'+escH(normTel(ic_.telefone))+'">'+escH(ic_.telefone)+'</a>' : '0800 do iFood')
      + (ic_.codigo ? ' · Código: <b style="font-size:1.15em;letter-spacing:1px;">'+escH(ic_.codigo)+'</b>' + (ic_.vencido ? ' <span style="color:var(--erro-texto);font-weight:700;">(código vencido'+(ic_.ate?' às '+escH(ic_.ate):'')+')</span>' : (ic_.ate ? ' <span class="txt-muted">(vale até '+escH(ic_.ate)+')</span>' : '')) : ' <span class="txt-muted">(sem código localizador)</span>'));
  }
  else if(v.clienteTelefone) linha('📞 Telefone', '<a href="tel:'+escH(normTel(v.clienteTelefone))+'">'+escH(v.clienteTelefone)+'</a>');
  if(v.tipoEntrega==='Entrega'){
    const end = [v.endereco, v.complemento].filter(Boolean).join(', ');
    const maps = pdMapsUrl_(v);
    if(end) linha('📍 Endereço', escH(end)+(maps?' · <a href="'+maps+'" target="_blank" rel="noopener">ver no Maps</a>':''));
    if(v.referencia) linha('🧭 Referência', escH(v.referencia));
    linha('🛵 Entregador', v.entregador ? escH(pdEntregadorNome_(v.entregador)) : '<i>não atribuído</i>');
  }
  if(v.preferenciasCliente) linha('⚠️ Preferências do cliente', escH(v.preferenciasCliente));
  if(v.observacoesEntrega) linha('📝 Observações', escH(v.observacoesEntrega));
  linha('🕒 Feito em', escH(v.data||'')+' · há '+tempoDecorridoDesde(v.timestamp));
  const quem = quemFezPedido_(v);
  if(quem) linha('Origem', escH(quem));
  return L.join('');
}
function pdItensHtml_(v){
  const itens = itensVenda.filter(it=>it.vendaId===v.id);
  if(!itens.length) return '<div class="pd-linha"><span>Sem itens registrados</span></div>';
  return itens.map(it=>{
    const qtd = Number(it.quantidade)||1;
    const ad = (it.adicionaisIds||[]).map(id=>{ const a = adicionais.find(x=>x.id===id); return a ? a.nome : ''; }).filter(Boolean);
    const d = String(it.descricao||''), k = d.indexOf(' — Obs: ');
    const nome = k<0 ? d : d.slice(0,k), obs = k<0 ? '' : d.slice(k+8);
    const un = Number(it.valorUnitario)||0;
    const tot = Number(it.valorTotalItem)||(un*qtd);
    return '<div class="pd-item"><span class="pd-nome"><b>'+qtd+'x</b> '+escH(nome)+(qtd>1 ? ' <span class="pd-un">('+formatarMoeda(un)+' cada)</span>' : '')+'</span><span class="pd-val">'+formatarMoeda(tot)+'</span></div>'
      + (ad.length ? '<div class="pd-sub">+ '+escH(ad.join(', '))+'</div>' : '')
      + (obs ? '<div class="pd-obs">📝 '+escH(obs)+'</div>' : '');
  }).join('');
}
function pdValoresHtml_(v){
  const total = Number(v.valorTotal)||0;
  const orig = Number(v.valorOriginal)||total;
  const desc = Number(v.valorDesconto)||0, taxa = Number(v.taxaEntrega)||0;
  const L = ['<div class="pd-linha"><span>Subtotal</span><span>'+formatarMoeda(orig)+'</span></div>'];
  if(desc>0) L.push('<div class="pd-linha"><span>Desconto'+(v.descontoDetalhe?' ('+escH(String(v.descontoDetalhe).slice(0,60))+')':'')+'</span><span>− '+formatarMoeda(desc)+'</span></div>');
  if(taxa>0) L.push('<div class="pd-linha"><span>🛵 Taxa de entrega</span><span>'+formatarMoeda(taxa)+'</span></div>');
  L.push('<div class="pd-linha pd-total"><span>Total</span><span>'+formatarMoeda(total)+'</span></div>');
  const pags = (pagamentosVenda||[]).filter(p=>p.vendaId===v.id);
  const forma = pags.length ? pags.map(p=>escH(p.forma)+' '+formatarMoeda(p.valor)).join(' + ') : escH(v.formaPagamento||'—');
  const receber = v.statusPagamento==='A Receber';
  L.push('<div class="pd-linha"><span>💳 Pagamento</span><span class="txt-dir">'+forma+'<span class="pd-chip '+(receber?'receber':'pago')+'">'+(receber?'A receber':'Pago')+'</span></span></div>');
  return L.join('');
}
/* Linha do tempo: hora de cada etapa e quanto tempo levou desde a anterior (só aparece o que foi registrado). */
function pdLinhaTempoHtml_(v){
  const hojeIso = dataLocalISO(new Date());
  const fmt = ts => { const d = new Date(ts); const h = d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); return dataLocalISO(d)===hojeIso ? h : d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' '+h; };
  const conclui = v.tipoEntrega==='Entrega' ? '✅ Entregue' : (v.tipoEntrega==='Mesa' ? '✅ Servido na mesa' : '✅ Retirado pelo cliente');
  const et = [
    { ts:v.timestamp, rot: ehIfood_(v) ? '🛵 Pedido recebido do iFood' : (v.origem==='Cardápio' ? '🛒 Cliente fez o pedido' : '📝 Pedido lançado') },
    { ts:v.timestampInicioPreparo, rot:'👨‍🍳 Aceito / começou o preparo' },
    { ts:v.timestampPronta, rot:'🍔 Pronto' },
    { ts: v.tipoEntrega==='Entrega' ? v.timestampSaiu : null, rot:'🛵 Saiu para entrega' },
    { ts:v.timestampConcluida, rot:conclui },
    { ts:(v.timestampRecebimento && v.timestampRecebimento - v.timestamp > 60000) ? v.timestampRecebimento : null, rot:'💰 Pagamento confirmado' }
  ].filter(e=>e.ts).sort((a,b)=>a.ts-b.ts);
  if(et.length<2) return '';
  const linhas = et.map((e,i)=>{
    const dur = i>0 ? tempoEntre(et[i-1].ts, e.ts) : null;
    return `<div class="obs-line">${fmt(e.ts)} — ${e.rot}${dur?` <span class="txt-muted">(+${dur})</span>`:''}</div>`;
  }).join('');
  const total = v.timestampConcluida ? tempoEntre(v.timestamp, v.timestampConcluida) : null;
  return `<details class="pd-det"><summary>🕒 Linha do tempo</summary>${linhas}${total?`<div class="obs-line"><b>Tempo total: ${total}</b></div>`:''}</details>`;
}
function pedidoDetalheHtml_(v){
  return '<div class="pd-bloco">'+pdClienteHtml_(v)+'</div>'
    + '<div class="pd-bloco"><div class="pd-tit">Itens do pedido</div>'+pdItensHtml_(v)+'</div>'
    + '<div class="pd-bloco">'+pdValoresHtml_(v)+'</div>'
    + pdLinhaTempoHtml_(v);
}

/* ---------- IMPRIMIR A ENTREGA PARA O ENTREGADOR ---------- */
function botaoImprimirEntrega_(v){
  if(!podeEnviarEntregador_() || v.tipoEntrega!=='Entrega' || v.statusPedido==='Recebido') return '';
  return '<div class="btnrow mt-2"><button type="button" class="ghost" onclick="imprimirEntregaPedido(\''+v.id+'\')">🖨️ Imprimir para o entregador</button></div>';
}
function entregaImpressaoHtml_(v){ return comandaHtml_(v); }   /* modelo único de comanda */
/* ---------- IMPRIMIR RETIRADA / MESA (mesmo estilo da impressão da entrega) ---------- */
function podeImprimirPedido_(){ return !!(currentUser && (currentUser.nivel==='Admin' || currentUser.nivel==='Operador' || currentUser.nivel==='Garçom')); }
function botaoImprimirPedido_(v){
  if(!podeImprimirPedido_() || (v.tipoEntrega!=='Retirada' && v.tipoEntrega!=='Mesa') || v.statusPedido==='Recebido') return '';
  return '<div class="btnrow mt-2"><button type="button" class="ghost" onclick="imprimirPedidoRetMesa(\''+v.id+'\')">🖨️ Imprimir '+(v.tipoEntrega==='Mesa'?'pedido da mesa':'pedido da retirada')+'</button></div>';
}
function pedidoRetMesaImpressaoHtml_(v){ return comandaHtml_(v); }   /* modelo único de comanda */
function imprimirPedidoRetMesa(vendaId){
  const v = vendas.find(x=>x.id===vendaId); if(!v || (v.tipoEntrega!=='Retirada' && v.tipoEntrega!=='Mesa')) return;
  imprimirDocumento(pedidoRetMesaImpressaoHtml_(v), (v.tipoEntrega==='Mesa'?'Mesa ':'Retirada ')+'#'+rotuloPedido(v), lerFormato('entrega','80mm'));
}
function imprimirEntregaPedido(vendaId){
  const v = vendas.find(x=>x.id===vendaId); if(!v || v.tipoEntrega!=='Entrega') return;
  imprimirDocumento(entregaImpressaoHtml_(v), 'Entrega #'+rotuloPedido(v), lerFormato('entrega','80mm'));
}

/* ---------- ABA MESAS (dentro de Pedidos): mesas em atendimento + histórico do dia ---------- */
function cartaoPedidoMesa_(v){
  const prox = proximoStatusPedido(v);
  const jaFinalizado = v.statusPedido==='Servida';
  const aguardandoAceite = v.statusPedido==='Recebido';
  const hora = new Date(v.timestamp).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const botoesAceite = aguardandoAceite ? `<div class="btnrow mt-2">
      <button class="small-gold" onclick="aceitarPedidoUI('${v.id}')">✅ Aceitar</button>
      <button class="ghost" onclick="rejeitarPedidoUI('${v.id}')">❌ Rejeitar</button>
      ${podeEditarPedidoRecebido_() ? `<button class="ghost" onclick="abrirModalEditarVenda('${v.id}')">✏️ Editar</button>` : ''}
    </div>` : '';
  return `<div class="notif-card">
    <div><b>#${escH(rotuloPedido(v))}</b>${seloIfood_(v)} — ${escH(hora)} — <b>${formatarMoeda(v.valorTotal)}</b>${aguardandoAceite?' <span class="badge baixo">novo — aguardando aceite</span>':''}</div>
    <div class="obs-line">${itensDoPedido(v.id)}</div>
    <details class="pd-det"><summary>ver pedido completo</summary>${pedidoDetalheHtml_(v)}</details>
    ${botaoOcorrenciaPedido(v)}
    <div class="obs-line">Status: <b>${escH(v.statusPedido||'—')}</b> — há ${tempoDecorridoDesde(v.timestamp)}</div>
    ${botoesAceite}
    ${(jaFinalizado || aguardandoAceite) ? '' : botoesSuspensao(v)}
    ${botaoImprimirPedido_(v)}
    ${(!aguardandoAceite && !jaFinalizado && prox) ? `<button class="small-gold mt-2" onclick="avancarPedido('${v.id}','${prox}')">Marcar como "${prox}"</button>` : ''}
  </div>`;
}
/* ---------- HISTÓRICO DAS MESAS: separa cada cliente que usou a mesa ---------- */
function horaCurta_(t){ return new Date(t).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); }
function duracaoCurta_(ms){
  const min = Math.max(1, Math.round(ms/60000));
  return min < 60 ? min+' min' : Math.floor(min/60)+'h'+String(min%60).padStart(2,'0');
}
/* Um atendimento = pedidos da mesma mesa pagos no mesmo fechamento de conta (horário de recebimento até 2 min de diferença),
   ou os pedidos ainda a receber (mesa ocupada agora). Cliente novo = novo fechamento. */
function atendimentosDaMesa_(lista){
  const TOL = 120000, grupos = [];
  lista.filter(v=>v.statusPagamento!=='A Receber')
    .map(v=>({ v, fim: v.timestampRecebimento || v.timestamp }))
    .sort((a,b)=>a.fim-b.fim)
    .forEach(p=>{ const g = grupos[grupos.length-1]; if(g && p.fim - g.fim <= TOL){ g.lista.push(p.v); g.fim = Math.max(g.fim, p.fim); } else grupos.push({ lista:[p.v], fim:p.fim, aberto:false }); });
  const abertos = lista.filter(v=>v.statusPagamento==='A Receber');
  if(abertos.length) grupos.push({ lista:abertos, fim:0, aberto:true });
  grupos.forEach(g=>{ g.lista.sort((a,b)=>a.timestamp-b.timestamp); g.inicio = g.lista[0].timestamp; g.total = arred2(g.lista.reduce((s,v)=>s+Number(v.valorTotal||0),0)); });
  return grupos.sort((a,b)=>a.inicio-b.inicio);
}
function atendimentoMesaHtml_(a, i){
  const formas = Array.from(new Set(a.lista.map(v=>v.formaPagamento).filter(Boolean)));
  const tempo = a.aberto
    ? `🟢 Ocupou às <b>${escH(horaCurta_(a.inicio))}</b> · 🟡 ainda ocupada (há ${escH(tempoDecorridoDesde(a.inicio))})`
    : `🟢 Ocupou às <b>${escH(horaCurta_(a.inicio))}</b> · 🔴 Liberou às <b>${escH(horaCurta_(a.fim))}</b> · ficou ${escH(duracaoCurta_(Math.max(0, a.fim - a.inicio)))}`;
  return `<div class="mesa-atend ${a.aberto?'aberto':'fechado'}">
    <div class="mesa-atend-cab"><b>${i===0?'1º atendimento':(i+1)+'º atendimento · novo cliente'}</b><span class="pd-chip ${a.aberto?'receber':'pago'}">${a.aberto?'Em atendimento':'Conta fechada'}</span></div>
    <div class="mesa-atend-tempo">${tempo}</div>
    <div class="obs-line">${a.lista.length} pedido(s) · <b>${formatarMoeda(a.total)}</b>${(!a.aberto && formas.length)?' · '+escH(formas.join(' + ')):''}</div>
    <details class="pd-det"><summary>ver pedidos</summary>${a.lista.map(v=>`<div class="obs-line">#${escH(rotuloPedido(v))} · ${escH(horaCurta_(v.timestamp))} · ${itensDoPedido(v.id)} · <b>${formatarMoeda(v.valorTotal)}</b>${v.statusPagamento==='A Receber'?' · a receber':''}</div>`).join('')}</details>
  </div>`;
}
function renderMesasPainel_(){
  const box = document.getElementById('mesasAtendimentoLista'), hist = document.getElementById('mesasHistoricoLista');
  if(!box || !hist) return;
  if(!souStaffCaixa_()){ _alertaPed_.mesas = false; return; }
  const prio = m => m.status==='Aguardando fechamento' ? 0 : (m.chamadoEm ? 1 : 2);
  const ativas = (mesas||[]).map(m=>({ m, c: contaDaMesa_(m.id) }))
    .filter(x=> x.m.status==='Ocupada' || x.m.status==='Aguardando fechamento' || x.c.pedidos.length>0)
    .sort((a,b)=> (prio(a.m)-prio(b.m)) || ((a.c.desde||Infinity)-(b.c.desde||Infinity)));
  const totalReceber = arred2(ativas.reduce((s,x)=>s+x.c.total,0));
  let html = ativas.length ? `<div class="obs-line mb-2">${ativas.length} mesa(s) em atendimento · a receber <b>${formatarMoeda(totalReceber)}</b></div>` : '';
  ativas.forEach(({m,c})=>{
    const ag = m.status==='Aguardando fechamento';
    const pedidos = c.pedidos.slice().sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
    const botao = c.pedidos.length
      ? `<button class="small-gold" style="width:auto;padding:8px 14px;" onclick="fecharContaMesaUI('${m.id}','mesasPainelMsg')">💳 Fechar conta</button>`
      : `<button class="ghost" style="width:auto;padding:8px 12px;" onclick="fecharContaMesaUI('${m.id}','mesasPainelMsg')">Liberar mesa</button>`;
    html += `<div class="mesa-card${ag?' aguardando':''}">
      <div class="mesa-cab"><b>Mesa ${escH(m.numero)}</b><span class="mesa-badge ${(ag||m.chamadoEm)?'b-aguard':'b-ocup'}">${ag?'Pediu a conta':(m.chamadoEm?'🔔 Chamando':'Ocupada')}${(ag&&m.chamadoEm)?' · 🔔':''}</span></div>
      <div class="obs-line">${m.garcomResponsavel?'👤 '+escH(m.garcomResponsavel)+' · ':''}${c.desde?'⏱ '+tempoDecorridoDesde(c.desde)+' · ':''}${c.pedidos.length} pedido(s)</div>
      <div class="mesa-total">${formatarMoeda(c.total)}</div>
      <div class="btnrow" style="margin:0 0 6px;flex-wrap:wrap;">${botao}</div>
      ${pedidos.map(cartaoPedidoMesa_).join('')}
    </div>`;
  });
  box.innerHTML = html || '<div class="notif-empty">Nenhuma mesa em atendimento agora.</div>';

  // histórico de hoje: por mesa, separado em ATENDIMENTOS (cada cliente que sentou e pagou = um atendimento)
  const hoje = dataLocalISO(new Date());
  const doDia = (vendas||[]).filter(v=>v.status==='Confirmada' && v.tipoEntrega==='Mesa' && v.mesaId && noTurnoCaixa_(v.timestamp,v));
  const porMesa = {};
  doDia.forEach(v=>{ (porMesa[v.mesaId] = porMesa[v.mesaId] || []).push(v); });
  const grupos = Object.keys(porMesa).map(id=>{
    const lista = porMesa[id].slice().sort((a,b)=>a.timestamp-b.timestamp);
    const atend = atendimentosDaMesa_(lista);
    return { id, atend, total: arred2(lista.reduce((s,v)=>s+Number(v.valorTotal||0),0)), ultimo: Math.max.apply(null, atend.map(x=>Math.max(x.inicio, x.fim||0))) };
  }).sort((a,b)=>b.ultimo-a.ultimo);
  if(!grupos.length){ hist.innerHTML = '<div class="notif-empty">Nenhum pedido de mesa neste turno do caixa ainda.</div>'; }
  else {
    const totalDia = arred2(grupos.reduce((s,g)=>s+g.total,0));
    const nAtend = grupos.reduce((s,g)=>s+g.atend.length,0);
    hist.innerHTML = `<div class="obs-line mb-2">${grupos.length} mesa(s) · ${nAtend} atendimento(s) · ${doDia.length} pedido(s) · total <b>${formatarMoeda(totalDia)}</b></div>` +
      grupos.map(g=>`<div class="notif-card">
        <div><b>Mesa ${escH(nomeMesa(g.id))}</b> — ${g.atend.length} atendimento(s) — <b>${formatarMoeda(g.total)}</b></div>
        ${g.atend.map((a,i)=>atendimentoMesaHtml_(a,i)).join('')}
      </div>`).join('');
  }
  _alertaPed_.mesas = ativas.some(x=>x.m.status==='Aguardando fechamento' || x.m.chamadoEm || x.c.pedidos.some(v=>v.statusPedido==='Recebido'));
  _atualizarAlertaPedidos_();
}

/* ---------- ENVIAR A ENTREGA AO ENTREGADOR PELO WHATSAPP ---------- */
const AVISOS_ENTREGADOR_KEY_ = 'txbAvisosEntregador';
function lerAvisosEntregador_(){ try{ return JSON.parse(localStorage.getItem(AVISOS_ENTREGADOR_KEY_)||'{}'); }catch(e){ return {}; } }
function podeEnviarEntregador_(){ return !!(currentUser && (currentUser.nivel==='Admin' || currentUser.nivel==='Operador')); }
function entregadorDe_(v){
  if(!v || !v.entregador) return null;
  return (usuarios||[]).find(u=>String(u.login).toLowerCase()===String(v.entregador).toLowerCase()) || null;
}
function waLimpo_(s){ return String(s==null?'':s).replace(/[*_~`]/g,'').trim(); } // evita quebrar a formatação do WhatsApp
function mensagemEntregador_(v){
  const ent = entregadorDe_(v);
  const primeiro = ent ? waLimpo_(ent.nome||ent.login).split(/\s+/)[0] : '';
  const end = [v.endereco, v.complemento].filter(Boolean).join(', ');
  const L = [];
  L.push('🛵 *ENTREGA #'+rotuloPedido(v)+' — '+nomeRestaurante_()+'*');
  L.push('Olá'+(primeiro?', '+primeiro:'')+'! Você tem uma entrega:');
  L.push('');
  L.push('👤 *Cliente:* '+waLimpo_(v.clienteNome||'Sem cadastro'));
  { const ic_ = ifoodContato_(v);
    if(ic_) L.push('📞 *Telefone (iFood):* '+waLimpo_(ic_.telefone||'0800 do iFood')+(ic_.codigo && !ic_.vencido ? ' · *Código:* '+waLimpo_(ic_.codigo) : ''));
    else if(v.clienteTelefone) L.push('📞 *Telefone:* '+waLimpo_(v.clienteTelefone)); }
  if(end) L.push('📍 *Endereço:* '+waLimpo_(end));
  if(v.referencia) L.push('🧭 *Referência:* '+waLimpo_(v.referencia));
  if(end) L.push('🗺️ *Mapa:* https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(end));
  L.push('');
  L.push('🧾 *Pedido:*');
  itensVenda.filter(it=>it.vendaId===v.id).forEach(it=>{
    const d = String(it.descricao||''), k = d.indexOf(' — Obs: ');
    const nome = k<0 ? d : d.slice(0,k), obs = k<0 ? '' : d.slice(k+8);
    const ad = (it.adicionaisIds||[]).map(id=>{ const a = adicionais.find(x=>x.id===id); return a ? a.nome : ''; }).filter(Boolean);
    L.push('• '+(Number(it.quantidade)||1)+'x '+waLimpo_(nome));
    if(ad.length) L.push('   + '+waLimpo_(ad.join(', ')));
    if(obs) L.push('   📝 '+waLimpo_(obs).slice(0,200));
  });
  L.push('');
  if(v.statusPagamento==='A Receber') L.push('💰 *COBRAR DO CLIENTE: '+formatarMoeda(v.valorTotal)+'*'+(v.formaPagamento?' ('+waLimpo_(v.formaPagamento)+')':''));
  else L.push('✅ *Já está pago* — não cobrar nada do cliente.');
  if(Number(v.taxaEntrega)>0) L.push('🛵 Taxa de entrega (já inclusa no total): '+formatarMoeda(v.taxaEntrega));
  if(v.observacoesEntrega) L.push('📝 *Obs.:* '+waLimpo_(v.observacoesEntrega).slice(0,300));
  L.push('');
  L.push('Ao entregar, toque em "Já entreguei" no sistema.');
  return L.join('\n');
}
function botaoEnviarEntregador_(v){
  if(!podeEnviarEntregador_() || v.tipoEntrega!=='Entrega' || v.statusPedido==='Recebido') return '';
  if(!v.entregador) return '<div class="obs-line mt-2">📲 Escolha um entregador acima para poder enviar a entrega pelo WhatsApp.</div>';
  const ent = entregadorDe_(v);
  if(!ent || !telefoneWhatsApp_(ent.telefone)) return '<div class="obs-line" style="margin-top:6px;color:#ffb3ab;">⚠ O entregador '+escH(pdEntregadorNome_(v.entregador))+' está sem telefone válido. Cadastre em Administrador → Loja e equipe → Usuários e permissões → editar.</div>';
  const feito = lerAvisosEntregador_()[v.id+'|'+v.entregador];
  const hora = feito ? new Date(feito).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '';
  return '<div class="btnrow mt-2 ai-centro"><button type="button" class="ghost" onclick="enviarEntregaWhatsApp(\''+v.id+'\')">📲 '+(feito?'Enviar de novo ao entregador':'Enviar ao entregador')+'</button>'+(feito?'<span class="obs-line sem-margem">✔ enviado às '+hora+'</span>':'')+'</div>';
}
function enviarEntregaWhatsApp(vendaId){
  const v = vendas.find(x=>x.id===vendaId); if(!v || !podeEnviarEntregador_()) return;
  const ent = entregadorDe_(v), fone = ent ? telefoneWhatsApp_(ent.telefone) : null;
  if(!fone){ avisar('O entregador deste pedido não tem telefone válido cadastrado.'); return; }
  try{
    const a = lerAvisosEntregador_(); a[v.id+'|'+v.entregador] = Date.now();
    const chaves = Object.keys(a); if(chaves.length>200) chaves.sort((x,y)=>a[x]-a[y]).slice(0,chaves.length-200).forEach(k=>delete a[k]);
    localStorage.setItem(AVISOS_ENTREGADOR_KEY_, JSON.stringify(a));
  }catch(e){}
  window.open('https://wa.me/'+fone+'?text='+encodeURIComponent(mensagemEntregador_(v)), '_blank');
  renderEntregas();
}

function renderPedidos(){
  renderCozinha();
  const pendentes = vendas.filter(v=>v.status==='Confirmada' && (v.tipoEntrega==='Retirada' || (v.tipoEntrega==='Mesa' && souGarcom_())) &&
    v.statusPedido && !( (v.statusPedido==='Retirada' || v.statusPedido==='Entregue' || v.statusPedido==='Servida') && v.statusPagamento!=='A Receber' )
  ).sort((a,b)=>a.timestamp-b.timestamp);
  const box = document.getElementById('pedidosLista');
  if(box){
    box.innerHTML = pendentes.length ? pendentes.map(v=>{
      const prox = proximoStatusPedido(v);
      const jaFinalizado = v.statusPedido==='Retirada' || v.statusPedido==='Entregue' || v.statusPedido==='Servida';
      const aReceber = v.statusPagamento==='A Receber' && v.tipoEntrega!=='Mesa' ? `<div class="obs-line" style="color:#f0d78c;">💰 Aguardando pagamento — <button class="ghost" style="padding:2px 8px;font-size:12px;" onclick="confirmarRecebimento('${v.id}')">marcar como recebido</button></div>` : '';
      const identificacao = v.tipoEntrega==='Mesa' ? '🍽️ Mesa '+(nomeMesa(v.mesaId)) : '🥡 '+(v.clienteNome||'Sem cadastro');
      const aguardandoAceite = v.statusPedido==='Recebido';
      const botoesAceite = aguardandoAceite ? `<div class="btnrow mt-2">
          <button class="small-gold" onclick="aceitarPedidoUI('${v.id}')">✅ Aceitar</button>
          <button class="ghost" onclick="rejeitarPedidoUI('${v.id}')">❌ Rejeitar</button>
      ${podeEditarPedidoRecebido_() ? `<button class="ghost" onclick="abrirModalEditarVenda('${v.id}')">✏️ Editar</button>` : ''}
        </div>` : '';
      return `<div class="notif-card">
        <div><b>#${rotuloPedido(v)}</b>${seloIfood_(v)} — ${identificacao}${aguardandoAceite?' <span class="badge baixo">novo — aguardando aceite</span>':''}</div>
        ${pedidoDetalheHtml_(v)}
        ${botaoOcorrenciaPedido(v)}
        <div class="obs-line">Status: <b>${v.statusPedido}</b> — há ${tempoDecorridoDesde(v.timestamp)}</div>
        ${botaoAvisarCliente_(v)}
        ${aReceber}
        ${botoesAceite}
        ${jaFinalizado ? '' : botoesSuspensao(v)}
        ${botaoImprimirPedido_(v)}
        ${(!aguardandoAceite && !jaFinalizado && prox) ? `<button class="small-gold mt-2" onclick="avancarPedido('${v.id}','${prox}')">Marcar como "${prox}"</button>` : ''}
      </div>`;
    }).join('') : ('<div class="notif-empty">'+(souGarcom_()?'Nenhum pedido de mesa em andamento.':'Nenhuma retirada em andamento.')+'</div>');
  }
  const hoje = dataLocalISO(new Date());
  const concluidos = vendas.filter(v=>v.status==='Confirmada' && v.tipoEntrega==='Retirada' && v.statusPedido==='Retirada' && v.statusPagamento!=='A Receber' && noTurnoCaixa_(v.timestamp,v)).sort((a,b)=>b.timestamp-a.timestamp);
  const box2 = document.getElementById('pedidosConcluidosLista');
  if(box2){
    box2.innerHTML = concluidos.length ? concluidos.map(v=>{
      const tPreparo = tempoEntre(v.timestamp, v.timestampPronta);
      return `<div class="notif-card"><b>#${rotuloPedido(v)}</b>${seloIfood_(v)} — 🥡 ${escH(v.clienteNome||'Sem cadastro')} — Retirada${tPreparo?' · preparo: '+tPreparo:''}
        <details class="pd-det"><summary>ver pedido completo</summary>${pedidoDetalheHtml_(v)}</details></div>`;
    }).join('') : '<div class="notif-empty">Nenhuma retirada concluída ainda neste turno do caixa.</div>';
  }
  _alertaPed_.pedidos = pendentes.length>0; _atualizarAlertaPedidos_();
  try{ renderMesasPainel_(); }catch(e){ if(window.erroTela_) erroTela_(e); }
}
function popularSelectEntregadoresHtml(vendaId, atual){
  const ativos = usuarios.filter(u=>u.nivel==='Entregador' && u.ativo);
  const opcoes = '<option value="">Sem entregador</option>' + ativos.map(u=>`<option value="${escH(u.login)}" ${u.login===atual?'selected':''}>${escH(u.nome||u.login)}${telefoneWhatsApp_(u.telefone)?'':' — sem telefone'}</option>`).join('');
  return `<select onchange="salvarEntregador('${vendaId}', this.value)">${opcoes}</select>`;
}
let entregasAlertadas = JSON.parse(localStorage.getItem('entregasAlertadasEntregador')||'[]');
function tocarAlertaNovaEntrega(){ somAlerta_(); mostrarNotificacao_('🛵 Nova entrega','Você recebeu uma entrega nova.'); }
/* ============================================================
   COZINHA E GARÇOM
   ============================================================ */
function souCozinha_(){ return !!(currentUser && currentUser.nivel==='Cozinha'); }
function souGarcom_(){ return !!(currentUser && currentUser.nivel==='Garçom'); }

/* ---- Cozinha: quadro Novos / Em preparo / Prontos ---- */
function cardCozinha_(v, acao){
  const itens = itensVenda.filter(it=>it.vendaId===v.id).map(it=>{
    const ad = (it.adicionaisIds||[]).map(id=>{ const a = adicionais.find(x=>x.id===id); return a ? a.nome : ''; }).filter(Boolean);
    const _d = String(it.descricao||''), _k = _d.indexOf(' — Obs: ');
    const descHtml = _k<0 ? escOc_(_d) : escOc_(_d.slice(0,_k)) + `<div class="cz-obs">📝 ${escOc_(_d.slice(_k+8))}</div>`;
    return `<div class="cz-item"><b>${it.quantidade}x</b> ${descHtml}${ad.length?`<div class="cz-ad">+ ${escOc_(ad.join(', '))}</div>`:''}</div>`;
  }).join('');
  const destino = v.tipoEntrega==='Mesa' ? '🍽️ Mesa '+escOc_(nomeMesa(v.mesaId)) : (v.tipoEntrega==='Entrega' ? '🛵 Entrega' : '🥡 Retirada'+(v.clienteNome?' · '+escOc_(v.clienteNome):''));
  const min = Math.floor((Date.now()-v.timestamp)/60000);
  const atrasado = (v.statusPedido==='Recebido' || v.statusPedido==='Em preparo') && min>=20;
  const obs = (v.preferenciasCliente ? `<div class="cz-obs">⚠️ Preferências: ${escOc_(v.preferenciasCliente)}</div>` : '') + (v.observacoesEntrega ? `<div class="cz-obs">📝 ${escOc_(v.observacoesEntrega)}</div>` : '');
  const alterado = (['Retirada','Entregue','Servida'].indexOf(v.statusPedido)===-1) && comandaFotoTirar_(v); // ITEM 2.4 (concluído não alerta)
  let faixaAlterado = '';
  if(alterado){
    faixaAlterado = `<div style="background:#c0392b;color:#fff;font-weight:700;border-radius:6px;padding:6px 8px;margin:4px 0;font-size:13px;">⚠️ PEDIDO ALTERADO depois de visto/impresso — confira os itens
      <div style="margin-top:5px;display:flex;gap:6px;flex-wrap:wrap;"><button type="button" class="small-gold" onclick="comandaReimprimirAtualizada('${v.id}')">🖨️ Reimprimir comanda atualizada</button><button type="button" class="ghost" onclick="comandaCiente('${v.id}')">👍 Ciente</button></div></div>`;
    if(!_comandaAlteradaAvisada_.has(v.id)){ _comandaAlteradaAvisada_.add(v.id); setTimeout(()=>{ try{ somAlerta_(); setTimeout(somAlerta_, 900); }catch(e){} }, 50); } // bipe duplo uma vez por alteração
  }
  return `<div class="cz-card${atrasado?' atrasado':''}">
    ${faixaAlterado}
    <div class="cz-cab"><b>#${escOc_(rotuloPedido(v))}${seloIfood_(v)} — ${destino}</b><span class="cz-tempo">${tempoDecorridoDesde(v.timestamp)}</span></div>
    <div class="obs-line">${escOc_(v.origem||'Balcão')}${quemFezPedido_(v)?' · '+escOc_(quemFezPedido_(v)):''}</div>
    ${itens}${obs}
    ${botaoOcorrenciaPedido(v)}
    ${acao||''}
    <button type="button" class="ghost mt-2" onclick="imprimirComandaPedido('${v.id}')">🖨️ Comanda</button>
  </div>`;
}
/* comanda impressa na cozinha. Botão por pedido, "Imprimir novos" (um único trabalho de impressão, uma comanda por página)
   e, opcional, impressão automática. Sem toque só funciona com o navegador em modo quiosque de impressão; senão o aparelho pergunta. */
const COMANDAS_KEY_ = 'txbComandasImpressas', COMANDA_AUTO_KEY_ = 'txbComandaAuto';
function comandasImpressas_(){ try{ return JSON.parse(localStorage.getItem(COMANDAS_KEY_)||'[]'); }catch(e){ return []; } }
function comandaJaImpressa_(id){ return comandasImpressas_().indexOf(id)!==-1; }
function marcarComandasImpressas_(ids){ try{ const a = comandasImpressas_(); ids.forEach(id=>{ if(a.indexOf(id)===-1) a.push(id); }); localStorage.setItem(COMANDAS_KEY_, JSON.stringify(a.slice(-300))); }catch(e){} }
function comandaAuto_(){ try{ return localStorage.getItem(COMANDA_AUTO_KEY_)==='1'; }catch(e){ return false; } }
function pedidosNovosCozinha_(){
  const limite = Date.now() - 24*3600*1000;
  return vendas.filter(v=>v.status==='Confirmada' && v.timestamp>=limite && (v.statusPedido==='Recebido' || (v.statusPedido==='Em preparo' && !v.timestampInicioPreparo))).sort((a,b)=>a.timestamp-b.timestamp);
}
/* ITEM 2.4 — COMANDA ALTERADA. Este aparelho lembra "como o pedido estava" quando a comanda foi impressa ou quando o pedido apareceu na
   tela pela primeira vez (uma "foto" do conteúdo: itens, adicionais, observações). Se um Admin/Operador editar o pedido depois, a foto
   deixa de bater: o cartão ganha a faixa vermelha "PEDIDO ALTERADO" (e dois bipes uma vez) até a cozinha reimprimir ou tocar em "Ciente". */
const COMANDA_FOTO_KEY_ = 'txbComandaFoto_v1';
function comandaFotos_(){ try{ return JSON.parse(localStorage.getItem(COMANDA_FOTO_KEY_)||'{}') || {}; }catch(e){ return {}; } }
function comandaFotosSalvar_(m){ try{ const ks = Object.keys(m); if(ks.length > 300) ks.slice(0, ks.length - 300).forEach(k=>delete m[k]); localStorage.setItem(COMANDA_FOTO_KEY_, JSON.stringify(m)); }catch(e){} }
function comandaConteudoHash_(v){
  const its = itensVenda.filter(it=>it.vendaId===v.id);
  if(!its.length) return '';
  const txt = its.map(it=>[it.quantidade, it.descricao, (it.adicionaisIds||[]).slice().sort().join('+')].join('|')).sort().join('~') + '#' + (v.observacoesEntrega||'');
  let h = 5381; for(let i=0;i<txt.length;i++){ h = ((h<<5) + h + txt.charCodeAt(i)) | 0; }
  return 'h' + (h>>>0).toString(36) + '-' + its.length;
}
function comandaFotoTirar_(v){ // grava a foto se ainda não existir; devolve true se o pedido MUDOU desde a foto
  const h = comandaConteudoHash_(v); if(!h) return false;
  const m = comandaFotos_();
  if(!m[v.id]){ m[v.id] = h; comandaFotosSalvar_(m); return false; }
  return m[v.id] !== h;
}
function comandaFotoAtualizar_(v){ const h = comandaConteudoHash_(v); if(!h) return; const m = comandaFotos_(); m[v.id] = h; comandaFotosSalvar_(m); }
const _comandaAlteradaAvisada_ = new Set();
function comandaCiente(vendaId){ const v = vendas.find(x=>x.id===vendaId); if(v) comandaFotoAtualizar_(v); renderCozinha(); }
function comandaReimprimirAtualizada(vendaId){ imprimirComandaPedido(vendaId); renderCozinha(); }

/* ITEM 2.5 — IMPRESSÃO NÃO CONFIRMADA. O navegador não sabe se o papel saiu (cancelou a tela, sem papel, impressora desligada).
   Depois de mandar imprimir, a cozinha vê "Saiu no papel?" com dois botões; sem resposta em 30 s vira alerta vermelho e fica até alguém responder.
   "Não saiu" tira as comandas da lista de impressas e as manda de novo. */
let _impPend_ = null; // { ids:[], em:ms }
function impConfirmarRegistrar_(ids){
  if(!ids || !ids.length) return;
  if(_impPend_){ ids.forEach(id=>{ if(_impPend_.ids.indexOf(id) === -1) _impPend_.ids.push(id); }); }
  else _impPend_ = { ids: ids.slice(), em: Date.now() };
  impConfirmarRender_();
}
function impConfirmarRender_(){
  let box = document.getElementById('czImpConfirma');
  const ref = document.getElementById('czComandaMsg');
  if(!box && ref && ref.parentNode){ box = document.createElement('div'); box.id = 'czImpConfirma'; ref.parentNode.insertBefore(box, ref.nextSibling); }
  if(!box) return;
  if(_impPend_ && Date.now() - _impPend_.em > 600000) _impPend_ = null; // some sozinho depois de 10 min
  if(!_impPend_){ box.innerHTML = ''; box.style.display = 'none'; return; }
  box.style.display = 'block';
  box.style.cssText += ';margin:6px 0;font-size:12px;opacity:.85;';
  box.innerHTML = '<button type="button" class="ghost" style="padding:4px 10px;font-size:12px;" onclick="impConfirmarNao()">🔁 Não saiu? Reimprimir</button> ' +
    '<button type="button" class="ghost" style="padding:4px 10px;font-size:12px;" onclick="impConfirmarSim()">✖ Saiu, ocultar</button>';
}
function impConfirmarSim(){ _impPend_ = null; impConfirmarRender_(); avisoComanda_('✅ Impressão confirmada às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'.'); }
function impConfirmarNao(){
  if(!_impPend_) return;
  const ids = _impPend_.ids.slice(); _impPend_ = null;
  try{ const a = comandasImpressas_().filter(id=>ids.indexOf(id) === -1); localStorage.setItem(COMANDAS_KEY_, JSON.stringify(a)); }catch(e){}
  const lista = ids.map(id=>vendas.find(x=>x.id===id)).filter(Boolean);
  impConfirmarRender_();
  if(lista.length){ marcarComandasImpressas_(lista.map(v=>v.id)); imprimirComandas_(lista); impConfirmarRegistrar_(lista.map(v=>v.id)); avisoComanda_('🔁 Comanda(s) reenviada(s) à impressora. Confira se saiu.'); }
}
setInterval(()=>{ if(_impPend_ && !document.hidden) impConfirmarRender_(); }, 10000);
function comandaHtml_(v){
  /* MODELO ÚNICO DE COMANDA (v2: grande, nítida e completa): serve para cozinha, retirada, mesa e entrega
     (a cozinha imprime, grampeia no pedido e ela segue para o entregador). Sem emojis: impressora térmica não imprime emoji. O estilo (.cmd) fica em cssImpressao (app-07). */
  const sem = s => escR(String(s==null?'':s).replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27BF\uFE0F]/gu,'').trim());
  const ehMesa = v.tipoEntrega==='Mesa', ehEnt = v.tipoEntrega==='Entrega';
  const lista = itensVenda.filter(it=>it.vendaId===v.id);
  const totalItens = lista.reduce((s,it)=>s+(Number(it.quantidade)||0),0);
  const itens = lista.map(it=>{
    const ad = (it.adicionaisIds||[]).map(id=>{ const a = adicionais.find(x=>x.id===id); return a ? a.nome : ''; }).filter(Boolean);
    const partes = String(it.descricao||'').split(' — Obs: ');
    const obs = partes.slice(1).join(' — ').trim();
    return `<div class="it"><div class="qt">${escR(it.quantidade)}</div><div class="nm">${escR(partes[0])}`
      + (ad.length ? `<div class="ad">+ ${escR(ad.join(', '))}</div>` : '')
      + (obs ? `<div class="ob">OBS: ${escR(obs)}</div>` : '')
      + `</div></div>`;
  }).join('') || '<div class="box">(itens não carregados — confira na tela)</div>';
  const destino = ehMesa ? 'MESA '+nomeMesa(v.mesaId) : (ehEnt ? 'ENTREGA' : 'RETIRADA');
  const d = new Date(v.timestamp);
  const hora = d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const dia = d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
  const agora = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const quem = sem(quemFezPedido_(v));
  let h = `<div class="cmd">`;
  h += `<div class="num">COMANDA #${escR(rotuloPedido(v))}</div>`;
  h += `<div class="dest">${escR(destino)}</div>`;
  h += `<div class="meta">Pedido às <b>${escR(hora)}</b> · ${escR(dia)} · ${sem(ehIfood_(v) ? 'iFood' : (v.origem||'Balcão'))}</div>`;
  if(quem) h += `<div class="meta">${quem}</div>`;
  /* ITENS (o mais importante para a cozinha) */
  h += `<div class="sec">ITENS (${totalItens} no total)</div>${itens}`;
  if(v.preferenciasCliente) h += `<div class="box">ATENÇÃO — PREFERÊNCIAS DO CLIENTE:<br><span class="big">${escR(v.preferenciasCliente)}</span></div>`;
  if(v.observacoesEntrega) h += `<div class="box">OBSERVAÇÃO DO PEDIDO:<br><span class="big">${escR(v.observacoesEntrega)}</span></div>`;
  /* CLIENTE / ENDEREÇO (o mais importante para o entregador) */
  if(!ehMesa){
    h += `<div class="sec">${ehEnt?'ENTREGAR PARA':'CLIENTE'}</div>`;
    h += `<div class="cli">${escR(v.clienteNome||'Sem cadastro')}</div>`;
    { const ic_ = ifoodContato_(v);
      if(ic_) h += `<div class="tel">Tel iFood: ${escR(ic_.telefone||'0800')}${ic_.codigo ? (ic_.vencido ? ` · código ${escR(ic_.codigo)} VENCIDO` : `<br><b class="big">CÓDIGO: ${escR(ic_.codigo)}</b>${ic_.ate ? ` (até ${escR(ic_.ate)})` : ''}`) : ''}</div>`;
      else if(v.clienteTelefone) h += `<div class="tel">Tel: ${escR(v.clienteTelefone)}</div>`; }
    if(ehEnt){
      h += `<div class="end">${escR(v.endereco||'(endereço não informado)')}</div>`;
      if(v.complemento) h += `<div class="end2">Compl.: ${escR(v.complemento)}</div>`;
      if(v.referencia) h += `<div class="end2">Referência: ${escR(v.referencia)}</div>`;
    }
  }
  /* VALORES E PAGAMENTO */
  h += `<div class="sec">PAGAMENTO</div>`;
  const desc = Number(v.valorDesconto)||0, acr = Number(v.acrescimoForma)||0, taxa = Number(v.taxaEntrega)||0;
  if(desc>0) h += `<div class="lin"><span>Desconto${v.descontoDetalhe?' ('+sem(v.descontoDetalhe)+')':''}</span><span>-${escR(formatarMoeda(desc))}</span></div>`;
  if(acr>0) h += `<div class="lin"><span>Acréscimo da forma</span><span>+${escR(formatarMoeda(acr))}</span></div>`;
  if(ehEnt && taxa>0) h += `<div class="lin"><span>Taxa de entrega</span><span>${escR(formatarMoeda(taxa))}</span></div>`;
  h += `<div class="tot"><span>TOTAL</span><span>${escR(formatarMoeda(v.valorTotal))}</span></div>`;
  if(v.formaPagamento) h += `<div class="forma">Forma: ${sem(v.formaPagamento)}</div>`;
  const receber = v.statusPagamento==='A Receber';
  h += receber
    ? (ehMesa ? `<div class="cob">CONTA EM ABERTO<br>PAGAR NO CAIXA</div>`
              : `<div class="cob">COBRAR DO CLIENTE<br>${escR(formatarMoeda(v.valorTotal))}</div>`)
    : `<div class="pago">JÁ PAGO${ehEnt?'<br>NÃO COBRAR':''}</div>`;
  if(ehEnt && v.entregador) h += `<div class="forma">Entregador: <b>${sem(pdEntregadorNome_(v.entregador))}</b></div>`;
  h += `<div class="vers">“Portanto, quando vocês comem, ou bebem, ou fazem qualquer outra coisa, façam tudo para a glória de Deus.”<br><b>1 Coríntios 10:31</b></div>`;
  h += `<div class="rod">Impressa às ${escR(agora)} · ${NOME_H_()}</div></div>`;
  return h;
}
function imprimirComandas_(lista){
  lista.forEach(v=>{ comandaFotoAtualizar_(v); _comandaAlteradaAvisada_.delete(v.id); }); // ITEM 2.4: a comanda impressa passa a ser a "foto" do pedido
  const corpo = lista.map(comandaHtml_);
  imprimirDocumento(corpo, 'Comanda', lerFormato('comanda','80mm'));
}
function avisoComanda_(t){ const el = document.getElementById('czComandaMsg'); if(el) el.textContent = t; }
function imprimirComandaPedido(vendaId){
  const v = vendas.find(x=>x.id===vendaId); if(!v) return;
  marcarComandasImpressas_([v.id]); imprimirComandas_([v]);
  avisoComanda_('🖨️ Comanda #'+rotuloPedido(v)+' enviada à impressora.');
  impConfirmarRegistrar_([v.id]); // ITEM 2.5
}
function imprimirNovosCozinha(auto){
  const lista = pedidosNovosCozinha_().filter(v=>!comandaJaImpressa_(v.id) && (!auto || Date.now()-v.timestamp < 3600000));
  if(!lista.length){ if(!auto) avisoComanda_('Nenhuma comanda nova para imprimir.'); return; }
  marcarComandasImpressas_(lista.map(v=>v.id)); imprimirComandas_(lista);
  impConfirmarRegistrar_(lista.map(v=>v.id)); // ITEM 2.5
  avisoComanda_('🖨️ '+lista.length+' comanda(s) enviada(s) à impressora às '+new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'.');
}
function alternarComandaAuto(ligado){
  try{ localStorage.setItem(COMANDA_AUTO_KEY_, ligado ? '1' : '0'); }catch(e){}
  if(ligado){
    marcarComandasImpressas_(pedidosNovosCozinha_().map(v=>v.id)); // só imprime o que chegar daqui para frente
    avisoComanda_('Ligado: imprime sozinho só os pedidos que chegarem a partir de agora. Para imprimir sem perguntar, o navegador precisa estar em modo quiosque de impressão; senão o aparelho abre a tela de impressão a cada pedido.');
  } else avisoComanda_('Impressão automática desligada. Use “Imprimir novos” ou o botão de cada pedido.');
}
function renderCozinha(){
  if(!souCozinha_() || !document.getElementById('czNovos')) return;
  const limite = Date.now() - 24*3600*1000;
  const ativos = vendas.filter(v=>v.status==='Confirmada' && v.timestamp>=limite && ['Recebido','Em preparo','Pronta'].indexOf(v.statusPedido)!==-1).sort((a,b)=>a.timestamp-b.timestamp);
  /* Regra do restaurante: assim que QUALQUER perfil (Cozinha, Caixa, Admin, Dev, Garçom) aceita, o pedido já está EM PREPARO na cozinha.
     "Novos" = só o que ainda aguarda aceite. "naoVistos" (aceito por outro, cozinha ainda não tocou) continua acendendo o alerta. */
  const novos = ativos.filter(v=>v.statusPedido==='Recebido');
  const preparo = ativos.filter(v=>v.statusPedido==='Em preparo');
  const naoVistos = preparo.filter(v=>!v.timestampInicioPreparo);
  const prontos = ativos.filter(v=>v.statusPedido==='Pronta');
  /* Concluídos do turno: o banco só entrega à Cozinha os do caixa aberto. Ao fechar o caixa, somem na próxima atualização. */
  const concluidosTodos = vendas.filter(v=>v.status==='Confirmada' && ['Retirada','Entregue','Servida'].indexOf(v.statusPedido)!==-1)
    .sort((a,b)=>(b.timestampConcluida||b.timestamp)-(a.timestampConcluida||a.timestamp));
  const concluidos = concluidosTodos.slice(0,30);
  const rotConc_ = { 'Retirada':'Retirado', 'Entregue':'Entregue', 'Servida':'Servido' };
  const vazio = t => `<div class="notif-empty">${t}</div>`;
  document.getElementById('czNovos').innerHTML = novos.length ? novos.map(v=>cardCozinha_(v, `<button class="small-gold" onclick="cozinhaIniciar('${v.id}')">▶️ ${v.statusPedido==='Recebido'?'Aceitar e iniciar preparo':'Iniciar preparo'}</button>`)).join('') : vazio('Nenhum pedido novo.');
  document.getElementById('czPreparo').innerHTML = preparo.length ? preparo.map(v=>cardCozinha_(v, `<button class="small-gold" onclick="avancarPedido('${v.id}','Pronta')">✅ Pronto</button>`)).join('') : vazio('Nada em preparo.');
  const htmlProntos_ = prontos.length ? prontos.map(v=>cardCozinha_(v, `<div class="obs-line">Aguardando ${v.tipoEntrega==='Mesa'?'o garçom':(v.tipoEntrega==='Entrega'?'o entregador':'a retirada')}.</div>`)).join('') : vazio('Nenhum pedido pronto.');
  const htmlConcluidos_ = concluidos.length
    ? `<div class="obs-line" style="margin:12px 0 4px;font-weight:700;">📜 Concluídos neste turno (${concluidosTodos.length}${concluidosTodos.length>concluidos.length?' · mostrando os '+concluidos.length+' mais recentes':''})</div>`
      + concluidos.map(v=>{
          const hora = v.timestampConcluida ? ' às '+new Date(v.timestampConcluida).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '';
          return `<div style="opacity:.6;">${cardCozinha_(v, `<div class="obs-line">✔️ ${rotConc_[v.statusPedido]}${hora}</div>`)}</div>`;
        }).join('')
    : '';
  document.getElementById('czProntos').innerHTML = htmlProntos_ + htmlConcluidos_;
  document.getElementById('czNovosN').textContent = novos.length ? '('+novos.length+')' : '';
  document.getElementById('czPrepN').textContent = preparo.length ? '('+preparo.length+')' : '';
  document.getElementById('czProntosN').textContent = prontos.length ? '('+prontos.length+')' : '';
  _alertaPed_.pedidos = (novos.length + naoVistos.length)>0; _atualizarAlertaPedidos_();
  const fm = document.getElementById('czComandaFmt'); if(fm) fm.value = lerFormato('comanda','80mm');
  const au = document.getElementById('czComandaAuto'); if(au) au.checked = comandaAuto_();
}
async function cozinhaIniciar(vendaId){
  const chave = 'iniciar-preparo-'+vendaId;
  if(!iniciarOperacaoUnica(chave)) return;
  try{
    const r = await apiCall('iniciarPreparoPedido', { vendaId });
    if(r.vendas){ vendas = r.vendas; salvarCache(); renderPedidos(); renderEntregas(); }
    if(!r.ok) avisar(r.message || 'Não foi possível iniciar o preparo.');
  } catch(e){ avisar('Sem conexão — o preparo não foi registrado.'); }
  finally { finalizarOperacaoUnica(chave); }
}

/* ---- Cozinha: detector próprio (consulta leve a cada 3 min, alerta visual + beep) ---- */
let cozinhaVistos = null, cozinhaTimer = null, cozinhaSyncPendente = false, cozinhaUltimaChecagem = null;
let cozinhaSomLigado = localStorage.getItem('cozinhaSom') !== '0';
function atualizarStatusDetector_(erro){
  const el = document.getElementById('czStatus'); const btn = document.getElementById('czSomBtn');
  if(btn) btn.textContent = cozinhaSomLigado ? '🔊 Som: ligado' : '🔇 Som: desligado';
  if(!el) return;
  el.textContent = erro ? '⚠️ Sem conexão com o servidor — tentando de novo em 3 min. Toque em “Verificar agora”.' : (cozinhaUltimaChecagem ? '🔔 Detector ligado · última verificação às '+cozinhaUltimaChecagem.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})+' · '+vendas.length+' pedidos carregados' : 'Detector iniciando…');
  if(el && !erro && typeof _rt_ !== 'undefined' && _rt_.ativo) el.textContent = '⚡ Tempo real ligado — os pedidos aparecem na hora.';
  atualizarTelaLigadaUI_();
}
function beepCozinha_(){ if(!cozinhaSomLigado) return; somAlerta_(); }

/* ============================================================
   AVISOS DE PEDIDO NOVO — som, vibração, notificação e tela ligada
   Por que o bipe não tocava: (1) o celular só libera áudio depois de um toque do usuário, e o sistema criava o
   áudio sozinho, no meio da busca automática; (2) só a Cozinha tinha bipe — Caixa e Administrador não tinham nenhum;
   (3) com a tela apagada o navegador pausa a página e a busca para.
   ============================================================ */
let _audioCtx = null, _wakeLock = null, telaLigadaEstado_ = 'verificando', _wlUltimaTentativa = 0, _czLacuna = null, _czOcultoDesde = 0;
function audioCtx_(){ try{ if(!_audioCtx) _audioCtx = new (window.AudioContext||window.webkitAudioContext)(); return _audioCtx; }catch(e){ return null; } }
function desbloquearAudio_(){
  const ctx = audioCtx_(); if(!ctx) return;
  try{
    if(ctx.state==='suspended') ctx.resume();
    const b = ctx.createBuffer(1,1,22050), src = ctx.createBufferSource(); src.buffer = b; src.connect(ctx.destination); src.start(0);
  }catch(e){}
}
['pointerdown','touchend','click','keydown'].forEach(ev=>document.addEventListener(ev, ()=>{ if(!_audioCtx || _audioCtx.state!=='running') desbloquearAudio_(); }, { passive:true }));
let _ultimaNotifEm_ = 0;
function somDoSistemaAtivo_(){ try{ return avisosSuportado_() && Notification.permission === 'granted'; }catch(e){ return false; } }
function somAlerta_(){
  if(somDoSistemaAtivo_()){
    /* Som padrão de notificação do celular: quem toca é a notificação. Se quem chamou não mostrou nenhuma, mostra uma simples. */
    setTimeout(()=>{ if(Date.now() - _ultimaNotifEm_ > 1500) mostrarNotificacao_('🔔 ${NOME_RESTAURANTE_}', 'Há uma atualização nos pedidos.'); }, 400);
  } else {
    try{
      const ctx = audioCtx_();
      if(ctx){
        if(ctx.state==='suspended') ctx.resume();
        [0,0.35,0.7,1.05].forEach((t,i)=>{
          const osc = ctx.createOscillator(), gain = ctx.createGain();
          osc.type = 'square'; osc.frequency.value = i%2 ? 740 : 988;
          osc.connect(gain); gain.connect(ctx.destination);
          const ini = ctx.currentTime + t;
          gain.gain.setValueAtTime(0.0001, ini); gain.gain.exponentialRampToValueAtTime(0.5, ini+0.02); gain.gain.exponentialRampToValueAtTime(0.0001, ini+0.27);
          osc.start(ini); osc.stop(ini+0.3);
        });
      }
    }catch(e){}
  }
  try{ if(navigator.vibrate) navigator.vibrate([300,150,300,150,300]); }catch(e){}
}
function souDetector_(){ return !!(currentUser && ['Cozinha','Admin','Operador','Garçom','Entregador'].indexOf(currentUser.nivel)!==-1); }
/* ITEM 3.1 — Garçom e Entregador usam o mesmo detector, mas só veem o que é deles e podem checar com a aba em segundo plano. */
function souDetectorLeve_(){ return !!(currentUser && (currentUser.nivel==='Garçom' || currentUser.nivel==='Entregador')); }
function avisosSuportado_(){ return 'Notification' in window; }
function mostrarNotificacao_(titulo, corpo, extra){
  try{
    _ultimaNotifEm_ = Date.now();
    if(!avisosSuportado_() || Notification.permission!=='granted') return;
    const opts = { body: corpo, tag: (extra && extra.tag) || 'texas-novo-pedido', renotify: true, vibrate: [300,150,300], requireInteraction: true };
    if(extra && extra.silencioso){ opts.silent = true; delete opts.vibrate; }   /* v1.15: app na tela com a vinheta do iFood tocando — a notificação não toca um segundo som */
    const direto = ()=>{ try{ const n = new Notification(titulo, opts); n.onclick = ()=>{ try{ window.focus(); n.close(); }catch(e){} }; }catch(e){} };
    if(navigator.serviceWorker && navigator.serviceWorker.getRegistration){
      navigator.serviceWorker.getRegistration().then(reg=>{ if(reg && reg.showNotification) reg.showNotification(titulo, opts); else direto(); }).catch(direto);
    } else direto();
  }catch(e){}
}
function avisarEventoLeve_(titulo, corpo, tituloAba){
  beepCozinha_();
  try{ const original = document.title.replace(/^🔔 .*? — /,''); document.title = '🔔 ' + tituloAba + ' — ' + original; setTimeout(()=>{ document.title = original; }, 10000); }catch(e){}
  try{ if(navigator.vibrate) navigator.vibrate([300,150,300]); }catch(e){}
  mostrarNotificacao_(titulo, corpo);
}
function avisarNovoPedido_(qtd){
  beepCozinha_();
  alertaVisualCozinha_(qtd);
  mostrarNotificacao_('🍔 Novo pedido!', qtd>1 ? qtd+' pedidos novos esperando.' : 'Chegou um pedido novo.');
}
/* mantém a tela ligada e MOSTRA se está funcionando. Se o sistema soltar o bloqueio com a página visível (economia de
   bateria, por exemplo), tenta de novo uma vez; o vigia de 30 s (só local) tenta outra vez. Sem suporte, orienta a configurar o aparelho. */
async function manterTelaLigada_(){
  try{
    if(!('wakeLock' in navigator)){ telaLigadaEstado_ = 'nao-suportada'; atualizarTelaLigadaUI_(); return; }
    if(document.hidden) return;
    if(_wakeLock && !_wakeLock.released){ telaLigadaEstado_ = 'ativa'; atualizarTelaLigadaUI_(); return; }
    _wlUltimaTentativa = Date.now();
    const lock = await navigator.wakeLock.request('screen');
    _wakeLock = lock; telaLigadaEstado_ = 'ativa';
    lock.addEventListener('release', ()=>{
      if(_wakeLock === lock) _wakeLock = null;
      telaLigadaEstado_ = 'inativa'; atualizarTelaLigadaUI_();
      if(!document.hidden) setTimeout(()=>{ if(Date.now()-_wlUltimaTentativa > 5000) manterTelaLigada_(); }, 1000);
    });
  }catch(e){ _wakeLock = null; telaLigadaEstado_ = 'inativa'; }
  atualizarTelaLigadaUI_();
}
function atualizarTelaLigadaUI_(){
  const el = document.getElementById('czTela'); if(!el) return;
  const btn = document.getElementById('czTelaBtn');
  const linhas = []; let aviso = false;
  if(telaLigadaEstado_==='ativa') linhas.push('📱 Tela mantida ligada');
  else if(telaLigadaEstado_==='nao-suportada'){ linhas.push('⚠️ Este navegador não mantém a tela ligada sozinho. Nas configurações do aparelho, deixe o apagamento de tela em “Nunca” e o carregador ligado.'); aviso = true; }
  else if(telaLigadaEstado_==='inativa'){ linhas.push('⚠️ A tela NÃO está sendo mantida ligada: ela pode apagar e o detector para de buscar pedidos novos.'); aviso = true; }
  else linhas.push('📱 Verificando o bloqueio de tela…');
  if(_czLacuna){ linhas.push('⏸ A tela ficou apagada ou em outro app por '+_czLacuna+' min. Verificando os pedidos desse período…'); aviso = true; }
  else if(cozinhaUltimaChecagem && !document.hidden){
    const minSem = Math.floor((Date.now()-cozinhaUltimaChecagem.getTime())/60000);
    if(minSem >= 5){ linhas.push('⚠️ Sem verificação há '+minSem+' min. Toque em “Verificar agora”.'); aviso = true; }
  }
  el.textContent = linhas.join('\n');
  el.style.color = aviso ? 'var(--gold)' : '';
  if(btn) btn.style.display = (telaLigadaEstado_==='inativa') ? '' : 'none';
}
async function ativarAvisos_(){
  desbloquearAudio_();
  if(avisosSuportado_()){ try{ await Notification.requestPermission(); }catch(e){} }
  atualizarCardAvisos_();
  if(avisosSuportado_() && Notification.permission==='granted') mostrarNotificacao_('🔔 Avisos ativados','Você será avisado quando chegar pedido novo.');
}
function testarSomAviso_(){
  desbloquearAudio_(); somAlerta_();
  showMsg('avisosMsg','Você deve ouvir o som de notificação do celular. Se não ouvir: aumente o volume de notificações, tire o modo silencioso e confira se as notificações do navegador/app estão ligadas.','ok');
  mostrarNotificacao_('🔔 Teste de aviso','É assim que você será avisado de um pedido novo.');
}
