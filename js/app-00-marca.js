/* =====================================================================
   MARCA DO RESTAURANTE — nome, cores, logos e ícone do app, vindos de config-restaurante.js
   e, depois, da tela Administrador → Sistema → Aparência (guardada neste aparelho para abrir já com a marca certa).
   Carregado ANTES de tudo, para a página nunca "piscar" com outra cor.
   ===================================================================== */
(function(){
  'use strict';
  const R = window.RESTAURANTE = window.RESTAURANTE || {};
  const BASE = { slogan:'', assistente:'Assistente', tema:'classico', cores:{ destaque:'#d9a21b', botao:'#8c1c13', fundo:'#14100c' }, logos:{ cardapio:'img/logo.png', impressao:'', icone:'img/icon-512.png' } };
  const CHAVE_CACHE = 'marcaRestaurante_v1';
  const HEX = /^#[0-9a-fA-F]{6}$/;

  function lerCache(){ try{ const j = JSON.parse(localStorage.getItem(CHAVE_CACHE) || 'null'); return j && typeof j === 'object' ? j : null; }catch(e){ return null; } }
  function mesclar(){
    const c = lerCache() || {}, a = R.marca || {};
    const cores = Object.assign({}, BASE.cores, a.cores || {}, c.cores || {});
    ['destaque','botao','fundo'].forEach(k => { if(!HEX.test(cores[k])) cores[k] = BASE.cores[k]; });
    return { nome: c.nome || R.nome || 'Meu Restaurante', slogan: c.slogan != null ? c.slogan : (a.slogan || ''), assistente: c.assistente || a.assistente || BASE.assistente,
      tema: c.tema || a.tema || BASE.tema, cores, logos: Object.assign({}, BASE.logos, a.logos || {}, c.logos || {}) };
  }
  /* ---------- cores ---------- */
  const h2r = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const r2h = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const x = h2r(a), y = h2r(b); return r2h(x.map((v, i) => v + (y[i] - v) * t)); };
  const lum = h => { const [r, g, b] = h2r(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
  const tinta = h => (lum(h) > .35 ? '#1a1410' : '#ffffff');
  function paleta(c){
    const d = c.destaque, b = c.botao, f = c.fundo, claro = '#ffffff', escuro = '#000000';
    const cream = mix(claro, d, .10), eqB = mix(f, escuro, .12);
    return {
      '--bg': f, '--panel': mix(f, claro, .05), '--panel-2': mix(f, claro, .09), '--line': mix(f, d, .22), '--line-forte': mix(f, d, .38),
      '--gold': d, '--gold-rgb': h2r(d).join(','), '--gold-hi': mix(d, claro, .22), '--gold-lo': mix(d, escuro, .28), '--gold-dim': mix(d, escuro, .22),
      '--red': b, '--red-rgb': h2r(b).join(','), '--red-hi': mix(b, claro, .18), '--red-dim': mix(b, escuro, .32),
      '--on-gold': tinta(d), '--cream': cream, '--muted': mix(cream, f, .40),
      '--eq-bg': eqB, '--eq-panel': mix(eqB, claro, .06), '--eq-panel-2': mix(eqB, claro, .10), '--eq-panel-3': mix(eqB, claro, .14),
      '--eq-cream': mix(claro, d, .05), '--eq-muted': mix(mix(claro, d, .05), eqB, .42)
    };
  }
  function pintar(m){
    let st = document.getElementById('marcaCss');
    if(!st){ st = document.createElement('style'); st.id = 'marcaCss'; (document.head || document.documentElement).appendChild(st); }
    const p = paleta(m.cores);
    st.textContent = 'html:root{' + Object.keys(p).map(k => k + ':' + p[k] + ';').join('') + '}';
  }
  /* ---------- manifesto do app (nome, cor e ícone do restaurante) ---------- */
  function absoluta(u){ try{ return new URL(u, location.href).href; }catch(e){ return u; } }
  function manifesto(m){
    try{
      const ic = absoluta(m.logos.icone || BASE.logos.icone), base = location.href.split('?')[0].replace(/[^/]*$/, '');
      const j = { id:base, name:m.nome, short_name:m.nome.length > 14 ? m.nome.slice(0, 14) : m.nome, description:'Cardápio digital e pedidos de ' + m.nome, lang:'pt-BR', start_url:base, scope:base, display:'standalone', orientation:'any',
        background_color:m.cores.fundo, theme_color:m.cores.fundo, icons:[{ src:ic, sizes:'512x512', type:'image/png', purpose:'any' }, { src:ic, sizes:'512x512', type:'image/png', purpose:'maskable' }] };
      const url = URL.createObjectURL(new Blob([JSON.stringify(j)], { type:'application/manifest+json' }));
      let l = document.querySelector('link[rel="manifest"]'); if(!l){ l = document.createElement('link'); l.rel = 'manifest'; document.head.appendChild(l); }
      l.href = url;
    }catch(e){}
  }
  function textos(m){
    document.title = m.nome;
    const t = document.querySelector('meta[name="theme-color"]'); if(t) t.content = m.cores.fundo;
    const a = document.querySelector('meta[name="apple-mobile-web-app-title"]'); if(a) a.content = m.nome;
    const ic = document.querySelector('link[rel="icon"]'); if(ic && m.logos.icone) ic.href = m.logos.icone;
    const ap = document.querySelector('link[rel="apple-touch-icon"]'); if(ap && m.logos.icone) ap.href = m.logos.icone;
    document.querySelectorAll('[data-marca-logo]').forEach(i => { const u = m.logos[i.getAttribute('data-marca-logo')] || m.logos.cardapio; if(u && i.getAttribute('src') !== u) i.setAttribute('src', u); i.setAttribute('alt', m.nome); });
    document.querySelectorAll('[data-marca-nome]').forEach(e => { e.textContent = m.nome; });
    document.querySelectorAll('[data-marca-icone]').forEach(i => { if(m.logos.icone) i.setAttribute('src', m.logos.icone); });
    const sp = document.getElementById('txbSplashCss'); if(sp) sp.textContent = 'html.txb-equipe::before{content:"";position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483000;background:' + m.cores.fundo + ' url(' + (m.logos.cardapio || '') + ') center center/min(52vw,210px) auto no-repeat;}';
  }
  function aplicar(){ const m = window.MARCA = mesclar(); window.NOME_RESTAURANTE_ = m.nome; window.ASSISTENTE_ = m.assistente || 'Assistente'; pintar(m); textos(m); manifesto(m); return m; }
  window.marcaAplicar_ = aplicar;
  /* Guarda a marca vinda do banco (Aparência) e aplica na hora */
  window.marcaGuardar_ = function(parcial){ try{ const c = Object.assign(lerCache() || {}, parcial || {}); localStorage.setItem(CHAVE_CACHE, JSON.stringify(c)); }catch(e){} return aplicar(); };
  const escH_ = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  window.ASSISTENTE_H_ = () => escH_(window.ASSISTENTE_);
  window.NOME_UP_ = () => String(window.NOME_RESTAURANTE_ || '').toUpperCase();
  window.NOME_H_ = () => escH_(window.NOME_RESTAURANTE_);
  window.NOME_UP_H_ = () => escH_(window.NOME_UP_());
  window.marcaLimpar_ = function(){ try{ localStorage.removeItem(CHAVE_CACHE); }catch(e){} return aplicar(); };
  window.marcaPaleta_ = paleta;
  window.kickerPadrao_ = function(){ const m = window.MARCA || {}; return m.slogan ? 'DELIVERY · ' + String(m.slogan).toUpperCase() : 'DELIVERY'; };
  aplicar();
  document.addEventListener('DOMContentLoaded', function(){ textos(window.MARCA);
    if(!R.supabaseUrl){
      const d = document.createElement('div');
      d.style.cssText = 'position:fixed;inset:0;z-index:2147483001;background:#14100c;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:sans-serif';
      d.innerHTML = '<div style="max-width:420px"><h2 style="margin:0 0 10px">Sistema ainda não configurado</h2><p style="line-height:1.5;opacity:.85">Este restaurante ainda não recebeu as ligações com o banco de dados. Peça a quem implantou o sistema para gerar o arquivo <b>config-restaurante.js</b> no Painel de Revenda.</p></div>';
      document.body.appendChild(d);
    } });
})();
