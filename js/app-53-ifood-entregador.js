/* ============================================================================================================
   iFood · ENTREGADOR DO iFOOD (Sob Demanda) — Administrador › Sistema › Integrações e contas › iFood › "Entregador do iFood"
   DESLIGADO por padrão. Ligando (com a sua senha) a loja pode pedir um entregador do iFood:
   • pedido que veio do iFood e a loja entrega (modo A) · pedido do cardápio próprio/balcão/WhatsApp (modo B).
   Passos: 1) Pedir cotação (grátis)  2) Chamar entregador (cobra; pede a SUA SENHA)  3) acompanhar; cancelar com motivo.
   Pré-requisito: contratar o serviço "Sob Demanda" no Portal do Parceiro do iFood.
   ============================================================================================================ */
(function(){
  const ROT = { cotando:'consultando o iFood…', cotada:'cotação pronta', erro_cotacao:'sem cotação', solicitando:'chamando entregador…', alocada:'entregador a caminho da loja', em_rota:'a caminho do cliente', entregue:'entregue', falhou:'não deu certo', cancelando:'cancelando…', cancelada:'cancelada' };
  const CONF = { LOW:'baixo', MODERATE:'médio', HIGH:'alto', VERY_HIGH:'muito alto', SEM_REGRAS:'sem dados (pedido antigo)' };
  const REGRAS = { customer_address_change_requested:'cliente pediu troca de endereço', customer_address_confirmed:'cliente confirmou o endereço', customer_phone_is_fixed:'telefone fixo', customer_phone_valid:'telefone válido', merchant_address_change_approved:'loja aprovou a troca', merchant_address_change_denied:'loja negou a troca' };
  const reais = n => 'R$ ' + (Number(n)||0).toFixed(2).replace('.', ',');
  const hm = iso => { if(!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}); };
  const seg = s => Math.round(Number(s)/60);
  let dados_ = null, timer_ = null;
  const box = () => document.getElementById('ifoodShip');
  const msg = (t, tipo) => { try{ showMsg(integMsgId_(), t, tipo||'warn'); }catch(e){ alert(t); } };

  window.carregarIfoodShip_ = async function(auto){
    const b = box(); if(!b) return;
    try{
      const r = await apiCall('ifoodShipLista', {});
      if(!r || !r.ok){ b.innerHTML = '<div class="obs-line">' + escH((r && r.message) || 'Não foi possível carregar.') + '</div>'; return; }
      dados_ = r; desenhar_();
      clearTimeout(timer_);
      if((r.entregas||[]).some(x=>['cotando','solicitando','cancelando'].includes(x.estado)) && document.getElementById('ifoodShip')) timer_ = setTimeout(()=>carregarIfoodShip_(true), 6000);
    }catch(e){ if(!auto) b.innerHTML = '<div class="obs-line">Sem conexão. Confira a internet e tente de novo.</div>'; }
  };

  function desenhar_(){
    const r = dados_, c = r.config || {}, b = box();
    const cab = `<div class="notif-card"><b>🛵 Entregador do iFood (Sob Demanda)</b>
      <div class="obs-line">Situação: <b>${c.ligado ? 'LIGADO' : 'DESLIGADO'}</b> · gasto nos últimos 7 dias: <b>${reais(r.gasto7d)}</b></div>
      <div class="obs-line">O iFood cobra cada corrida (valor da cotação). Chamar e cancelar pedem a sua senha. Contrate o serviço "Sob Demanda" no Portal do Parceiro antes de ligar.</div>
      <div class="inline-form" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <input id="shCidade" placeholder="Cidade da loja" value="${escH(c.cidade||'')}" style="max-width:160px">
        <input id="shUf" placeholder="UF" maxlength="2" value="${escH(c.uf||'')}" style="max-width:60px">
        <input id="shPrep" type="number" min="1" max="60" placeholder="Preparo (min)" value="${escH(String(c.preparoMin||15))}" style="max-width:120px" title="Tempo de preparo: o entregador é alocado para chegar quando o pedido ficar pronto">
        <button class="ghost" onclick="ifoodShipConfig_(${c.ligado ? 'false' : 'true'})">${c.ligado ? 'Desligar' : 'Ligar'}</button>
        <button class="ghost" onclick="ifoodShipConfig_(null)">Salvar ajustes</button>
        <button class="ghost" onclick="carregarIfoodShip_()">Atualizar</button>
      </div></div>`;
    if(!c.ligado){ box().innerHTML = cab; return; }
    const cand = (r.candidatas||[]).map(p=>{
      const modoB = p.modo === 'B';
      const endTxt = [p.endereco, p.complemento].filter(Boolean).join(' · ');
      return `<div class="obs-line" style="border-left:4px solid ${modoB?'#3498db':'#27ae60'};padding-left:8px"><b>Pedido #${escH(String(p.pedido))}</b> · ${escH(p.cliente||'')} · ${reais(p.total)} · ${escH(p.pagamento==='Pago'?'já pago':(p.forma||'pagar na entrega'))}<br>
        <small>${modoB?'Fora do iFood (cardápio próprio/balcão)':'Veio do iFood'} · ${escH(endTxt)}</small>
        ${modoB ? formB_(p) : ''}
        <div class="btnrow"><button class="ghost" onclick="ifoodShipCotar_('${escH(p.vendaId)}','${p.modo}')">Pedir cotação (grátis)</button></div></div>`;
    }).join('') || '<div class="obs-line">Nenhum pedido de entrega esperando entregador. Aparecem aqui os pedidos de ENTREGA confirmados e ainda não saídos.</div>';
    const ent = (r.entregas||[]).map(linha_).join('') || '<div class="obs-line">Nenhuma corrida nos últimos 7 dias.</div>';
    b.innerHTML = cab + `<div class="notif-card"><b>Pedidos que podem chamar entregador</b>${cand}</div><div class="notif-card"><b>Corridas</b>${ent}</div>`;
  }

  function formB_(p){
    const k = p.vendaId;
    return `<div class="inline-form" style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">
      <input id="shRua_${k}" placeholder="Rua" style="flex:2 1 150px"><input id="shNum_${k}" placeholder="Nº" style="max-width:70px">
      <input id="shBai_${k}" placeholder="Bairro" style="flex:1 1 110px"><input id="shCid_${k}" placeholder="Cidade" value="${escH((dados_.config||{}).cidade||'')}" style="flex:1 1 110px">
      <input id="shUf_${k}" placeholder="UF" maxlength="2" value="${escH((dados_.config||{}).uf||'')}" style="max-width:55px"><input id="shCep_${k}" placeholder="CEP (8 números)" style="max-width:130px">
      <input id="shLat_${k}" placeholder="Latitude" value="${p.lat!=null?escH(String(p.lat)):''}" style="max-width:110px"><input id="shLng_${k}" placeholder="Longitude" value="${p.lng!=null?escH(String(p.lng)):''}" style="max-width:110px">
      <input id="shCmp_${k}" placeholder="Complemento" style="flex:1 1 110px"><input id="shRef_${k}" placeholder="Referência" style="flex:1 1 110px"></div>
      <small>Latitude/longitude: no Google Maps, toque e segure no endereço e copie os dois números.</small>`;
  }

  function linha_(x){
    const ativo = ['solicitando','alocada','em_rota'].includes(x.estado);
    const cor = x.estado==='falhou'||x.estado==='erro_cotacao' ? '#c0392b' : x.estado==='entregue' ? '#27ae60' : '#e67e22';
    const prazo = x.estado==='cotada' && x.expiraEm ? ` · vale até ${hm(x.expiraEm)}` : '';
    const tempo = x.tempoMin ? ` · chega em ${seg(x.tempoMin)}–${seg(x.tempoMax)} min` : '';
    let h = `<div class="obs-line" style="border-left:4px solid ${cor};padding-left:8px"><b>Pedido #${escH(String(x.pedido))}</b> · ${escH(x.cliente||'')} · <b>${escH(ROT[x.estado]||x.estado)}</b>${x.valor!=null?' · '+reais(x.valor):''}${tempo}${x.distancia?' · '+(Number(x.distancia)/1000).toFixed(1).replace('.',',')+' km':''}${prazo}
      ${x.erro ? `<br><span style="color:#c0392b">⚠️ ${escH(x.erro)}</span>` : ''}
      ${x.codigo ? `<br>🔑 Código que o cliente fala ao entregador: <b style="font-size:1.2em">${escH(x.codigo)}</b>` : ''}
      ${x.rastreio ? `<br>📍 <a href="${escH(x.rastreio)}" target="_blank" rel="noopener">Link de rastreio do cliente</a> <button class="ghost" onclick="ifoodShipCopiar_('${escH(x.rastreio)}')">Copiar link</button>` : ''}
      ${x.confianca ? `<br>🛡️ Nível de confiança da entrega: <b>${escH(CONF[x.confianca]||x.confianca)}</b>${x.regras?' <small>('+Object.keys(x.regras).filter(k=>x.regras[k]).map(k=>escH(REGRAS[k]||k)).join('; ')+')</small>':''}` : ''}`;
    if(x.enderecoPendente) h += `<br><b>📍 O cliente pediu para trocar o endereço (responda em até 15 min; sem resposta o iFood nega).</b> <button class="ghost" onclick="ifoodShipEnd_('${x.id}','aceitar')">Aceitar</button> <button class="ghost" onclick="ifoodShipEnd_('${x.id}','negar')">Negar</button>`;
    h += '<div class="btnrow">';
    if(x.estado==='cotada') h += `<button onclick="ifoodShipChamar_('${x.id}',${Number(x.valor)||0})">Chamar entregador (${reais(x.valor)})</button> <button class="ghost" onclick="ifoodShipCancelar_('${x.id}','${x.modo}',true)">Descartar cotação</button>`;
    if(ativo) h += `<button class="ghost" onclick="ifoodShipCancelar_('${x.id}','${x.modo}')">Cancelar corrida</button>`;
    if(x.modo==='B' && ['alocada','em_rota','solicitando'].includes(x.estado)) h += `<button class="ghost" onclick="ifoodShipSafe_('${x.id}')">Ver nível de confiança</button> <button class="ghost" onclick="ifoodShipEnd_('${x.id}','confirmar')">Cliente confirmou o endereço</button>`;
    h += '</div>';
    if(x.modo==='B' && x.motivos && x.motivos.length && ativo) h += `<div class="inline-form"><select id="shMot_${x.id}">${x.motivos.map(m=>`<option value="${escH(m.cancelCodeId)}">${escH(m.description)}</option>`).join('')}</select> <button onclick="ifoodShipCancelar_('${x.id}','B',false,true)">Confirmar cancelamento</button></div>`;
    return h + '</div>';
  }

  window.ifoodShipConfig_ = async function(ligar){
    const cidade = (document.getElementById('shCidade')||{}).value||'', uf = (document.getElementById('shUf')||{}).value||'', prep = (document.getElementById('shPrep')||{}).value||'15';
    if(ligar === true && !confirm('Ligar o entregador do iFood? Cada corrida chamada é cobrada pelo iFood.')) return;
    const senha = await pedirSenha_(); if(!senha) return;
    try{
      const p = { salvar:true, cidade, uf, preparoMin:prep, senhaAdminConfirmacao:senha }; if(ligar !== null) p.ligado = ligar; else p.ligado = !!((dados_||{}).config||{}).ligado;
      const r = await apiCall('ifoodShipConfig', p); msg((r&&r.ok)?'Salvo.':((r&&r.message)||'Não foi possível salvar.'), r&&r.ok?'ok':'warn'); carregarIfoodShip_();
    }catch(e){ msg('Sem conexão. Confira a internet e tente de novo.'); }
  };

  window.ifoodShipCotar_ = async function(vendaId, modo){
    const p = { vendaId };
    if(modo === 'B'){
      const g = id => ((document.getElementById(id + '_' + vendaId)||{}).value||'').trim();
      p.endereco = { rua:g('shRua'), numero:g('shNum'), bairro:g('shBai'), cidade:g('shCid'), uf:g('shUf').toUpperCase(), cep:g('shCep'), complemento:g('shCmp'), referencia:g('shRef'), lat:g('shLat').replace(',', '.'), lng:g('shLng').replace(',', '.') };
    }
    try{ const r = await apiCall('ifoodShipCotar', p); msg((r&&r.message)||'Não foi possível.', r&&r.ok?'ok':'warn'); if(r&&r.ok) carregarIfoodShip_(); }catch(e){ msg('Sem conexão. Confira a internet e tente de novo.'); }
  };

  window.ifoodShipChamar_ = async function(id, valor){
    if(!confirm('Chamar o entregador do iFood por ' + reais(valor) + '? O iFood cobra este valor.')) return;
    const senha = await pedirSenha_(); if(!senha) return;
    try{ const r = await apiCall('ifoodShipChamar', { id, senhaAdminConfirmacao:senha }); msg((r&&r.message)||'Não foi possível.', r&&r.ok?'ok':'warn'); carregarIfoodShip_(); }catch(e){ msg('Sem conexão. Confira a internet e tente de novo.'); }
  };

  /* cancelar: modo A = direto; modo B = primeiro busca os motivos oficiais no iFood, depois a pessoa escolhe */
  window.ifoodShipCancelar_ = async function(id, modo, descartar, confirmado){
    try{
      if(modo === 'B' && !descartar && !confirmado){
        const r = await apiCall('ifoodShipMotivos', { id }); msg((r&&r.message)||'Não foi possível.', r&&r.ok?'ok':'warn');
        setTimeout(()=>carregarIfoodShip_(), 4000); setTimeout(()=>carregarIfoodShip_(), 9000); return;
      }
      const codigo = modo === 'B' && confirmado ? ((document.getElementById('shMot_' + id)||{}).value||'') : '';
      if(!descartar && !confirm('Cancelar esta corrida? Dependendo do momento o iFood pode cobrar.')) return;
      const senha = await pedirSenha_(); if(!senha) return;
      const r = await apiCall('ifoodShipCancelar', { id, codigo, senhaAdminConfirmacao:senha }); msg((r&&r.message)||'Não foi possível.', r&&r.ok?'ok':'warn'); carregarIfoodShip_();
    }catch(e){ msg('Sem conexão. Confira a internet e tente de novo.'); }
  };

  window.ifoodShipEnd_ = async function(id, acao){
    try{ const r = await apiCall('ifoodShipEndereco', { id, acao }); msg((r&&r.message)||'Não foi possível.', r&&r.ok?'ok':'warn'); setTimeout(()=>carregarIfoodShip_(), 3000); }catch(e){ msg('Sem conexão. Confira a internet e tente de novo.'); }
  };
  window.ifoodShipSafe_ = async function(id){
    try{ const r = await apiCall('ifoodShipSafe', { id }); msg((r&&r.message)||'Não foi possível.', r&&r.ok?'ok':'warn'); setTimeout(()=>carregarIfoodShip_(), 3500); }catch(e){ msg('Sem conexão. Confira a internet e tente de novo.'); }
  };
  window.ifoodShipCopiar_ = function(t){ try{ navigator.clipboard.writeText(t).then(()=>msg('Link copiado. Envie ao cliente.', 'ok'), ()=>prompt('Copie o link:', t)); }catch(e){ prompt('Copie o link:', t); } };
})();
