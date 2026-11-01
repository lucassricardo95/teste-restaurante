
(function(){
  'use strict';
  const IC = {
    inicio:'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
    caixa:'M4 7h16v12H4zM4 11h16M8 15h3',
    pedidos:'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
    meusganhos:'M12 3v18M16 7h-6a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H8',
    clientes:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    notificacoes:'M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 0 0 4 0',
    administrador:'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    mais:'M5 12h.01M12 12h.01M19 12h.01'
  };
  const svg = k => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (IC[k] || IC.mais) + '"/></svg>';
  const rot = b => (b.dataset.tab === 'administrador') ? 'Admin' : (b.dataset.tab === 'meusganhos') ? 'Ganhos' : String((b.childNodes[0] && b.childNodes[0].textContent) || b.dataset.tab || '').trim();
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let ultima = '';
  function visiveis(){ return Array.prototype.slice.call(document.querySelectorAll('nav.tabs .tab-btn')).filter(b => !b.classList.contains('hidden-tab')); }
  function ligado(){
    const w = document.getElementById('mainWrap');
    return !!(w && w.classList.contains('unlocked')) && window.innerWidth < 900 && !((typeof currentUser!=='undefined' && currentUser && currentUser.emergencia));
  }
  window.navInfFechar_ = function(){ const m = document.getElementById('navInfMais'); if(m) m.classList.remove('on'); };
  window.navInfIr_ = function(tab){ navInfFechar_(); const b = document.querySelector('nav.tabs .tab-btn[data-tab="' + tab + '"]'); if(b) b.click(); setTimeout(()=>window.scrollTo(0,0), 30); };
  window.navInfMais_ = function(){
    const lista = visiveis(), cab = lista.slice(0,4).map(b=>b.dataset.tab), resto = lista.filter(b => cab.indexOf(b.dataset.tab) === -1);
    document.getElementById('navInfMaisBox').innerHTML = resto.map(b => '<button type="button" onclick="navInfIr_(\'' + b.dataset.tab + '\')">' + svg(b.dataset.tab) + esc(rot(b)) + (b.classList.contains('has-alert') ? '<span class="pt"></span>' : '') + '</button>').join('');
    document.getElementById('navInfMais').classList.add('on');
  };
  function montar(){
    const nav = document.getElementById('navInf'); if(!nav) return;
    const on = ligado();
    document.body.classList.toggle('nav-inf', on);
    if(!on){ ultima = ''; return; }
    const lista = visiveis();
    const ativa = (document.querySelector('nav.tabs .tab-btn.active') || {dataset:{}}).dataset.tab || '';
    const usaMais = lista.length > 5;
    const slots = usaMais ? lista.slice(0,4) : lista;
    const resto = usaMais ? lista.slice(4) : [];
    const sig = slots.map(b => b.dataset.tab + (b.classList.contains('has-alert') ? '!' : '')).join(',') + '|' + ativa + '|' + resto.map(b => b.dataset.tab + (b.classList.contains('has-alert') ? '!' : '')).join(',');
    if(sig === ultima) return; ultima = sig;
    let h = slots.map(b => '<button type="button" class="' + (b.dataset.tab === ativa ? 'ativo' : '') + '" onclick="navInfIr_(\'' + b.dataset.tab + '\')" aria-label="' + esc(rot(b)) + '">' + svg(b.dataset.tab) + '<span class="t">' + esc(rot(b)) + '</span>' + (b.classList.contains('has-alert') ? '<span class="pt"></span>' : '') + '</button>').join('');
    if(usaMais){
      const maisAtivo = resto.some(b => b.dataset.tab === ativa), maisAlerta = resto.some(b => b.classList.contains('has-alert'));
      h += '<button type="button" class="' + (maisAtivo ? 'ativo' : '') + '" onclick="navInfMais_()" aria-label="Mais">' + svg('mais') + '<span class="t">Mais</span>' + (maisAlerta ? '<span class="pt"></span>' : '') + '</button>';
    }
    nav.innerHTML = h;
  }
  /* BATERIA: redesenha só quando algo muda (aba ativa, bolinha de alerta, perfil, login), em vez de checar a cada 0,7 s */
  try{
    const obs = new MutationObserver(()=>{ clearTimeout(obs._t); obs._t = setTimeout(montar, 50); });
    const ligar = ()=>{ const t = document.querySelector('nav.tabs'), w = document.getElementById('mainWrap');
      if(t) obs.observe(t, { attributes:true, attributeFilter:['class'], subtree:true, childList:true });
      if(w) obs.observe(w, { attributes:true, attributeFilter:['class'] }); };
    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>{ ligar(); montar(); }); else { ligar(); montar(); }
  }catch(e){ setInterval(montar, 2000); }
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden){ ultima = ''; montar(); } });
  window.addEventListener('resize', ()=>{ ultima = ''; montar(); });
  document.addEventListener('click', ()=>setTimeout(montar, 60), true);
})();
