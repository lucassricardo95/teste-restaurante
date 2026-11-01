/* ============================================================
   MELHOR ROTA DE ENTREGA
   Quando um entregador sai com 2 ou mais entregas, sugere a ordem que gasta menos tempo
   (saída do restaurante → entregas → volta ao restaurante). Vale para pedidos do sistema,
   do cardápio digital e do iFood. É só uma sugestão: não muda nada nos pedidos.
   O cálculo é feito no aparelho; endereços/coordenadas ficam só em cache neste aparelho.
   ============================================================ */
(function(){
  'use strict';
  const MIN_PARADA = 180;      // segundos gastos em cada entrega (estacionar, entregar, receber)
  const MAX_PARADAS = 8;       // acima disso não testa todas as ordens
  const estado = {};           // chave (ids ordenados) → { fase, msg, res }
  let rodando = false;

  function chaveGrupo_(vs){ return vs.map(v=>v.id).sort().join('|'); }
  function fmtMin_(seg){ const m = Math.max(1, Math.round(seg / 60)); return m >= 60 ? Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min' : m + ' min'; }
  function norm_(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
  function enderecoDe_(v){ return String(v.endereco || '') + (v.complemento ? ', ' + v.complemento : ''); }
  function esperar_(ms){ return new Promise(r=>setTimeout(r, ms)); }
  function lerCache_(k){ try{ return JSON.parse(localStorage.getItem('rotaGeo:' + k) || 'null'); }catch(e){ return null; } }
  function gravarCache_(k, v){ try{ localStorage.setItem('rotaGeo:' + k, JSON.stringify(v)); }catch(e){} }

  /* "Rua X, Bairro, nº 554 — Cidade - SP" → "Rua X 554, Cidade", "Rua X, Cidade", texto original */
  function variantes_(end){
    const t = String(end || '').replace(/\s+/g, ' ').trim(), out = [];
    const cid = (t.match(/[—–]\s*([^—–-]+?)\s*(?:-\s*[A-Z]{2})?\s*$/) || [])[1] || '';
    const semCid = t.replace(/\s*[—–].*$/, '');
    const rua = semCid.split(',')[0].trim();
    const num = (semCid.match(/n[º°o.]*\s*(\d+)/i) || semCid.match(/,\s*(\d+)\b/) || [])[1] || '';
    if(rua && num) out.push(rua + ' ' + num + (cid ? ', ' + cid : ''));
    if(rua) out.push(rua + (cid ? ', ' + cid : ''));
    out.push(t);
    return out.filter(function(x, i){ return x && out.indexOf(x) === i; });
  }

  async function geocodificar_(end, perto){
    const k = norm_(end); if(!k) return null;
    const c = lerCache_(k); if(c && c.lat) return c;
    const vb = perto ? '&viewbox=' + [perto.lng - 0.25, perto.lat + 0.25, perto.lng + 0.25, perto.lat - 0.25].join(',') + '&bounded=1' : '';
    const vars = variantes_(end);
    for(let i = 0; i < vars.length; i++){
      if(i) await esperar_(1100);
      const resp = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&accept-language=pt-BR' + vb + '&q=' + encodeURIComponent(vars[i]), { cache:'no-store' });
      if(!resp.ok) throw new Error('O serviço de mapas não respondeu (' + resp.status + ').');
      const j = await resp.json();
      if(j && j[0]){ const a = { lat:Number(j[0].lat), lng:Number(j[0].lon), rua:(/\d/.test(vars[0]) && i > 0) ? 1 : 0 }; gravarCache_(k, a); await esperar_(1100); return a; }
    }
    await esperar_(1100);
    return null;
  }

  function haversine_(a, b){
    const R = 6371000, rad = Math.PI / 180, dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  /* Matriz de tempos (segundos). Tenta o OSRM (tempo real de carro nas ruas); se falhar, usa linha reta. */
  async function matriz_(pts){
    try{
      const ctl = new AbortController(); const to = setTimeout(()=>ctl.abort(), 12000);
      const url = 'https://router.project-osrm.org/table/v1/driving/' + pts.map(p=>p.lng.toFixed(6) + ',' + p.lat.toFixed(6)).join(';') + '?annotations=duration';
      const resp = await fetch(url, { cache:'no-store', signal:ctl.signal }); clearTimeout(to);
      if(!resp.ok) throw new Error('osrm ' + resp.status);
      const j = await resp.json();
      if(!j || j.code !== 'Ok' || !j.durations) throw new Error('osrm');
      const d = j.durations; let ok = true;
      for(let i = 0; i < pts.length && ok; i++) for(let k = 0; k < pts.length; k++) if(i !== k && (d[i] == null || d[i][k] == null)) { ok = false; break; }
      if(!ok) throw new Error('osrm');
      return { d:d, aprox:false };
    }catch(e){
      const d = pts.map(a=>pts.map(b=>haversine_(a, b) * 1.4 / (25 / 3.6))); // ×1,4 (ruas) a 25 km/h
      return { d:d, aprox:true };
    }
  }

  /* testa todas as ordens (início = 0, paradas = 1..n, volta ao 0) */
  function melhorOrdem_(d, n){
    const idx = []; for(let i = 1; i <= n; i++) idx.push(i);
    let melhor = null, tMelhor = Infinity;
    (function perm(arr, resto){
      if(!resto.length){
        let t = 0, ant = 0;
        for(let i = 0; i < arr.length; i++){ t += d[ant][arr[i]]; ant = arr[i]; }
        t += d[ant][0];
        if(t < tMelhor){ tMelhor = t; melhor = arr.slice(); }
        return;
      }
      for(let i = 0; i < resto.length; i++){
        const r2 = resto.slice(0, i).concat(resto.slice(i + 1));
        perm(arr.concat([resto[i]]), r2);
      }
    })([], idx);
    return { ordem:melhor, total:tMelhor };
  }

  function posicaoAtual_(){
    return new Promise(function(ok, fail){
      if(!navigator.geolocation) return fail(new Error('Este aparelho não informa a localização.'));
      navigator.geolocation.getCurrentPosition(p=>ok({ lat:p.coords.latitude, lng:p.coords.longitude }), e=>fail(new Error('Não consegui pegar sua localização. Permita a localização no celular ou peça ao Admin para definir o local do restaurante (Equipe → Ponto).')), { enableHighAccuracy:true, timeout:12000, maximumAge:60000 });
    });
  }

  async function calcular_(vs, chave){
    if(rodando) return; rodando = true;
    const st = estado[chave] = { fase:'calc', msg:'⏳ Buscando o restaurante e os endereços…' }; desenhar_();
    try{
      const ids = vs.map(v=>v.id);
      const r = await apiCall('rotaEntrega', { ids:ids });
      if(!r || !r.ok) throw new Error((r && r.message) || 'Não consegui buscar os dados da rota agora.');
      let ini = r.restaurante && r.restaurante.lat != null ? { lat:Number(r.restaurante.lat), lng:Number(r.restaurante.lng) } : null, iniTxt = 'restaurante';
      if(!ini){ ini = await posicaoAtual_(); iniTxt = 'sua posição atual (o local do restaurante ainda não foi definido)'; }
      const ifood = {}; (r.ifood || []).forEach(x=>{ ifood[x.id] = { lat:Number(x.lat), lng:Number(x.lng), exato:true }; });
      (r.destinos || []).forEach(x=>{ if(!ifood[x.id]) ifood[x.id] = { lat:Number(x.lat), lng:Number(x.lng), exato:true }; });   // localização guardada no pedido (GPS ou endereço do cliente)
      const paradas = [], sem = []; let ruaInteira = 0;
      for(let i = 0; i < vs.length; i++){
        const v = vs[i]; st.msg = '⏳ Localizando endereços… ' + (i + 1) + ' de ' + vs.length; desenhar_();
        let p = ifood[v.id] || null;
        if(!p){ const g = await geocodificar_(enderecoDe_(v), ini); if(g){ p = { lat:g.lat, lng:g.lng, exato:false, rua:g.rua }; if(g.rua) ruaInteira++; } }
        if(p) paradas.push({ v:v, p:p }); else sem.push(v);
      }
      if(paradas.length < 2){
        st.fase = 'fim'; st.res = { poucas:true, sem:sem }; st.msg = ''; return;
      }
      if(paradas.length > MAX_PARADAS) throw new Error('São entregas demais (' + paradas.length + ') para sugerir uma ordem. O limite é ' + MAX_PARADAS + '.');
      st.msg = '⏳ Calculando o melhor caminho…'; desenhar_();
      const pts = [ini].concat(paradas.map(x=>x.p));
      const m = await matriz_(pts);
      const o = melhorOrdem_(m.d, paradas.length);
      let acum = 0, ant = 0;
      const seq = o.ordem.map(function(i){ acum += m.d[ant][i] + MIN_PARADA; ant = i; return { v:paradas[i - 1].v, p:paradas[i - 1].p, eta:acum }; });
      const volta = acum + m.d[ant][0];
      st.fase = 'fim'; st.msg = '';
      st.res = { seq:seq, total:volta, aprox:m.aprox, ruaInteira:ruaInteira, sem:sem, ini:ini, iniTxt:iniTxt };
    }catch(e){
      st.fase = 'erro'; st.msg = (e && e.name === 'TypeError') ? 'Sem conexão para calcular a rota. Confira a internet e toque em tentar de novo.' : ((e && e.message) || 'Não consegui calcular a rota.');
    } finally { rodando = false; desenhar_(); }
  }

  function linkMapas_(res){
    const o = res.ini.lat.toFixed(6) + ',' + res.ini.lng.toFixed(6);
    const wp = res.seq.map(s=>s.p.exato ? s.p.lat.toFixed(6) + ',' + s.p.lng.toFixed(6) : enderecoDe_(s.v)).map(encodeURIComponent).join('%7C');
    return 'https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=' + o + '&destination=' + o + (wp ? '&waypoints=' + wp : '');
  }

  let ultimo = null; // { grupos:[{nome, vs, chave}] }
  function desenhar_(){
    const box = document.getElementById('rotaEntregasBox'); if(!box) return;
    if(!ultimo || !ultimo.length){ box.innerHTML = ''; return; }
    box.innerHTML = ultimo.map(function(g, gi){
      const st = estado[g.chave];
      let h = '<div class="notif-card" style="border-left:3px solid var(--gold,#d9a21b);"><div><b>🧭 Melhor rota</b>' + (g.nome ? ' — ' + escH(g.nome) : '') + ' <span class="txt-muted fs-xs">(' + g.vs.length + ' entregas)</span></div>';
      if(!st){
        h += '<div class="obs-line">Mostra a ordem de entrega mais rápida, saindo e voltando ao restaurante.</div><button class="small-gold mt-2" type="button" onclick="rotaCalcular_(' + gi + ')">🧭 Ver melhor rota</button>';
      } else if(st.fase === 'calc'){
        h += '<div class="obs-line">' + escH(st.msg) + '</div>';
      } else if(st.fase === 'erro'){
        h += '<div class="msg warn" role="alert" style="display:block;">⚠️ ' + escH(st.msg) + '</div><button class="ghost mt-2" type="button" onclick="rotaCalcular_(' + gi + ')">🔄 Tentar de novo</button>';
      } else if(st.res && st.res.poucas){
        h += '<div class="msg warn" role="alert" style="display:block;">⚠️ Não consegui localizar os endereços no mapa para sugerir a ordem: ' + st.res.sem.map(v=>'#' + escH(rotuloPedido(v))).join(', ') + '.</div><button class="ghost mt-2" type="button" onclick="rotaCalcular_(' + gi + ')">🔄 Tentar de novo</button>';
      } else if(st.res){
        const x = st.res;
        h += '<div class="obs-line">Saindo de: ' + escH(x.iniTxt) + '</div>';
        h += x.seq.map(function(s, i){
          return '<div class="obs-line" style="margin:6px 0;"><b>' + (i + 1) + 'º</b> · #' + escH(rotuloPedido(s.v)) + ' — ' + escH(s.v.clienteNome || 'Sem cadastro') + '<br><span class="txt-muted fs-xs">' + escH(enderecoDe_(s.v)) + '</span><br><span class="fs-xs">chega em ~' + fmtMin_(s.eta) + '</span></div>';
        }).join('');
        h += '<div class="obs-line"><b>🏁 Volta ao restaurante em ~' + fmtMin_(x.total) + '</b></div>';
        if(x.sem.length) h += '<div class="msg warn" role="alert" style="display:block;">⚠️ Fora da sugestão (endereço não encontrado no mapa): ' + x.sem.map(v=>'#' + escH(rotuloPedido(v))).join(', ') + '. Entregue por último ou confira o endereço.</div>';
        if(x.aprox) h += '<div class="msg warn" role="alert" style="display:block;">⚠️ O serviço de rotas não respondeu: tempos <b>aproximados</b> (em linha reta). A ordem pode não ser a melhor.</div>';
        if(x.ruaInteira) h += '<div class="obs-line fs-xs txt-muted">Em ' + x.ruaInteira + ' endereço(s) o mapa achou só a rua, não o número: o tempo é aproximado.</div>';
        h += '<div class="btnrow mt-2"><a class="small-gold" style="text-decoration:none;display:inline-block;padding:8px 14px;border-radius:999px;" href="' + linkMapas_(x) + '" target="_blank" rel="noopener">🗺️ Abrir no Google Maps</a><button class="ghost" type="button" onclick="rotaCalcular_(' + gi + ')">🔄 Recalcular</button></div>';
        h += '<div class="obs-line fs-xs txt-muted mt-1">É só uma sugestão: você decide a ordem.</div>';
      }
      return h + '</div>';
    }).join('');
  }

  window.rotaCalcular_ = function(gi){
    const g = ultimo && ultimo[gi]; if(!g) return;
    if(rodando){ try{ showMsg('mMsg', 'Aguarde: já estou calculando uma rota.', 'warn'); }catch(e){} return; }
    delete estado[g.chave]; calcular_(g.vs, g.chave);
  };

  /* chamado por renderEntregas(): recebe os pedidos "Saiu para entrega" */
  window.rotaRender_ = function(pendentes){
    try{
      const saiu = (pendentes || []).filter(v=>v.statusPedido === 'Saiu para entrega' && v.entregador && !(window.entregaPeloIfood_ && entregaPeloIfood_(v)) && v.endereco);
      const porEnt = {}; saiu.forEach(v=>{ (porEnt[v.entregador] = porEnt[v.entregador] || []).push(v); });
      ultimo = Object.keys(porEnt).filter(n=>porEnt[n].length >= 2).map(n=>({ nome:n, vs:porEnt[n], chave:chaveGrupo_(porEnt[n]) }));
      Object.keys(estado).forEach(k=>{ if(!ultimo.some(g=>g.chave === k) && estado[k].fase !== 'calc') delete estado[k]; });
      desenhar_();
    }catch(e){ if(window.erroTela_) erroTela_(e); }
  };
})();
