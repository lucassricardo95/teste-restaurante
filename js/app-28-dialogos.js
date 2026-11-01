/* ============================================================
   DIALOGOS (Fase 3 da padronização): substitui alert() / confirm() do navegador.
   - confirmar({ titulo, texto, ok, voltar, perigo }) -> Promise<boolean>  (botão com o NOME da ação; vermelho se perigo)
   - confirmarTxt_(texto)  -> igual, deduzindo título/botão pelo texto (usado nas trocas automáticas de confirm())
   - avisar(texto, tipo, ms) -> aviso que some sozinho (tipo: 'ok' | 'erro' | 'aviso' | 'info'; sem tipo, deduz pelo texto).
     Texto muito longo abre uma janela com "Entendi" em vez do aviso.
   Fecha com Esc, toque fora ou Voltar. Não depende de nenhum outro arquivo (só usa escH se existir).
   ============================================================ */
(function(){
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }

  var PERIGOSOS = /^(excluir|apagar|remover|cancelar|recusar|encerrar|restaurar|desligar|descartar|sair|zerar|limpar|desativar|substituir|fechar caixa|devolver)/i;

  /* Deduz o nome do botão a partir do texto: "Excluir esta mesa?" -> "Excluir"; "Tem certeza que quer sair?" -> "Sair" */
  function deduzir_(texto){
    var t = String(texto || '').trim(), prim = t.split(/\n/)[0].trim();
    var ok = 'Confirmar', titulo = 'Confirmar';
    var m = prim.match(/^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:ar|er|ir|or))\b/);
    if(m){
      ok = m[1]; titulo = m[1];
      /* "Excluir esta mesa?" -> "Excluir mesa" (botão com o nome da ação + o que será afetado) */
      var o = prim.match(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+\s+(?:o|a|os|as|um|uma|este|esta|esse|essa|estes|estas)\s+([a-záéíóúâêôãõç]{3,})/);
      if(o && !/^(mesmo|novo|nova)$/.test(o[1])){ ok = m[1] + ' ' + o[1]; titulo = ok; }
    }
    else if(/tem certeza.*\bsair\b/i.test(prim)){ ok = 'Sair'; titulo = 'Sair'; }
    else if(/\bsair\b.*\?$/i.test(prim)){ ok = 'Sair mesmo assim'; titulo = 'Sair'; }
    else if(/\bcontinuar\?$/i.test(prim) || /\bcontinuar\?/i.test(t)){ ok = 'Continuar'; }
    var perigo = PERIGOSOS.test(ok) || /\bsair mesmo assim\b/i.test(t) || /não (será|vai|poderá)|n[aã]o d[aá] para desfazer|para sempre|definitiv/i.test(t) && PERIGOSOS.test(ok);
    return { titulo: titulo, ok: ok, perigo: perigo };
  }

  var _res = null, _ultimoFoco = null;

  function fecharConf_(valor){
    var ov = document.getElementById('dlgConfirmar'); if(ov) ov.classList.remove('open');
    var r = _res; _res = null; if(r) r(!!valor);
    try{ if(_ultimoFoco && _ultimoFoco.focus) _ultimoFoco.focus(); }catch(e){}
    _ultimoFoco = null;
  }

  function montarConf_(){
    var ov = document.getElementById('dlgConfirmar'); if(ov) return ov;
    ov = document.createElement('div'); ov.className = 'modal-overlay dlg-overlay'; ov.id = 'dlgConfirmar';
    ov.innerHTML = '<div class="modal-box dlg-box" role="alertdialog" aria-modal="true" aria-labelledby="dlgTitulo" aria-describedby="dlgTexto">' +
      '<div class="modal-header"><h2 id="dlgTitulo"></h2><button class="close-btn" type="button" aria-label="Fechar" id="dlgX">✕</button></div>' +
      '<div class="dlg-texto" id="dlgTexto"></div>' +
      '<div class="vs-form-botoes dlg-botoes"><button type="button" class="primary" id="dlgOk">Confirmar</button><button type="button" class="ghost" id="dlgVoltar">Voltar</button></div></div>';
    ov.addEventListener('click', function(e){ if(e.target === ov) fecharConf_(false); });
    document.body.appendChild(ov);
    ov.querySelector('#dlgX').addEventListener('click', function(){ fecharConf_(false); });
    ov.querySelector('#dlgVoltar').addEventListener('click', function(){ fecharConf_(false); });
    ov.querySelector('#dlgOk').addEventListener('click', function(){ fecharConf_(true); });
    return ov;
  }

  window.confirmar = function(cfg){
    cfg = (typeof cfg === 'string') ? { texto: cfg } : (cfg || {});
    return new Promise(function(res){
      if(_res){ var ant = _res; _res = null; ant(false); }
      var ov = montarConf_();
      var ded = deduzir_(cfg.texto || cfg.titulo);
      var titulo = cfg.titulo || ded.titulo, okTxt = cfg.ok || ded.ok;
      var perigo = (cfg.perigo !== undefined) ? !!cfg.perigo : ded.perigo;
      _res = res; _ultimoFoco = document.activeElement;
      ov.querySelector('#dlgTitulo').textContent = titulo;
      /* texto em parágrafos (linha em branco separa; linha começando com • vira item) */
      var partes = String(cfg.texto || '').split(/\n{2,}/).map(function(p){
        var linhas = p.split('\n');
        return '<p>' + linhas.map(esc).join('<br>') + '</p>';
      }).join('');
      ov.querySelector('#dlgTexto').innerHTML = partes;
      var bOk = ov.querySelector('#dlgOk'), bV = ov.querySelector('#dlgVoltar');
      bOk.textContent = okTxt; bV.textContent = cfg.voltar || 'Voltar';
      bV.style.display = cfg.somenteOk ? 'none' : '';
      bOk.classList.toggle('vs-perigo', perigo);
      ov.classList.add('open');
      /* em ação destrutiva o foco inicial fica no Voltar (evita Enter sem querer) */
      setTimeout(function(){ try{ ((perigo && !cfg.somenteOk) ? bV : bOk).focus(); }catch(e){} }, 50);
    });
  };
  window.confirmarTxt_ = function(texto, ok, perigo, titulo, voltar){
    var c = { texto: texto };
    if(ok) c.ok = ok; if(perigo !== undefined && perigo !== null) c.perigo = !!perigo; if(titulo) c.titulo = titulo; if(voltar) c.voltar = voltar;
    return window.confirmar(c);
  };

  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && _res){ e.stopPropagation(); fecharConf_(false); }
  }, true);

  /* ---------- Aviso (toast) ---------- */
  function tipoPeloTexto_(t){
    t = String(t || '');
    if(/n[aã]o foi poss[ií]vel|n[aã]o consegu|erro|falh|inv[aá]lid|recus|negad|proibid|incorret|expirad|fora do ar|sem conex/i.test(t)) return 'erro';
    if(/preencha|informe|escolha|selecione|use s[oó]|digite|confira|aten[cç][aã]o|falta|obrigat|precisa|primeiro|antes de|maior que|m[ií]nimo|pelo menos/i.test(t)) return 'aviso';
    if(/salv|cri(ad|ei)|enviad|copiad|pronto|sucesso|atualizad|exclu[ií]d|conclu[ií]d|feito|registrad|obrigad|bem-vind/i.test(t)) return 'ok';
    return 'info';
  }
  var ICONES = { ok:'✓', erro:'!', aviso:'!', info:'i' };

  window.avisar = function(texto, tipo, ms){
    try{
      texto = (texto === undefined || texto === null) ? '' : String(texto);
      if(!texto) return;
      tipo = tipo || tipoPeloTexto_(texto);
      /* mensagem longa: janela com "Entendi" (não some sozinha, dá tempo de ler) */
      if(texto.length > 240 || texto.split('\n').length > 4){
        window.confirmar({ titulo: tipo === 'erro' ? 'Atenção' : 'Aviso', texto: texto, ok: 'Entendi', somenteOk: true, perigo: false });
        return;
      }
      var host = document.getElementById('avisosHost');
      if(!host){
        host = document.createElement('div'); host.id = 'avisosHost'; host.className = 'avisos-host';
        host.setAttribute('role', 'region'); host.setAttribute('aria-label', 'Avisos');
        document.body.appendChild(host);
      }
      var el = document.createElement('div');
      el.className = 'aviso aviso-' + tipo;
      el.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
      el.innerHTML = '<span class="aviso-ic" aria-hidden="true">' + ICONES[tipo] + '</span><span class="aviso-tx">' + esc(texto).replace(/\n/g, '<br>') + '</span>';
      var fechado = false;
      function fechar(){ if(fechado) return; fechado = true; el.classList.add('saindo'); setTimeout(function(){ try{ el.remove(); }catch(e){} }, 220); }
      el.addEventListener('click', fechar);
      host.appendChild(el);
      while(host.children.length > 3) host.removeChild(host.firstChild);
      var dur = ms || Math.min(9000, Math.max(3500, 2500 + texto.length * 45));
      setTimeout(fechar, tipo === 'erro' ? dur + 1500 : dur);
    }catch(e){ try{ console.warn(texto); }catch(_){} }
  };
})();

/* ---------- Fechamento padrão das janelas (as 49 do index.html têm o mesmo cabeçalho com ✕) ----------
   Esc fecha a janela de cima. Toque fora também fecha, MAS só nas janelas sem campos para preencher
   (assim ninguém perde o que digitou por um toque sem querer). Janelas próprias (confirmar, vsForm, vsAcoes) cuidam de si. */
(function(){
  var PROPRIAS = { dlgConfirmar:1, vsFormModal:1, vsAcoesModal:1 };
  function abertas_(){
    return Array.prototype.filter.call(document.querySelectorAll('.modal-overlay.open'), function(o){ return !PROPRIAS[o.id]; });
  }
  function algumaPropriaAberta_(){
    return Object.keys(PROPRIAS).some(function(id){ var o = document.getElementById(id); return o && o.classList.contains('open'); });
  }
  function fecharPeloX_(ov){
    var x = ov && ov.querySelector('.modal-header .close-btn, .close-btn'); if(x){ x.click(); return true; } return false;
  }
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Escape' || algumaPropriaAberta_()) return;
    var ab = abertas_(); if(!ab.length) return;
    fecharPeloX_(ab[ab.length - 1]);
  });
  document.addEventListener('click', function(e){
    var ov = e.target;
    if(!ov || !ov.classList || !ov.classList.contains('modal-overlay') || !ov.classList.contains('open') || PROPRIAS[ov.id]) return;
    if(ov.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select')) return;
    fecharPeloX_(ov);
  });
})();
