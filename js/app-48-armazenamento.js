/* =====================================================================
   v1.15 (P-08) — Tela "📦 Armazenamento" (Administrador → Sistema)
   Mostra, num lugar só: banco do Supabase, Storage (arquivos) e planilhas do Google — quanto está usado,
   quanto cresce por dia e QUANTO TEMPO FALTA para encher. Também: o que já foi arquivado (mês a mês e onde está),
   as últimas execuções do arquivamento (com o espaço realmente liberado), a compactação das 05:30 e o limite do Storage.
   Toda ação que mexe em algo pede a senha (inclusive do Admin). Erro sempre aparece na tela.
   ===================================================================== */
(function(){
  'use strict';
  const fmtMb = mb => mb == null ? '—' : (Number(mb) >= 1024 ? (Number(mb) / 1024).toLocaleString('pt-BR', { maximumFractionDigits:2 }) + ' GB' : Number(mb).toLocaleString('pt-BR', { maximumFractionDigits:1 }) + ' MB');
  const fmtN = n => n == null ? '—' : Number(n).toLocaleString('pt-BR');
  const fmtData = iso => iso ? new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—';
  const mesTxt = ym => { const a = String(ym || '').split('-'); const n = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][Number(a[1]) - 1]; return n ? n + '/' + a[0] : ym; };
  const cor = pct => pct >= 95 ? '#e5534b' : pct >= 85 ? '#f0883e' : pct >= 70 ? '#d9a21b' : '#3fb950';
  const erroBox = t => '<div class="msg warn" role="alert" style="display:block;">⚠️ ' + escH(t) + '</div>';

  // ritmo do dia: cresce / diminui / estável (antes aparecia "Cresce -0,5 MB por dia")
  function ritmo_(cresc){
    if(cresc == null) return '';
    const c = Number(cresc);
    if(Math.abs(c) < 0.05) return 'Estável (quase não muda por dia). ';
    return c > 0 ? 'Cresce ' + fmtMb(c) + ' por dia. ' : 'Está diminuindo ' + fmtMb(-c) + ' por dia (dados antigos saindo). ';
  }
  function previsao_(diasAte95, cresc){
    if(diasAte95 == null){
      if(cresc != null && Number(cresc) < 0.05) return '✅ Sem previsão de encher no ritmo atual.';
      return '⏳ Previsão aparece depois de 5 dias de medição.';
    }
    const d = Number(diasAte95);
    if(d <= 0) return '🔴 Já passou de 95%: a proteção automática está liberando espaço.';
    const quando = new Date(Date.now() + d * 86400000).toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
    const tempo = d >= 730 ? Math.floor(d / 365) + ' anos' : d >= 60 ? Math.round(d / 30) + ' meses' : d + ' dias';
    return (d < 30 ? '🟠' : '🟢') + ' No ritmo atual, chega a 95% em cerca de <b>' + tempo + '</b> (' + escH(quando) + ').';
  }
  function barra_(titulo, usadoTxt, limiteTxt, pct, extra){
    const p = Math.max(0, Math.min(100, Number(pct) || 0));
    return '<div class="arm-bloco" style="margin:6px 0 10px;">'
      + '<div class="d-flex" style="justify-content:space-between;align-items:baseline;gap:8px;"><b style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;">' + titulo + '</b><span class="fs-xs" style="white-space:nowrap;">' + usadoTxt + ' de ' + limiteTxt + ' · <b style="color:' + cor(p) + ';">' + (Number(pct) || 0).toLocaleString('pt-BR') + '%</b></span></div>'
      + '<div style="position:relative;height:9px;background:#3a2c1c;border-radius:5px;overflow:hidden;margin-top:3px;" role="progressbar" aria-valuenow="' + p + '" aria-valuemin="0" aria-valuemax="100">'
      + '<div style="width:' + p + '%;height:100%;background:' + cor(p) + ';"></div>'
      + [70, 85, 95].map(m => '<span style="position:absolute;top:0;bottom:0;left:' + m + '%;width:1px;background:rgba(255,255,255,.35);"></span>').join('')
      + '</div>' + (extra || '') + '</div>';
  }

  window.armBarra_ = barra_;   // as barras dos dois Drives (app-10) usam o mesmo desenho
  let ultimo = null, celulas = null, celulasErro = '', msgHtml = '';   // msgHtml: o resultado da última ação continua na tela depois de atualizar
  window.carregarArmazenamentoArquivo_ = async function(){
    const c = document.getElementById('armArqCorpo'); if(!c) return;
    c.innerHTML = '<div class="obs-line">⏳ Medindo o banco, o Storage e as planilhas…</div>';
    try{
      const r = await apiCall('armazenamentoPainel', {});
      if(!r || !r.ok){ c.innerHTML = erroBox((r && r.message) || 'Não foi possível carregar o armazenamento agora.'); return; }
      ultimo = r; desenhar_();
    }catch(e){ c.innerHTML = erroBox('Sem conexão para medir o armazenamento. Confira a internet e toque em Atualizar.'); return; }
  };

  function desenhar_(){
    const c = document.getElementById('armArqCorpo'), r = ultimo; if(!c || !r) return;
    const b = r.banco || {}, s = r.storage || {}, pl = r.planilha || {}, cfg = r.config || {}, comp = r.compactacao || {};
    let h = '';
    // ---- 1 a 3: banco, Storage e planilha (uma linha cada; os dois Drives vêm logo abaixo, do app-10) ----
    h += barra_('🗄️ Banco do Supabase', fmtMb(b.mb), fmtMb(b.limiteMb), b.pct);
    h += barra_('📦 Storage (arquivos)', fmtMb(s.mb), fmtMb(s.limiteMb), s.pct);
    h += barra_('📗 Planilha principal', (Number(pl.celulas || 0) / 1e6).toLocaleString('pt-BR', { maximumFractionDigits:2 }) + ' mi', '10 mi células', pl.pct);
    // uma linha só, no fim do cartão: ritmo e previsão do banco (+ alerta se algo passou de 85%)
    const alto = [['Banco', b.pct], ['Storage', s.pct], ['Planilha', pl.pct]].filter(x => Number(x[1]) >= 85).map(x => x[0] + ' em ' + Number(x[1]).toLocaleString('pt-BR') + '%');
    const rl = document.getElementById('armResumoLinha');
    if(rl) rl.innerHTML = (alto.length ? '<div class="msg warn" role="alert" style="display:block;margin:0 0 4px;">⚠️ ' + escH(alto.join(' · ')) + ': a proteção automática libera espaço; confira em Avançado.</div>' : '')
      + 'Banco: ' + ritmo_(b.crescimentoMbDia).replace(/^./, c => c.toLowerCase()) + previsao_(b.diasAte95, b.crescimentoMbDia);
    // ---- daqui para baixo: Avançado (recolhido, no fim da tela) ----
    const av = document.getElementById('armArqAvancado');
    if(av){ c.innerHTML = h; h = ''; }
    // ---- 4. Caminho dos dados (explicação curta) ----
    h += '<div class="card-inset fs-xs" style="border:1px solid var(--line,#3a2d1d);border-radius:8px;padding:8px 10px;margin:6px 0 12px;">'
      + '<b>Como funciona</b><br>1) Vendas e caixas fechados com mais de ' + fmtN(cfg.arquivarDias) + ' dias saem do banco e vão para o <b>Storage</b> (comprimidos). Só saem depois de o arquivo ser lido de volta e conferido.'
      + '<br>2) Se o banco chegar a 95%, isso acontece na hora, aos poucos (nunca o pedido de hoje).'
      + '<br>3) Se o <b>Storage</b> chegar a 95%, o arquivo mais antigo vai para a <b>planilha</b> (um por hora) até voltar a 80%. Avisos em 70% e 85%.'
      + '<br>4) Às 05:30 a compactação devolve o espaço ao Supabase; às 06:00 o sistema mede quanto liberou e avisa se não diminuiu.'
      + '<br>Os relatórios de meses antigos juntam tudo sozinhos (banco + Storage + planilha).'
      + (cfg.arquivarAtivo ? '' : '<br><b>⚠️ O arquivamento por idade está em "Só manual"</b> (a proteção dos 95% continua ligada).') + '</div>';

    // ---- 5. Compactação ----
    h += '<h3 style="font-size:16px;margin:8px 0 4px;">🧹 Compactação (libera o espaço de verdade)</h3><div class="fs-sm">'
      + (comp.proxima ? 'Próxima: <b>' + fmtData(comp.proxima) + '</b>. ' : 'Nenhuma compactação marcada (só marca depois de arquivar). ')
      + 'Última feita: ' + fmtData(comp.ultima) + '.</div>'
      + (comp.aviso ? '<div class="msg warn" style="display:block;margin-top:6px;">⚠️ ' + escH(comp.aviso) + (comp.avisoEm ? ' <span class="fs-sm">(' + fmtData(comp.avisoEm) + ')</span>' : '') + '</div>' : '');

    // ---- 6. Arquivado mês a mês ----
    const arq = r.arquivo || [];
    h += '<h3 style="font-size:16px;margin:12px 0 4px;">🗂️ O que já foi arquivado</h3>';
    if(!arq.length) h += '<div class="obs-line">Nada arquivado no Storage ainda. (Pedidos arquivados antes da versão 1.15 continuam nas abas Arquivo_* da planilha.)</div>';
    else h += '<div style="overflow-x:auto;"><table class="tbl fs-xs" style="width:100%;"><thead><tr><th>Mês</th><th>Tipo</th><th>No Storage</th><th>Na planilha</th></tr></thead><tbody>'
      + arq.map(a => '<tr><td>' + escH(mesTxt(a.mes)) + '</td><td>' + (a.tipo === 'caixa' ? 'Caixas' : 'Vendas') + '</td><td>' + (a.storage ? fmtN(a.storage) : '—') + '</td><td>' + (a.planilha ? fmtN(a.planilha) : '—') + '</td></tr>').join('')
      + '</tbody></table></div>';

    // ---- 7. Execuções ----
    const ex = r.execucoes || [];
    const gat = { idade:'Por idade', banco95:'Banco em 95%', storage95:'Storage em 95%', manual:'Manual', autoteste:'Autoteste', resumo:'Resumo mensal' };
    h += '<h3 style="font-size:16px;margin:12px 0 4px;">📜 Últimas execuções</h3>';
    if(!ex.length) h += '<div class="obs-line">Nenhuma execução registrada ainda.</div>';
    else h += '<div style="overflow-x:auto;"><table class="tbl fs-xs" style="width:100%;"><thead><tr><th>Quando</th><th>O quê</th><th>Para</th><th>Registros</th><th>Liberou</th><th>Resultado</th></tr></thead><tbody>'
      + ex.map(e => '<tr><td>' + fmtData(e.em) + '</td><td>' + escH(gat[e.gatilho] || e.gatilho || '') + '</td><td>' + escH(e.destino || '') + '</td><td>' + fmtN(e.qtd) + '</td><td>'
        + (e.medido ? (Number(e.liberadoMb) > 0 ? fmtMb(e.liberadoMb) : '<span style="color:#f0883e;">não diminuiu</span>') : (e.origem === 'banco' && Number(e.qtd) > 0 ? 'mede às 06:00' : '—'))
        + '</td><td>' + (e.erro ? '<span style="color:#e5534b;">⚠️ ' + escH(e.erro) + '</span>' : '✅') + '</td></tr>').join('')
      + '</tbody></table></div>';

    // ---- 8. Ações (pedem senha) ----
    h += '<h3 style="font-size:16px;margin:14px 0 4px;">⚙️ Ações</h3>'
      + '<div class="fs-sm">Limite do Storage do seu plano: <input id="armStLimite" type="number" min="100" step="1" inputmode="numeric" style="width:110px;" value="' + (Number(cfg.storageLimiteMb) || 1024) + '"> MB <span class="obs-line fs-xs">(grátis: 1024 MB = 1 GB; Pro: 102400 MB = 100 GB)</span></div>'
      + '<div class="btnrow mt-2" style="flex-wrap:wrap;">'
      + '<button class="ghost" type="button" onclick="armSalvarLimite_()">💾 Salvar limite</button>'
      + '<button class="ghost" type="button" onclick="armAutoteste_()">🧪 Testar o caminho agora</button>'
      + '<button class="ghost" type="button" onclick="armMoverAgora_()">📤 Mandar o arquivo mais antigo para a planilha</button>'
      + '<button class="ghost" type="button" onclick="carregarArmazenamentoArquivo_()">🔄 Atualizar</button></div>'
      + '<div id="armArqMsg" class="mt-2" role="status" aria-live="polite">' + msgHtml + '</div>';
    if(av) av.innerHTML = h; else c.innerHTML = h;
  }

  const senha_ = () => new Promise(res => abrirModalSenhaAdmin(s => res(s)));
  const msg_ = (t, ok) => { const m = document.getElementById('armArqMsg'); msgHtml = ok === true ? '<div class="msg ok" style="display:block;">✅ ' + t + '</div>' : ok === false ? erroBox(t) : '<div class="obs-line">' + t + '</div>'; if(m) m.innerHTML = msgHtml; };

  window.armSalvarLimite_ = async function(){
    const v = Math.round(Number((document.getElementById('armStLimite') || {}).value));
    if(!(v >= 100)){ msg_('Informe o limite em MB (no mínimo 100).', false); return; }
    const senha = await senha_(); if(!senha) return;
    msg_('⏳ Salvando…');
    try{
      const r = await apiCall('armazenamentoPainel', { storageLimiteMb: v, senha });
      if(!r || !r.ok){ msg_((r && r.message) || 'Não foi possível salvar.', false); return; }
      ultimo = r; desenhar_(); msg_('Limite do Storage salvo: ' + fmtMb(v) + '.', true);
    }catch(e){ msg_('Sem conexão. O limite não foi salvo.', false); }
  };
  window.armAutoteste_ = async function(){
    const senha = await senha_(); if(!senha) return;
    msg_('⏳ Testando com dados de TESTE (nada real é mexido): Storage e planilha, ida e volta…');
    try{
      const j = await sb410Edge_('arquivar-antigos', { autoteste: true, senha }, 200000);
      const passos = (j && j.autoteste && j.autoteste.passos) || [];
      if(j && j.ok) msg_('Caminho funcionando.<br>' + passos.map(escH).join('<br>'), true);
      else msg_(((j && (j.message || (j.autoteste && j.autoteste.erro))) || 'O teste falhou.') + (passos.length ? ' — o que deu certo: ' + passos.join(' · ') : ''), false);
    }catch(e){ msg_('Sem conexão para testar agora.', false); }
    carregarArmazenamentoArquivo_();
  };
  window.armMoverAgora_ = async function(){
    if(!await confirmarTxt_('Mandar agora o arquivo MAIS ANTIGO do Storage para a planilha? Ele só sai do Storage depois de a planilha conferir a contagem. Use quando o Storage estiver ficando cheio.')) return;
    const senha = await senha_(); if(!senha) return;
    msg_('⏳ Enviando para a planilha e conferindo…');
    try{
      const j = await sb410Edge_('arquivar-antigos', { storageAgora: true, senha }, 200000);
      if(j && j.ok) msg_(escH(j.message || 'Feito.'), true); else msg_((j && j.message) || 'Não foi possível mover.', false);
    }catch(e){ msg_('Sem conexão. Nada saiu do Storage sem conferência; confira antes de repetir.', false); }
    carregarArmazenamentoArquivo_();
  };
})();
