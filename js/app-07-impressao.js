/* ---------- FASE 13 — IMPRESSÃO (ITEM 88): A4, 58 mm e 80 mm ----------
   Um único motor para comprovantes, relatórios e fechamento de caixa. Imprime por um quadro invisível
   (não depende de pop-up, que o celular costuma bloquear) e lembra o tamanho escolhido neste aparelho. */
const FORMATOS_IMPRESSAO = ['58mm','80mm','A4'];
/* LOGO NAS IMPRESSÕES: fundo transparente (não gasta tinta/papel com retângulo preto). Embutida na página: não depende de rede nem de cache.
   A4 = colorida; 58mm/80mm (térmica) = cinza de alto contraste. */
/* Logo de impressão: a imagem enviada em Administrador → Sistema → Aparência (endereço completo, para a janela de impressão achar). Sem logo, a comanda sai só com o nome. */
function logoImpUrl_(){ try{ const l = (window.MARCA && MARCA.logos && MARCA.logos.impressao) || ''; return l ? new URL(l, location.href).href : ''; }catch(e){ return ''; } }

function logoImpressaoHtml_(f){
  const a4 = f==='A4', larg = a4 ? '65mm' : (f==='58mm' ? '34mm' : '50mm');
  const u = logoImpUrl_(); if(!u) return `<div class="logo-imp" style="text-align:center;font-weight:800;font-size:${a4 ? '22px' : '15px'};margin-bottom:6px">${NOME_UP_H_()}</div>`;
  return `<div class="logo-imp"><img src="${u}" alt="${NOME_H_()}" style="width:${larg}${a4 ? '' : ';filter:grayscale(1) contrast(1.6)'}"></div>`;
}
const FMT_KEYS = { comp:'txbFmtComprovante', rel:'txbFmtRelatorio', comanda:'txbFmtComanda', entrega:'txbFmtEntrega' };
function lerFormato(k, padrao){ try{ const v = localStorage.getItem(FMT_KEYS[k]); return FORMATOS_IMPRESSAO.includes(v) ? v : padrao; }catch(e){ return padrao; } }
function salvarFormato(k, v){ try{ localStorage.setItem(FMT_KEYS[k], v); }catch(e){} }
function classeRecibo(f){ return 'recibo ' + (f==='A4' ? 'wA4' : (f==='58mm' ? 'w58' : 'w80')); }
let ultimoRel = null;
function cssComanda_(px){
  return `.cmd{font-family:Arial,Helvetica,sans-serif;font-size:${px}px;font-weight:700;line-height:1.25;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}.cmd .num{font-size:1.9em;font-weight:900;text-align:center;line-height:1.1}.cmd .dest{background:#000;color:#fff;text-align:center;font-size:1.8em;font-weight:900;padding:5px 4px;margin:6px 0;letter-spacing:.04em}.cmd .meta{text-align:center;font-size:.95em;margin-top:2px}.cmd .sec{font-size:.85em;font-weight:900;letter-spacing:.14em;border-bottom:3px solid #000;margin:12px 0 4px;padding-bottom:1px}.cmd .it{display:flex;gap:8px;align-items:flex-start;margin-top:8px;padding-bottom:7px;border-bottom:2px dotted #000;break-inside:avoid;page-break-inside:avoid}.cmd .qt{font-size:1.9em;font-weight:900;line-height:1;min-width:1.5em;text-align:center;border:3px solid #000;border-radius:5px;padding:3px 4px;box-sizing:border-box}.cmd .nm{font-size:1.4em;font-weight:900;line-height:1.2;flex:1;min-width:0;overflow-wrap:anywhere}.cmd .ad{font-size:.78em;font-weight:800;margin-top:3px}.cmd .ob{font-size:.75em;font-weight:900;margin-top:4px;border:2px solid #000;padding:2px 5px}.cmd .box{border:3px solid #000;padding:5px 7px;margin:9px 0 0;font-size:.95em;font-weight:900;break-inside:avoid;page-break-inside:avoid}.cmd .big{font-size:1.2em}.cmd .cli{font-size:1.35em;font-weight:900}.cmd .tel{font-size:1.4em;font-weight:900;margin-top:2px}.cmd .end{font-size:1.45em;font-weight:900;line-height:1.25;margin-top:5px}.cmd .end2{font-size:1.15em;font-weight:800;margin-top:3px}.cmd .lin{display:flex;justify-content:space-between;gap:8px;font-size:1em;margin-top:2px}.cmd .lin span:last-child,.cmd .tot span:last-child{white-space:nowrap}.cmd .tot{display:flex;justify-content:space-between;gap:8px;font-size:1.7em;font-weight:900;border-top:3px solid #000;margin-top:6px;padding-top:4px}.cmd .forma{font-size:1.05em;margin-top:4px}.cmd .cob{background:#000;color:#fff;text-align:center;font-size:1.45em;font-weight:900;padding:7px 4px;margin-top:9px}.cmd .pago{border:3px solid #000;text-align:center;font-size:1.35em;font-weight:900;padding:6px 4px;margin-top:9px}.cmd .vers{text-align:center;font-size:.85em;font-weight:700;font-style:italic;line-height:1.3;margin-top:12px;padding-top:8px;border-top:2px dashed #000}.cmd .vers b{font-style:normal;font-weight:900}.cmd .rod{text-align:center;font-size:.75em;font-weight:700;margin-top:10px}`;
}
function cssImpressao(f){
  const base = `hr{border:none;border-top:2px dashed #000;margin:8px 0}h4{margin:0 0 4px;text-align:center;letter-spacing:.06em;font-weight:800}.sub-c{text-align:center;margin-bottom:7px}.linha{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.item-desc{flex:1;min-width:0}.total{font-weight:900;border-top:2px solid #000;margin-top:6px;padding-top:6px}.foot{text-align:center;margin-top:10px;font-weight:700}.logo-imp{text-align:center;margin:0 0 7px;page-break-inside:avoid;break-inside:avoid}.logo-imp img{display:block;margin:0 auto;height:auto;max-width:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}`;
  if(f==='A4') return base + cssComanda_(22) + `@page{size:A4;margin:12mm}body{margin:0;font:18px/1.6 Arial,sans-serif;color:#000}h4{font-size:28px}.sub-c{font-size:17px}.total{font-size:21px}h2{margin:0 0 6px;font-size:24px}.per{color:#222;margin-bottom:12px}.nota{margin-top:12px;font-size:16px;color:#222}table{width:100%;border-collapse:collapse;font-size:16px}th,td{border-bottom:1px solid #777;padding:7px 8px;text-align:left}th.r,td.r{text-align:right}tr.tot td{font-weight:bold;border-top:3px solid #000}pre{white-space:pre-wrap;font:16px/1.6 "Courier New",monospace}`;
  const w = f==='58mm' ? '58mm' : '80mm', fs = f==='58mm' ? '12.5px' : '14px';
  return base + cssComanda_(f==='58mm' ? 14.5 : 17) + `@page{size:${w} auto;margin:0}body{margin:0;padding:3.5mm;width:${w};box-sizing:border-box;font:${fs}/1.55 "Courier New",monospace;color:#000;font-weight:600}h4{font-size:17px;font-weight:900}.sub-c{font-size:12.5px;font-weight:700}.total{font-size:16px}.linha{gap:7px}h2{font-size:16px;text-align:center;margin:0 0 5px}.per{text-align:center;font-size:12px;margin-bottom:6px}.peq{font-size:12px;margin-bottom:6px}.nota{margin-top:8px;font-size:12px}pre{white-space:pre-wrap;font:${fs}/1.5 "Courier New",monospace;margin:0;font-weight:600}`;
}
/* MELHORIA 5.5 — iframes de impressão antigos (mais de 20 s) saem na hora de criar um novo, em vez de se acumularem por 60 s.
   O de uma impressão recente não é tocado, para não cortar uma comanda que ainda está sendo enviada à impressora. */
const _ifrsImpressao = [];
function imprimirDocumento(corpo, titulo, formato){
  const f = FORMATOS_IMPRESSAO.includes(formato) ? formato : '80mm';
  /* corpo pode ser um texto ou uma lista de documentos (ex.: várias comandas): cada documento sai com a logo no topo */
  const docs = Array.isArray(corpo) ? corpo : [corpo];
  const html = docs.map(x => logoImpressaoHtml_(f) + x).join('<div style="page-break-after:always;break-after:page;"></div>');
  { const t0 = Date.now(); for(let k=_ifrsImpressao.length-1;k>=0;k--){ if(t0 - _ifrsImpressao[k].t > 20000){ try{ _ifrsImpressao[k].el.remove(); }catch(e){} _ifrsImpressao.splice(k,1); } } }
  const ifr = document.createElement('iframe');
  /* quadro com o tamanho real da folha, fora da tela (um quadro de 1px faz a logo e o texto saírem espremidos em alguns navegadores) */
  ifr.style.cssText = 'position:fixed;left:-10000px;top:0;border:0;width:' + (f==='A4' ? 794 : (f==='58mm' ? 219 : 302)) + 'px;height:1200px;';
  document.body.appendChild(ifr);
  _ifrsImpressao.push({ el: ifr, t: Date.now() });
  const d = ifr.contentWindow.document;
  d.open(); d.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escR(titulo)}</title><style>${cssImpressao(f)}</style></head><body>${html}</body></html>`); d.close();
  /* espera a logo carregar antes de abrir a impressão (no máximo 2 s, para nunca travar) */
  const imagens = Array.from(d.images || []);
  const prontas = Promise.all(imagens.map(im => (im.complete ? null : new Promise(r => { im.onload = im.onerror = r; })))).then(()=>Promise.all(imagens.map(im => (im.decode ? im.decode().catch(()=>{}) : null))));
  Promise.race([prontas, new Promise(r => setTimeout(r, 2000))]).then(() => setTimeout(() => {
    try{ ifr.contentWindow.focus(); ifr.contentWindow.print(); }
    catch(e){ avisar('Este aparelho não abriu a impressão. Use "Copiar" ou "Enviar WhatsApp".'); }
    setTimeout(()=>ifr.remove(), 60000);
  }, 150));
}
function relHtmlImpressao(f){
  if(!ultimoRel) return '';
  const { def, p, res } = ultimoRel, agoraTxt = new Date().toLocaleString('pt-BR');
  let h = `<h2>${escR(def.t)}</h2><div class="per">${escR(nomeRestaurante_())} · ${escR(p.rot)} · emitido em ${escR(agoraTxt)}</div>`;
  if(!res.rows.length) h += '<div>Nada para mostrar neste período.</div>';
  else if(f==='A4'){
    h += `<table><thead><tr>${res.cols.map((c,i)=>`<th class="${i?'r':''}">${escR(c)}</th>`).join('')}</tr></thead><tbody>` +
      res.rows.map(l=>`<tr>${l.map((c,i)=>`<td class="${i?'r':''}">${escR(c)}</td>`).join('')}</tr>`).join('') +
      (res.total ? `<tr class="tot">${res.total.map((c,i)=>`<td class="${i?'r':''}">${escR(c)}</td>`).join('')}</tr>` : '') + '</tbody></table>';
  } else {
    const linhas = res.total ? res.rows.concat([res.total]) : res.rows;
    h += linhas.map((l,ix)=>{
      const ehTotal = res.total && ix===linhas.length-1;
      const resto = l.map((c,i)=>i>=2 && c!=='' ? res.cols[i]+': '+c : '').filter(Boolean).join(' · ');
      return (ehTotal?'<hr>':'') + `<div class="linha"><b>${escR(l[0])}</b><span>${escR(l[1]==null?'':l[1])}</span></div>` + (resto ? `<div class="peq">${escR(resto)}</div>` : '');
    }).join('');
  }
  if(res.nota) h += `<div class="nota">${escR(res.nota)}</div>`;
  return h;
}
function imprimirRelatorio(){
  if(!ultimoRel){ return; }
  const f = document.getElementById('relFormato').value;
  imprimirDocumento(relHtmlImpressao(f), ultimoRel.def.t, f);
}
function imprimirFechamentoCaixa(){
  if(!ultimoRelatorioTexto){ return; }
  const f = document.getElementById('fcFormato').value;
  imprimirDocumento(`<h2>Fechamento de caixa</h2><div class="per">${escR(nomeRestaurante_())} · emitido em ${escR(new Date().toLocaleString('pt-BR'))}</div><pre>${escR(ultimoRelatorioTexto)}</pre>`, 'Fechamento de caixa', f);
}
function iniciarFormatosImpressao(){
  const rel = document.getElementById('relFormato'), fc = document.getElementById('fcFormato');
  if(rel) rel.value = lerFormato('rel','A4');
  if(fc) fc.value = lerFormato('rel','80mm');
}

/* ---------- COMPROVANTE DE VENDA (58mm, 80mm ou A4; cliente ou entregador) ---------- */
let comprovanteContexto = null;
let comprovanteLargura = lerFormato('comp','80mm');
let comprovanteTipo = 'cliente';
function mostrarComprovante(itens, total, pagamentos, clienteNome, clienteTelefone, subtotal, valorDesconto, vendaIdReimpressao, acrescimo){
  const idBase = vendaIdReimpressao || ultimaVendaId;
  const vendaSalva = (idBase && vendas.find(v=>v.id===idBase)) || null;
  comprovanteContexto = {
    itens, total, pagamentos, clienteNome, clienteTelefone, subtotal, valorDesconto, acrescimo: Number(acrescimo)||0,
    tipoEntrega: vendaSalva ? vendaSalva.tipoEntrega : 'Retirada',
    endereco: vendaSalva ? vendaSalva.endereco : '', complemento: vendaSalva ? vendaSalva.complemento : '',
    referencia: vendaSalva ? vendaSalva.referencia : '', observacoesEntrega: vendaSalva ? vendaSalva.observacoesEntrega : '',
    statusPagamento: vendaSalva ? vendaSalva.statusPagamento : 'Pago',
    vendaId: vendaSalva ? vendaSalva.id : null, data: vendaSalva ? vendaSalva.data : ''
  };
  comprovanteTipo = 'cliente';
  document.getElementById('comprovanteTitulo').textContent = vendaIdReimpressao ? 'Comprovante' : 'Venda registrada ✅';
  document.getElementById('comprovanteFecharBtn').textContent = vendaIdReimpressao ? 'Fechar' : 'Finalizar sem enviar';
  definirLarguraComprovante(comprovanteLargura);
  document.getElementById('comprovanteTipoBox').style.display = comprovanteContexto.tipoEntrega==='Entrega' ? 'flex' : 'none';
  document.getElementById('comprovanteTipoClienteBtn').classList.add('active');
  document.getElementById('comprovanteTipoEntregadorBtn').classList.remove('active');
  renderComprovanteVisual();
  document.getElementById('comprovanteModal').classList.add('open');
}
function fecharModalComprovante(){ document.getElementById('comprovanteModal').classList.remove('open'); }
function definirLarguraComprovante(l){
  comprovanteLargura = l; salvarFormato('comp', l);
  FORMATOS_IMPRESSAO.forEach(x=>document.getElementById('comprovanteW'+x.replace('mm','')+'Btn').classList.toggle('active', l===x));
  document.getElementById('comprovanteVisual').className = classeRecibo(l);
}
function definirTipoComprovante(t){
  comprovanteTipo = t;
  document.getElementById('comprovanteTipoClienteBtn').classList.toggle('active', t==='cliente');
  document.getElementById('comprovanteTipoEntregadorBtn').classList.toggle('active', t==='entregador');
  renderComprovanteVisual();
}
function montarReciboHtml(){
  const c0 = comprovanteContexto;
  const c = Object.assign({}, c0, { clienteNome: escR(c0.clienteNome), clienteTelefone: escR(c0.clienteTelefone), endereco: escR(c0.endereco), complemento: escR(c0.complemento), referencia: escR(c0.referencia), observacoesEntrega: escR(c0.observacoesEntrega),
    itens: c0.itens.map(i=>Object.assign({}, i, { descricao: escR(i.descricao) })), pagamentos: c0.pagamentos.map(p=>Object.assign({}, p, { forma: escR(p.forma) })) });
  let h = `<h4>${NOME_UP_H_()}</h4><div class="sub-c">Delivery · Sabor que conquista</div><hr>`;
  if(c.vendaId) h += `<div class="sub-c">Pedido #${rotuloPedidoId(c.vendaId)}</div>`;
  if(c.data) h += `<div class="sub-c">${escR(c.data)}</div>`;
  if(comprovanteTipo==='entregador'){
    h += `<div class="linha"><b>ENTREGA</b></div><hr>`;
    h += `<div>${escH(c.clienteNome||'Sem cadastro')}</div>`;
    if(c.clienteTelefone) h += `<div>📞 ${c.clienteTelefone}</div>`;
    h += `<div>${escH(c.endereco||'')}${escH(c.complemento?', '+c.complemento:'')}</div>`;
    if(c.referencia) h += `<div>Ref: ${escH(c.referencia)}</div>`;
    if(c.observacoesEntrega) h += `<div>Obs: ${escH(c.observacoesEntrega)}</div>`;
    h += `<hr>`;
    c.itens.forEach(it=>{ h += `<div class="linha"><span class="item-desc">${it.quantidade}x ${escH(it.descricao)}</span></div>`; });
    h += `<hr><div class="totais">`;
    h += `<div class="linha total"><span>TOTAL</span><span>${formatarMoeda(c.total)}</span></div>`;
    h += `<div class="linha"><span>Pagamento</span><span>${c.pagamentos.map(p=>p.forma).join(' + ')}</span></div>`;
    h += `<div class="linha"><span>Status</span><span>${c.statusPagamento==='A Receber'?'A RECEBER':'JÁ PAGO'}</span></div>`;
    h += `</div>`;
  } else {
    if(c.clienteNome) h += `<div>Cliente: ${escH(c.clienteNome)}</div><hr>`;
    c.itens.forEach(it=>{ h += `<div class="linha"><span class="item-desc">${it.quantidade}x ${escH(it.descricao)}</span><span>${formatarMoeda(it.quantidade*it.valorUnitario)}</span></div>`; });
    h += `<div class="totais">`;
    if(c.valorDesconto>0){
      h += `<div class="linha"><span>Subtotal</span><span>${formatarMoeda(c.subtotal)}</span></div>`;
      h += `<div class="linha"><span>Desconto</span><span>-${formatarMoeda(c.valorDesconto)}</span></div>`;
    }
    if(c.acrescimo>0) h += `<div class="linha"><span>Acréscimo (forma de pagamento)</span><span>+${formatarMoeda(c.acrescimo)}</span></div>`;
    h += `<div class="linha total"><span>TOTAL</span><span>${formatarMoeda(c.total)}</span></div>`;
    h += `<div class="linha"><span>Pagamento</span><span>${c.pagamentos.map(p=>p.forma+' '+formatarMoeda(p.valor)).join(' + ')}</span></div>`;
    if(c.statusPagamento==='A Receber') h += `<div class="linha"><span>Status</span><span>A RECEBER</span></div>`;
    h += `</div>`;
    if(c.tipoEntrega==='Entrega'){
      h += `<hr><div>Entrega: ${escH(c.endereco||'')}${escH(c.complemento?', '+c.complemento:'')}</div>`;
    }
  }
  h += `<hr><div class="foot">Obrigado pela preferência! 🤠</div>`;
  return h;
}
function montarReciboTexto(){
  const c = comprovanteContexto;
  let t = `🧾 ${NOME_UP_()}${comprovanteTipo==='entregador'?' — ENTREGA':' — COMPROVANTE'}\n\n`;
  if(comprovanteTipo==='entregador'){
    t += `Cliente: ${c.clienteNome||'Sem cadastro'}\n`;
    if(c.clienteTelefone) t += `Tel: ${c.clienteTelefone}\n`;
    t += `Endereço: ${c.endereco||''}${c.complemento?', '+c.complemento:''}\n`;
    if(c.referencia) t += `Ref: ${c.referencia}\n`;
    if(c.observacoesEntrega) t += `Obs: ${c.observacoesEntrega}\n`;
    t += `\n`;
    c.itens.forEach(it=>{ t += `${it.quantidade}x ${it.descricao}\n`; });
    t += `\nTotal: ${formatarMoeda(c.total)}\n`;
    t += `Pagamento: ${c.pagamentos.map(p=>p.forma).join(' + ')} (${c.statusPagamento==='A Receber'?'A RECEBER':'JÁ PAGO'})\n`;
  } else {
    if(c.clienteNome) t += `Cliente: ${c.clienteNome}\n\n`;
    c.itens.forEach(it=>{ t += `${it.quantidade}x ${it.descricao} — ${formatarMoeda(it.quantidade*it.valorUnitario)}\n`; });
    if(c.valorDesconto>0){ t += `\nSubtotal: ${formatarMoeda(c.subtotal)}\nDesconto: -${formatarMoeda(c.valorDesconto)}\n`; }
    if(c.acrescimo>0) t += `\nAcréscimo (forma de pagamento): +${formatarMoeda(c.acrescimo)}`;
    t += `\nTotal: ${formatarMoeda(c.total)}\n`;
    t += `Pagamento: ${c.pagamentos.map(p=>p.forma+' '+formatarMoeda(p.valor)).join(' + ')}\n`;
    if(c.statusPagamento==='A Receber') t += `Status: A RECEBER\n`;
  }
  t += `\nObrigado pela preferência! 🤠`;
  return t;
}
function renderComprovanteVisual(){
  document.getElementById('comprovanteVisual').className = classeRecibo(comprovanteLargura);
  document.getElementById('comprovanteVisual').innerHTML = montarReciboHtml();
}
function copiarComprovante(){ copiarTextoComFallback(montarReciboTexto(), 'comprovanteMsg'); }
function enviarComprovanteWhatsapp(){ window.open('https://wa.me/?text=' + encodeURIComponent(montarReciboTexto()), '_blank'); }
function imprimirComprovante(){ imprimirDocumento(montarReciboHtml(), 'Comprovante', comprovanteLargura); }

/* Histórico de vendas por dia. Dias com mais de 30 dias podem ter pedidos que já foram para a planilha (arquivo): eles são buscados lá, só para ver e reimprimir. */
let _vArqSeq_ = 0;
function vDiaAntigo_(dataFiltro){ return !!dataFiltro && new Date(dataFiltro + 'T23:59:59').getTime() < Date.now() - 30*86400000; }
function vLinhaHtml_(v, arq){
  return `<tr class="${v.status==='Cancelada'?'cancelada':''}">
      <td>${v.clienteNome?escH(v.clienteNome):'<em>sem cadastro</em>'}${quemFezPedido_(v)?'<br><small style="color:var(--muted);">'+escH(quemFezPedido_(v))+'</small>':''}${arq?'<br><small style="color:var(--muted);">arquivada na planilha · pedido #'+escH(v.numero||'')+'</small>':''}</td><td>${formatarMoeda(v.valorTotal)}</td><td>${escH(v.formaPagamento)}</td>
      <td>${arq?`<button class="ghost" title="Reimprimir comprovante" onclick="reimprimirVendaArq_('${escH(v.id)}')">🖨️</button>`:(v.status==='Confirmada'?`<button class="ghost" title="Reimprimir comprovante" onclick="reimprimirVenda('${v.id}')">🖨️</button><button class="ghost" onclick="abrirModalEditarVenda('${v.id}')">editar</button><button class="ghost" onclick="abrirModalCancelar('venda','${v.id}')">cancelar</button>`:`<span class="obs-line">${escH(v.motivoCancelamento)}</span>`)}</td>
    </tr>`;
}
function renderVendas(){
  const dataFiltro = document.getElementById('vHistData').value;
  const tbody = document.getElementById('vTable');
  if(!tbody) return;
  const lista = vendas.filter(v => diaDoTurno_(v.timestamp) === dataFiltro).sort((a,b)=>b.timestamp-a.timestamp);
  const total = lista.filter(v=>v.status==='Confirmada').reduce((s,v)=>s+Number(v.valorTotal),0);
  document.getElementById('vTotalDia').textContent = formatarMoeda(total);
  const buscarArq = vDiaAntigo_(dataFiltro) && typeof arqPodeLer_ === 'function' && arqPodeLer_();
  const seq = ++_vArqSeq_;
  tbody.innerHTML = (lista.length ? lista.map(v=>vLinhaHtml_(v, false)).join('') : (buscarArq ? '' : '<tr class="empty-row"><td colspan="4">Nenhuma venda nesse dia.</td></tr>'))
    + (buscarArq ? '<tr class="empty-row" id="vArqLinha"><td colspan="4">Buscando pedidos arquivados na planilha…</td></tr>' : '');
  if(buscarArq) vCarregarArquivoDia_(dataFiltro, seq, lista, total);
}
async function vCarregarArquivoDia_(dataFiltro, seq, lista, totalMem){
  let c;
  try{ c = await relBuscarMes_(dataFiltro.slice(0,7)); }
  catch(e){
    if(seq !== _vArqSeq_) return;
    const l = document.getElementById('vArqLinha'); if(l) l.innerHTML = '<td colspan="4">Não foi possível buscar os pedidos arquivados agora. Eles continuam salvos na planilha. <button type="button" class="ghost" onclick="renderVendas()">Tentar de novo</button></td>';
    return;
  }
  if(seq !== _vArqSeq_) return;
  const ja = new Set(lista.map(v=>v.id));
  const arq = (c.vendas || []).filter(v => !ja.has(v.id) && diaDoTurno_(v.timestamp) === dataFiltro).sort((a,b)=>b.timestamp-a.timestamp);
  const l = document.getElementById('vArqLinha'); if(!l) return;
  if(!arq.length){ l.outerHTML = lista.length ? '' : '<tr class="empty-row"><td colspan="4">Nenhuma venda nesse dia.</td></tr>'; return; }
  l.outerHTML = arq.map(v=>vLinhaHtml_(v, true)).join('');
  const extra = arq.filter(v=>v.status==='Confirmada').reduce((s,v)=>s+Number(v.valorTotal),0);
  document.getElementById('vTotalDia').textContent = formatarMoeda(totalMem + extra);
}
/* Reimprime pedido arquivado a partir do mês buscado na planilha. */
function reimprimirVendaArq_(id){
  let v = null, c = null;
  Object.keys(_relArqCache_ || {}).some(k => { const x = _relArqCache_[k]; const f = (x.vendas||[]).find(y=>y.id===id); if(f){ v = f; c = x; return true; } return false; });
  if(!v) return;
  const itens = (c.itens||[]).filter(it=>it.vendaId===id).map(it=>({ quantidade:Number(it.quantidade)||1, descricao:it.descricao, valorUnitario:Number(it.valorUnitario)||0 }));
  let pags = (c.pagamentos||[]).filter(x=>x.vendaId===id).map(x=>({ forma:x.forma, valor:Number(x.valor)||0 }));
  if(!pags.length) pags = [{ forma:v.formaPagamento||'—', valor:Number(v.valorTotal)||0 }];
  mostrarComprovante(itens, Number(v.valorTotal)||0, pags, v.clienteNome, v.clienteTelefone, Number(v.valorOriginal)||Number(v.valorTotal)||0, Number(v.valorDesconto)||0, id, Number(v.acrescimoForma)||0);
}

/* Reimpressão (ITEM 88): monta o comprovante a partir da venda já gravada. */
function reimprimirVenda(id){
  const v = vendas.find(x=>x.id===id); if(!v) return;
  const itens = itensVenda.filter(it=>it.vendaId===id).map(it=>({ quantidade:Number(it.quantidade)||1, descricao:it.descricao, valorUnitario:Number(it.valorUnitario)||0 }));
  let pags = pagamentosVenda.filter(x=>x.vendaId===id).map(x=>({ forma:x.forma, valor:Number(x.valor)||0 }));
  if(!pags.length) pags = [{ forma:v.formaPagamento||'—', valor:Number(v.valorTotal)||0 }];
  const bk = vendas;
  try{ vendas = vendas.concat([v]); mostrarComprovante(itens, Number(v.valorTotal)||0, pags, v.clienteNome, v.clienteTelefone, Number(v.valorOriginal)||Number(v.valorTotal)||0, Number(v.valorDesconto)||0, id, Number(v.acrescimoForma)||0); }
  finally{ vendas = bk; }   // só durante o desenho: o pedido arquivado dá data, tipo e endereço ao comprovante e não entra na lista do sistema
}

