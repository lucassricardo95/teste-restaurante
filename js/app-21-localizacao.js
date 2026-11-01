
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const INTERVALO_MS = 18000;
  let timer = null, ids = [];

  /* ---------- ENTREGADOR: envio de posição ---------- */
  const souEntregadorReal_ = () => !!(typeof currentUser !== 'undefined' && currentUser && currentUser.nivel === 'Entregador' && !currentUser.verComo);
  function enviar_(pos){
    const lat = Number(pos.coords.latitude), lng = Number(pos.coords.longitude), pr = Number(pos.coords.accuracy);
    if(!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    ids.slice().forEach(id => {
      sbRpc_('entrega_atualizar_posicao', { p:{ vendaId:id, lat:lat, lng:lng, precisaoM:Number.isFinite(pr) ? Math.min(pr, 5000) : null } }).catch(() => {});
    });
  }
  function ler_(){
    if(!ids.length || !navigator.geolocation || document.hidden || navigator.onLine === false) return;
    try{ navigator.geolocation.getCurrentPosition(enviar_, () => {}, { enableHighAccuracy:true, timeout:10000, maximumAge:5000 }); }catch(e){}
  }
  function parar_(){ if(timer){ clearInterval(timer); timer = null; } ids = []; }
  function sincronizar_(){
    if(!souEntregadorReal_()){ if(timer) parar_(); return; }
    const meu = loginVisao_();
    const novos = (vendas || []).filter(v => v.status === 'Confirmada' && v.tipoEntrega === 'Entrega' && v.statusPedido === 'Saiu para entrega' && v.entregador === meu).map(v => v.id);
    const mudou = novos.length !== ids.length || novos.some(i => ids.indexOf(i) === -1);
    ids = novos;
    if(!ids.length){ parar_(); return; }
    if(!timer){ timer = setInterval(ler_, INTERVALO_MS); ler_(); }
    else if(mudou) ler_();
  }
  window.entregaLocalizacaoSincronizar_ = sincronizar_;

  /* ---------- EQUIPE: "Ver localização" ---------- */
  let mapaId = null, mapaTimer = null;
  window.botaoVerLocalizacao_ = function(v){
    if(!v || v.statusPedido !== 'Saiu para entrega' || !v.entregador) return '';
    if(!currentUser || (currentUser.nivel !== 'Admin' && currentUser.nivel !== 'Operador')) return '';
    return '<div class="btnrow mt-2"><button type="button" class="ghost" onclick="abrirMapaEntrega_(\'' + escH(v.id) + '\')">📍 Ver localização</button></div>';
  };
  function modal_(){
    let m = $('mapaEntregaModal');
    if(!m){
      m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'mapaEntregaModal';
      m.innerHTML = '<div class="modal-box" style="max-width:420px;"><div class="modal-header"><h2>📍 Localização do entregador</h2><button class="close-btn" type="button" aria-label="Fechar" onclick="fecharMapaEntrega_()">✕</button></div><div id="mapaEntregaCorpo"><div id="mapaEntregaTxt"></div><div id="mapaEntregaMapa" style="display:none;position:relative;height:300px;margin-top:8px;border-radius:8px;overflow:hidden;background:#2a2a2a;touch-action:manipulation;"></div></div></div>';
      document.body.appendChild(m);
    }
    return m;
  }

  /* ---------- MAPA EMBUTIDO (tiles do OpenStreetMap em <img>; não depende de biblioteca nem de pasta vendor/) ---------- */
  let zoom_ = 16, ultimoPonto_ = null;
  function tile_(lat, lng, z){ const n = Math.pow(2, z), r = lat * Math.PI / 180; return { x:(lng + 180) / 360 * n, y:(1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n, n:n }; }
  function mapaOculto_(){ const d = $('mapaEntregaMapa'); if(d) d.style.display = 'none'; }
  window.mapaEntregaZoom_ = function(d){ zoom_ = Math.max(12, Math.min(18, zoom_ + d)); if(ultimoPonto_) mapaDesenhar_(ultimoPonto_.lat, ultimoPonto_.lng, ultimoPonto_.semSinal); };
  function mapaDesenhar_(lat, lng, semSinal){
    const div = $('mapaEntregaMapa'); if(!div || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if(!$('mapaEntregaModal') || !$('mapaEntregaModal').classList.contains('open')) return;
    ultimoPonto_ = { lat:lat, lng:lng, semSinal:!!semSinal };
    div.style.display = 'block';
    const W = div.clientWidth || 340, H = div.clientHeight || 280, t = tile_(lat, lng, zoom_);
    const cx = Math.floor(t.x), cy = Math.floor(t.y), ox = (t.x - cx) * 256, oy = (t.y - cy) * 256;
    const dxMax = Math.ceil((W / 2) / 256) + 1, dyMax = Math.ceil((H / 2) / 256) + 1;
    let h = '';
    for(let dy = -dyMax; dy <= dyMax; dy++){
      const ty = cy + dy; if(ty < 0 || ty >= t.n) continue;
      for(let dx = -dxMax; dx <= dxMax; dx++){
        const tx = ((cx + dx) % t.n + t.n) % t.n;
        h += '<img alt="" draggable="false" referrerpolicy="origin" src="https://tile.openstreetmap.org/' + zoom_ + '/' + tx + '/' + ty + '.png" style="position:absolute;width:256px;height:256px;left:' + Math.round(W / 2 - ox + dx * 256) + 'px;top:' + Math.round(H / 2 - oy + dy * 256) + 'px;">';
      }
    }
    const cor = semSinal ? '#999' : '#d4af37';
    h += '<div style="position:absolute;left:' + (W / 2 - 11) + 'px;top:' + (H / 2 - 11) + 'px;width:22px;height:22px;border-radius:50%;background:' + cor + ';border:3px solid #fff;box-shadow:0 0 0 3px rgba(0,0,0,.35);box-sizing:border-box;"></div>';
    h += '<div style="position:absolute;left:8px;top:8px;display:flex;flex-direction:column;gap:6px;"><button type="button" aria-label="Aproximar" onclick="mapaEntregaZoom_(1)" style="width:36px;height:36px;padding:0;margin:0;border-radius:8px;background:#fff;color:#111;border:1px solid #999;font-size:20px;font-weight:700;line-height:1;">+</button><button type="button" aria-label="Afastar" onclick="mapaEntregaZoom_(-1)" style="width:36px;height:36px;padding:0;margin:0;border-radius:8px;background:#fff;color:#111;border:1px solid #999;font-size:20px;font-weight:700;line-height:1;">−</button></div>';
    h += '<div style="position:absolute;right:0;bottom:0;background:rgba(255,255,255,.8);color:#222;font-size:12px;padding:1px 5px;">© OpenStreetMap</div>';
    div.innerHTML = h;
  }
  async function carregarMapa_(){
    const corpo = $('mapaEntregaTxt'); if(!corpo || !mapaId) return;
    let r = null;
    try{ r = await sbRpc_('entrega_ver_posicao', { p:{ vendaId:mapaId } }); }catch(e){ r = null; }
    if(!$('mapaEntregaModal') || !$('mapaEntregaModal').classList.contains('open')) return;
    if(!r || !r.ok){ mapaOculto_(); corpo.innerHTML = '<p class="sub">Não foi possível ler a posição agora. Tentando de novo em instantes…</p>'; return; }
    if(r.estado === 'aguardando'){ mapaOculto_(); corpo.innerHTML = '<p class="sub">Aguardando o entregador iniciar a entrega.</p>'; return; }
    if(r.estado === 'sem_posicao'){ mapaOculto_(); corpo.innerHTML = '<p class="sub">Posição indisponível. O entregador ainda não enviou a localização (precisa permitir o GPS e manter o app aberto).</p>'; return; }
    const seg = Number(r.atualizadoHaSeg) || 0;
    const quando = seg < 90 ? 'há ' + seg + ' s' : 'há ' + Math.round(seg / 60) + ' min';
    corpo.innerHTML = (r.estado === 'sem_sinal' ? '<p class="sub" style="color:#f0d78c;">Posição indisponível. Última atualização ' + escH(quando) + '.</p>' : '<p class="sub">Atualizado ' + escH(quando) + '</p>') +
      (r.km != null ? '<p class="sub">A <b>' + escH(String(r.km).replace('.', ',')) + ' km</b> do destino</p>' : (r.destinoCompartilhado ? '' : '<p class="sub">O cliente não compartilhou o destino (a distância fica indisponível).</p>'));
    mapaDesenhar_(Number(r.lat), Number(r.lng), r.estado === 'sem_sinal');
  }
window.abrirMapaEntrega_ = function(vendaId){
    mapaId = String(vendaId || ''); const m = modal_(); m.classList.add('open');
    $('mapaEntregaTxt').innerHTML = '<p class="sub">⏳ Buscando a posição…</p>'; mapaOculto_();
    carregarMapa_(); clearInterval(mapaTimer); mapaTimer = setInterval(() => { if(!document.hidden) carregarMapa_(); }, INTERVALO_MS);
  };
  window.fecharMapaEntrega_ = function(){
    const m = $('mapaEntregaModal'); if(m) m.classList.remove('open');
    clearInterval(mapaTimer); mapaTimer = null; mapaId = null; ultimoPonto_ = null;
  };

  /* ---------- CLIENTE: distância aproximada + compartilhar destino (opcional) ---------- */
  const CHAVE_DEST = 'txb_destino_compartilhado_v1';
  const jaCompartilhou_ = c => { try{ return (JSON.parse(localStorage.getItem(CHAVE_DEST) || '{}') || {})[c] === 1; }catch(e){ return false; } };
  const marcarCompartilhou_ = c => { try{ const o = JSON.parse(localStorage.getItem(CHAVE_DEST) || '{}') || {}; o[c] = 1; const ks = Object.keys(o); if(ks.length > 30) delete o[ks[0]]; localStorage.setItem(CHAVE_DEST, JSON.stringify(o)); }catch(e){} };
  const autoLoc_ = {};   /* por pedido: 'pedindo' | 'falhou' (a permissão é pedida sozinha, uma vez por pedido) */
  window.acLocalAtualizar_ = async function(codigo, r){
    const box = $('acLocal'); if(!box) return;
    window.__acUltimo_ = { codigo:codigo, r:r };
    if(!r || r.tipoEntrega !== 'Entrega' || r.status === 'Cancelada' || ['Recebido','Em preparo','Pronta','Saiu para entrega'].indexOf(r.statusPedido) === -1){ box.innerHTML = ''; return; }
    let html = '';
    if(r.statusPedido === 'Saiu para entrega'){
      let d = null; try{ d = await sbRpcPublico_('api_distancia_entrega_publico', { p:{ codigo:codigo } }); }catch(e){ d = null; }
      if(d && d.ok && d.estado === 'ok') html += '<p class="sub mt-2">🛵 O entregador está a cerca de <b>' + escH(String(d.km).replace('.', ',')) + ' km</b>.</p>';
      else if(d && d.ok && d.estado === 'sem_sinal') html += '<p class="sub mt-2">🛵 Posição do entregador indisponível no momento.</p>';
    }
    if(!jaCompartilhou_(codigo) && navigator.geolocation && autoLoc_[codigo] !== 'falhou'){
      if(!autoLoc_[codigo]){ autoLoc_[codigo] = 'pedindo'; setTimeout(() => window.acCompartilharDestino_(codigo, true), 0); }
      html += '<p class="sub mt-2 fs-2xs" id="acLocalMsg">📍 Pedindo permissão de localização para o entregador chegar até você…</p>';
    } else if(!jaCompartilhou_(codigo) && navigator.geolocation){
      html += '<div class="mt-2"><p class="sub fs-2xs">Não conseguimos pegar sua localização automaticamente. Libere a localização no navegador e toque abaixo.</p><button type="button" class="ghost" onclick="acCompartilharDestino_(\'' + escH(codigo) + '\')">📍 Compartilhar minha localização</button><p class="sub mt-1 fs-2xs">Opcional. Ajuda o entregador a chegar e permite mostrar a distância aproximada. O restaurante não guarda a localização depois da entrega.</p><div class="msg" id="acLocalMsg"></div></div>';
    } else if(jaCompartilhou_(codigo)){
      html += '<p class="sub mt-2 fs-2xs">✅ Localização compartilhada.</p>';
    }
    box.innerHTML = html;
  };
  window.acCompartilharDestino_ = function(codigo, auto){
    if(!navigator.geolocation){ showMsg('acLocalMsg', 'Seu aparelho não oferece localização.', 'warn'); return; }
    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = Number(pos.coords.latitude), lng = Number(pos.coords.longitude);
      if(!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      let r = null; try{ r = await sbRpcPublico_('api_compartilhar_destino_pedido', { p:{ codigo:codigo, lat:lat, lng:lng } }); }catch(e){ r = null; }
      if(r && r.ok){ marcarCompartilhou_(codigo); delete autoLoc_[codigo]; const b = $('acLocal'); if(b) b.innerHTML = '<p class="sub mt-2 fs-2xs">✅ Localização compartilhada.</p>'; }
      else { autoLoc_[codigo] = 'falhou'; showMsg('acLocalMsg', (r && r.message) || 'Não foi possível enviar agora. O acompanhamento continua normalmente.', 'warn'); }
    }, () => { autoLoc_[codigo] = 'falhou'; if(typeof window.acLocalAtualizar_ === 'function' && window.__acUltimo_ && window.__acUltimo_.codigo === codigo) window.acLocalAtualizar_(codigo, window.__acUltimo_.r); else showMsg('acLocalMsg', 'Não foi possível obter sua localização. O acompanhamento continua normalmente.', 'warn'); }, { enableHighAccuracy:true, timeout:15000, maximumAge:30000 });
  };

  /* ---------- CLIENTE: captura silenciosa ao entrar + envio junto da criação do pedido ---------- */
  let posSilenciosa_ = null;   /* { lat, lng, t } só em memória, nunca vai para o localStorage */
  let capturando_ = false;
  window.cdCapturarLocalSilenciosa_ = function(){
    if(capturando_ || !navigator.geolocation) return;
    capturando_ = true;
    const fim = () => { capturando_ = false; };
    try{
      navigator.geolocation.getCurrentPosition(pos => {
        const lat = Number(pos.coords.latitude), lng = Number(pos.coords.longitude);
        if(Number.isFinite(lat) && Number.isFinite(lng)) posSilenciosa_ = { lat:lat, lng:lng, t:Date.now() };
        fim();
      }, fim, { enableHighAccuracy:true, timeout:15000, maximumAge:60000 });
    }catch(e){ fim(); }
  };
  window.__posCd_ = function(){ return posSilenciosa_ ? { lat:posSilenciosa_.lat, lng:posSilenciosa_.lng } : null; };
  /* Endereço digitado → coordenada (OpenStreetMap). Nunca trava o pedido: sem resposta em 6 s, segue sem. */
  function cdVariantes_(t, cid){
    const out = [], semCid = String(t || '').replace(/\s+/g, ' ').trim(), rua = semCid.split(',')[0].trim();
    const num = (semCid.match(/n[º°o.]*\s*(\d+)/i) || semCid.match(/,\s*(\d+)\b/) || [])[1] || '';
    if(rua && num) out.push(rua + ' ' + num + (cid ? ', ' + cid : ''));
    if(rua) out.push(rua + (cid ? ', ' + cid : ''));
    return out.filter(function(x, i){ return x && out.indexOf(x) === i; });
  }
  async function cdGeocodificar_(rua, numero, cidade){
    const base = String(rua || '').trim(); if(!base) return null;
    const cid = String(cidade || '').trim(), txt = base + (numero ? ', nº ' + numero : '');
    const vars = cdVariantes_(txt, cid);
    for(let i = 0; i < vars.length; i++){
      try{
        const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 6000);
        const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&accept-language=pt-BR&q=' + encodeURIComponent(vars[i]), { signal:ctl.signal, cache:'no-store' });
        clearTimeout(t);
        if(!r.ok) return null;
        const j = await r.json();
        if(j && j[0]){ const lat = Number(j[0].lat), lng = Number(j[0].lon); if(Number.isFinite(lat) && Number.isFinite(lng)) return { lat:lat, lng:lng, exato:i === 0 && !!numero }; }
      }catch(e){ return null; }
      if(i < vars.length - 1) await new Promise(res => setTimeout(res, 1100));
    }
    return null;
  }
  function cdMetros_(a, b){
    const R = 6371000, rad = Math.PI / 180, dLa = (b.lat - a.lat) * rad, dLo = (b.lng - a.lng) * rad;
    const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  /* Guarda a coordenada do destino junto do pedido: GPS do cliente quando bate com o endereço (ou o endereço não foi mexido);
     senão o endereço digitado. Tudo sem travar o pedido; a coordenada some quando o pedido é entregue. */
  window.cdEnviarLocalDoPedido_ = async function(vendaId){
    try{
      if(!vendaId) return;
      const codigo = String(vendaId).slice(-8);
      if(jaCompartilhou_(codigo)) return;
      const rua = (document.getElementById('cdEndereco') || {}).value || '', numero = (document.getElementById('cdNumero') || {}).value || '', cidade = (document.getElementById('cdCidade') || {}).value || '';
      /* se ainda não capturou, tenta uma última vez sem travar nada */
      if(!posSilenciosa_) window.cdCapturarLocalSilenciosa_();
      const gps = posSilenciosa_ ? { lat:posSilenciosa_.lat, lng:posSilenciosa_.lng } : null;
      const mexeu = !!(window.__cdEndAutoTxt_ && rua.trim() !== window.__cdEndAutoTxt_) || !window.__cdEndAutoTxt_;   /* digitou o endereço (não veio da localização) */
      let alvo = null;
      if(gps && !mexeu) alvo = gps;
      else {
        const ad = await cdGeocodificar_(rua, numero, cidade);
        if(gps && (!ad || cdMetros_(gps, ad) <= (ad.exato ? 400 : 1000))) alvo = gps;
        else if(ad) alvo = { lat:ad.lat, lng:ad.lng };
      }
      if(!alvo) return;   /* sem GPS e endereço não localizado: o acompanhamento oferece o botão como antes */
      const r = await sbRpcPublico_('api_compartilhar_destino_pedido', { p:{ codigo:codigo, lat:alvo.lat, lng:alvo.lng } });
      if(r && r.ok) marcarCompartilhou_(codigo);
    }catch(e){ /* nunca atrapalha o pedido */ }
  };

  /* ---------- ganchos (envolvem funções existentes sem trocar o comportamento delas) ---------- */
  function envolver(nome, depois){
    const orig = window[nome]; if(typeof orig !== 'function' || orig.__f5) return;
    const nova = function(){ const r = orig.apply(this, arguments); try{ depois.apply(this, arguments); }catch(e){} return r; };
    nova.__f5 = true; window[nome] = nova;
  }
  envolver('renderEntregas', sincronizar_);
  if(typeof window.sair === 'function' && !window.sair.__f5){
    const so = window.sair;
    window.sair = async function(){ parar_(); fecharMapaEntrega_(); return so.apply(this, arguments); };
    window.sair.__f5 = true;
  }
})();
