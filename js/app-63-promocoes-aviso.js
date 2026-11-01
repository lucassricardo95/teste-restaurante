/* =====================================================================
   PROMOÇÕES POR AVISO NO CELULAR (v1.25)
   Os clientes aceitaram receber "avisos dos pedidos". Promoção é outra coisa: só vai para quem aceitar À PARTE.
   CARDÁPIO
   • Aparelho com os avisos ligados vê UMA vez uma faixa: "🎁 Quer receber as promoções de (nome do restaurante) por aqui?" (Quero / Agora não).
   • Toque num aviso de promoção abre ./?promo=1: faixa "Você recebe as promoções neste aparelho · Não quero mais".
   • Liga/desliga no banco: api_push_cliente_promo (pelo endereço da inscrição do navegador; sem nome nem telefone).
   ADMIN (Vendas e cardápio → Promoções e cupons)
   • Cartão "📣 Promoção por aviso no celular": quantos aceitaram, título + texto, prévia e "Enviar".
   • api_push_promo_enviar (só Admin, uma a cada 6 horas) → função push-enviar { promo:true }; o resultado aparece na lista.
   ===================================================================== */
(function(){
  'use strict';
  const K_PERG = 'txPromoPerguntado', K_ON = 'txPromoLigado';
  const $ = id => document.getElementById(id);
  const ler = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const gravar = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
  const e_ = s => (typeof escH === 'function' ? escH(s) : String(s == null ? '' : s));

  /* ---------------- CARDÁPIO ---------------- */
  function equipe_(){ try{ return (typeof currentUser !== 'undefined' && currentUser) || !!localStorage.getItem(typeof SESSAO_KEY !== 'undefined' ? SESSAO_KEY : '__x'); }catch(e){ return false; } }
  function podeAqui_(){
    try{
      if((typeof mesaQr !== 'undefined' && mesaQr) || equipe_()) return false;
      if(!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') return false;
      return Notification.permission === 'granted';
    }catch(e){ return false; }
  }
  async function endpoint_(){
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((_, rej) => setTimeout(() => rej(new Error('sw')), 6000))]);
    const sub = await reg.pushManager.getSubscription();
    return sub ? sub.endpoint : '';
  }
  function faixa_(html, id){
    const cd = $('cardapioPublico'); if(!cd) return null;
    let d = $(id || 'cdPromoFaixa');
    if(!d){ d = document.createElement('div'); d.id = id || 'cdPromoFaixa'; d.setAttribute('role', 'region'); d.setAttribute('aria-label', 'Promoções');
      d.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 12px;padding:10px 12px;border-radius:12px;background:#2b1d0e;border:1px solid var(--gold,#d9a21b);color:var(--cream,#fff);font-size:13px;line-height:1.35;';
      cd.insertBefore(d, cd.firstChild); }
    d.innerHTML = html; return d;
  }
  function fechar_(){ const d = $('cdPromoFaixa'); if(d) d.remove(); }
  async function mudar_(ligar){
    const d = $('cdPromoFaixa'); d && d.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try{
      const ep = await endpoint_();
      if(!ep) throw new Error('sem inscrição');
      const r = await sbRpcPublico_('api_push_cliente_promo', { p:{ endpoint: ep, promo: !!ligar } });
      if(!r || r.ok !== true){
        faixa_('<span style="flex:1 1 200px;color:#ffb4ab;">⚠️ ' + e_((r && r.message) || 'Não consegui salvar agora. Tente de novo.') + '</span><button type="button" class="ghost" style="margin:0;padding:4px 10px;" onclick="cdPromoFechar_()">Fechar</button>');
        return;
      }
      gravar(K_PERG, '1'); gravar(K_ON, ligar ? '1' : '0');
      faixa_('<span style="flex:1 1 200px;">' + (ligar ? '<b>✅ Pronto!</b> Você vai receber as promoções de ' + NOME_H_() + ' por aqui. Para parar, toque num aviso de promoção e escolha "Não quero mais".' : '<b>Tudo bem.</b> Você não vai mais receber promoções. Os avisos dos seus pedidos continuam normalmente.') + '</span>');
      setTimeout(fechar_, 6000);
    }catch(err){
      faixa_('<span style="flex:1 1 200px;color:#ffb4ab;">⚠️ Os avisos deste aparelho não estão ligados ou a internet caiu. Nada foi mudado.</span><button type="button" class="ghost" style="margin:0;padding:4px 10px;" onclick="cdPromoFechar_()">Fechar</button>');
    }
  }
  window.cdPromoSim_ = () => mudar_(true);
  window.cdPromoSair_ = () => mudar_(false);
  window.cdPromoNao_ = () => { gravar(K_PERG, '1'); fechar_(); };
  window.cdPromoFechar_ = fechar_;

  function perguntar_(){
    if(!podeAqui_() || ler(K_PERG) || $('cdPromoFaixa')) return;
    faixa_('<span style="flex:1 1 200px;"><b>🎁 Quer receber as promoções de ' + NOME_H_() + ' por aqui?</b> No máximo algumas por semana. Dá para parar quando quiser.</span>'
      + '<button type="button" class="small-gold" style="margin:0;" onclick="cdPromoSim_()">Quero receber</button>'
      + '<button type="button" class="ghost" style="margin:0;padding:4px 10px;" onclick="cdPromoNao_()">Agora não</button>');
  }
  window.cdPromoPerguntar_ = perguntar_;
  function veioDePromo_(){
    if(equipe_()) return;
    faixa_('<span style="flex:1 1 200px;">🎁 Você recebe as promoções de ' + NOME_H_() + ' neste aparelho.</span>'
      + '<button type="button" class="ghost" style="margin:0;padding:4px 10px;" onclick="cdPromoSair_()">Não quero mais</button>'
      + '<button type="button" class="ghost" style="margin:0;padding:4px 8px;" aria-label="Fechar" onclick="cdPromoFechar_()">✕</button>');
  }

  /* depois que o cliente liga os avisos (topo do cardápio ou no "Pedido enviado"), pergunta das promoções em seguida */
  function envolver_(nome, atraso){
    const f = window[nome]; if(typeof f !== 'function' || f.__promo) return false;
    const n = async function(){ const r = await f.apply(this, arguments); setTimeout(perguntar_, atraso); return r; };
    n.__promo = true; window[nome] = n; return true;
  }
  function iniciar_(){
    try{
      if(/[?&]promo=1\b/.test(location.search)){
        try{ history.replaceState(null, '', location.pathname + location.hash); }catch(e){}
        setTimeout(veioDePromo_, 700);
      } else setTimeout(perguntar_, 3000);
      envolver_('cdAvisosAceitar_', 4500);
      envolver_('cdAvisosPosPedido_', 9000);
      if('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', ev => { if(ev.data && ev.data.tipo === 'abrir-url' && /promo=1/.test(String(ev.data.url || ''))) veioDePromo_(); });
    }catch(e){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar_); else iniciar_();

  /* ---------------- ADMIN ---------------- */
  function barra_(rot, n, tot){
    const pct = tot > 0 ? Math.round(n / tot * 100) : 0;
    return '<div class="rx-barra"><div class="rx-barra-t"><span>' + rot + '</span><b>' + n + ' de ' + tot + ' <span class="txt-muted" style="font-weight:400;">· ' + pct + '%</span></b></div><div class="rx-trilho"><div style="width:' + pct + '%;"></div></div></div>';
  }
  function quando_(s){ try{ return new Date(s).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }); }catch(e){ return ''; } }
  window.promoAvisoContar_ = function(){
    const t = $('paTitulo'), x = $('paTexto'), pv = $('paPrevia');
    const ct = $('paTituloN'), cx = $('paTextoN');
    if(ct && t) ct.textContent = t.value.length + '/60'; if(cx && x) cx.textContent = x.value.length + '/140';
    if(pv) pv.innerHTML = '<div class="pa-not"><div class="pa-not-ic">🍔</div><div><b>' + e_((t && t.value.trim()) || 'Título da promoção') + '</b><div>' + e_((x && x.value.trim()) || 'Texto que aparece no celular do cliente.') + '</div></div></div>';
  };
  window.carregarPromoAviso_ = async function(){
    const c = $('paCorpo'); if(!c) return;
    c.innerHTML = '<div class="obs-line">⏳ Carregando…</div>';
    let r;
    try{ r = await sbRpc_('api_push_promo_resumo', { p:{} }); }
    catch(e){ c.innerHTML = '<div class="msg warn" role="alert" style="display:block;">📡 Sem conexão para carregar as promoções por aviso. Confira a internet e abra a tela de novo.</div>'; return; }
    if(!r || r.ok !== true){ c.innerHTML = '<div class="msg warn" role="alert" style="display:block;">⚠️ ' + e_((r && r.message) || 'Não foi possível carregar.') + '</div>'; return; }
    const camp = r.campanhas || [];
    c.innerHTML = barra_('Aparelhos que aceitaram promoções', Number(r.promo) || 0, Number(r.aparelhos) || 0)
      + '<p class="sub fs-xs" style="margin:2px 0 10px;">Dos aparelhos com os avisos dos pedidos ligados, só recebem promoção os que tocaram em "Quero receber" no cardápio. O número cresce sozinho conforme os clientes entram.</p>'
      + '<label for="paTitulo">Título <small class="txt-muted" id="paTituloN">0/60</small></label><input type="text" id="paTitulo" maxlength="60" placeholder="Ex.: Terça do X Bacon" oninput="promoAvisoContar_()">'
      + '<label for="paTexto">Texto <small class="txt-muted" id="paTextoN">0/140</small></label><textarea id="paTexto" rows="3" maxlength="140" placeholder="Ex.: Hoje o X Bacon sai por R$ 24,90 no cardápio. Só até 23h!" oninput="promoAvisoContar_()"></textarea>'
      + '<div class="sub fs-xs" style="margin:6px 0 2px;">Como aparece no celular:</div><div id="paPrevia"></div>'
      + '<div class="msg" id="paMsg"></div>'
      + '<button type="button" class="primary" id="paEnviar" onclick="enviarPromoAviso_()"' + (Number(r.promo) ? '' : ' disabled') + '>📣 Enviar promoção</button>'
      + (Number(r.promo) ? '' : '<p class="sub fs-xs" style="margin:4px 0 0;">O botão libera quando o primeiro cliente aceitar receber promoções.</p>')
      + '<div class="sub" style="margin:14px 0 4px;"><b>Últimas enviadas</b></div>'
      + (camp.length ? camp.map(x => '<div class="rx-linha"><div><b>' + e_(x.titulo) + '</b><small>' + e_(x.texto) + '</small><small>' + quando_(x.em) + (x.por ? ' · ' + e_(x.por) : '') + '</small></div><div class="rx-dir" style="text-align:right;">'
          + (x.concluida ? '<b>' + (x.enviados || 0) + ' de ' + x.alvo + '</b><small>entregues' + (x.removidos ? ' · ' + x.removidos + ' desligaram' : '') + (x.falhas ? ' · ' + x.falhas + ' falha(s)' : '') + '</small>' : '<small>⏳ enviando para ' + x.alvo + '…</small>') + '</div></div>').join('')
        : '<div class="obs-line">Nenhuma promoção enviada ainda.</div>');
    window.promoAvisoContar_();
  };
  window.enviarPromoAviso_ = async function(){
    const t = ($('paTitulo').value || '').trim(), x = ($('paTexto').value || '').trim();
    if(t.length < 3) return showMsg('paMsg', 'Escreva um título (pelo menos 3 letras).', 'warn');
    if(x.length < 3) return showMsg('paMsg', 'Escreva o texto da promoção.', 'warn');
    const ok = typeof vsForm === 'function' ? await vsForm({ titulo:'Enviar promoção?', texto:'"' + t + '" vai para o celular de todos que aceitaram receber promoções. Depois de enviar não dá para desfazer, e a próxima só pode sair daqui a 6 horas.', ok:'Enviar agora', campos:[] }) : confirm('Enviar a promoção agora?');
    if(!ok) return;
    const bt = $('paEnviar'); if(bt) bt.disabled = true;
    try{
      const r = await sbRpc_('api_push_promo_enviar', { p:{ titulo: t, texto: x } });
      if(!r || r.ok !== true){ showMsg('paMsg', (r && r.message) || 'Não foi possível enviar. Nada foi enviado.', 'warn'); if(bt) bt.disabled = false; return; }
      await window.carregarPromoAviso_();
      showMsg('paMsg', '✅ ' + r.message, 'ok');
      setTimeout(() => { if($('paCorpo')) window.carregarPromoAviso_(); }, 8000);
    }catch(e){ showMsg('paMsg', '📡 Sem conexão. A promoção não foi enviada; tente de novo.', 'warn'); if(bt) bt.disabled = false; }
  };
})();
