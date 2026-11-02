/* =====================================================================
   RESTAURANTE — API DE CONTINGÊNCIA (fila + espelho de leitura)
   =====================================================================
   Roda em uma CONTA GOOGLE DIFERENTE da planilha principal. É propositalmente
   "burra": guarda pedidos numa fila e uma cópia do cardápio. Nenhuma regra
   de negócio fica aqui — a principal valida tudo de novo ao reconciliar.

   TRÊS CHAVES (guardadas em Propriedades do script, NUNCA no código):
     CHAVE_SERVIDOR : só a planilha principal. Lê a fila, marca sincronizado, atualiza o espelho.
     CHAVE_INTERNA  : quem fez login (Admin/Operador). Enfileira venda e lê o espelho interno.
     CHAVE_PUBLICA  : vai no HTML (é pública por natureza). Só enfileira pedido do cardápio e
                      lê o espelho público (sem custos, taxas ou clientes).

   COMO IMPLANTAR / TROCAR AS CHAVES
   1. Cole este arquivo no projeto Apps Script da contingência (substitui o anterior).
   2. Rode `setup` (cria abas Fila e Espelho; não apaga se já existirem).
   3. Rode `gerarChaves` uma vez. Ele cria as 3 chaves novas e mostra no log de execução.
   4. Chave SERVIDOR e INTERNA -> na planilha principal: Configurações do projeto -> Propriedades do
      script -> adicionar CONTINGENCIA_CHAVE_SERVIDOR e CONTINGENCIA_CHAVE_INTERNA.
      Chave PÚBLICA -> constante CONTINGENCIA_CHAVE_PUBLICA no início do script do HTML.
   5. Implante como App da Web (Executar como "Eu", acesso "Qualquer pessoa") e, se a URL mudar,
      troque CONTINGENCIA_API_URL no HTML e na planilha principal.
   Rode `gerarChaves` de novo quando quiser trocar todas (as antigas param de valer na hora).

   ATUALIZAR (11/10/2026, versão enxuta): cole por cima, salve e publique em Implantar > Gerenciar implantações >
   lápis > "Nova versão" (o endereço continua o mesmo). Saíram a cópia SB_ das tabelas do Supabase (não chegava mais aqui)
   e as ações que ninguém chamava (getEspelho, guardarBackup, syncLote). As abas SB_ antigas se apagam sozinhas.
   ===================================================================== */

const FILA_MAX_PENDENTES = 300, FILA_MAX_CHARS = 30000;
/* SEGURANÇA (Módulo 3): a chave PÚBLICA fica no HTML, então qualquer um pode usá-la. Por isso ela tem cota própria: no máximo
   FILA_MAX_PUBLICA pedidos pendentes e FILA_MAX_PUBLICA_10MIN envios a cada 10 minutos — assim spam não enche a fila e não trava a venda interna. */
const FILA_MAX_PUBLICA = 100, FILA_MAX_PUBLICA_10MIN = 30;
const PERMISSOES = {
  servidor: ['status', 'listarPendentes', 'marcarSincronizado', 'atualizarEspelho', 'getEspelhoPublico', 'getEspelhoInterno',
             'getArmazenamento', 'listarFotos', 'guardarFoto', 'removerFotosOrfas', 'analisarFotosSemUso', 'limparFotosSemUso', 'restaurarFotos', 'gerarChaveLeitura', 'guardarNota', 'lerNota', 'excluirNota', 'guardarPonto', 'lerPonto', 'excluirPonto'],
  interna:  ['status', 'enfileirar', 'getEspelhoPublico', 'getEspelhoInterno', 'getEspelhoReserva', 'listarFilaInterna'],
  publica:  ['enfileirar', 'getEspelhoPublico'],
  leitura:  ['status', 'getEspelhoReserva', 'listarFilaInterna']   // RESERVA DE LEITURA: só consulta (Cozinha/Garçom/Entregador também usam); sem dados de contato nem de pagamento
};

let _ssMemo_ = null; // abre a planilha UMA vez por execução
function ss_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SPREADSHEET_ID');
  if (!id) {
    const ativa = SpreadsheetApp.getActiveSpreadsheet();
    if (!ativa) throw new Error('Não foi possível identificar a planilha. Abra o editor do Apps Script pela própria planilha e rode setup() uma vez.');
    id = ativa.getId();
    props.setProperty('SPREADSHEET_ID', id);
  }
  if (!_ssMemo_) _ssMemo_ = SpreadsheetApp.openById(id);
  return _ssMemo_;
}

function setup() {
  const ss = ss_();
  let sh = ss.getSheetByName('Fila');
  if (!sh) {
    sh = ss.insertSheet('Fila');
    sh.getRange(1, 1, 1, 7).setValues([['id', 'tipo', 'dadosJson', 'recebidoEm', 'status', 'sincronizadoEm', 'origemChave']]);
    sh.setFrozenRows(1);
  }
  let esp = ss.getSheetByName('Espelho');
  if (!esp) {
    esp = ss.insertSheet('Espelho');
    esp.getRange(1, 1, 1, 3).setValues([['chave', 'dadosJson', 'atualizadoEm']]);
    esp.setFrozenRows(1);
  }
  abaFotos_();
  return 'Abas prontas. Agora rode gerarChaves() se ainda não configurou as chaves.';
}

function gerarChaves() {
  const nova = prefixo => prefixo + '-' + Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  const c = { CHAVE_SERVIDOR: nova('txbsrv'), CHAVE_INTERNA: nova('txbint'), CHAVE_PUBLICA: nova('txbpub') };
  PropertiesService.getScriptProperties().setProperties(c);
  Logger.log('CONTINGENCIA_CHAVE_SERVIDOR = ' + c.CHAVE_SERVIDOR);
  Logger.log('CONTINGENCIA_CHAVE_INTERNA  = ' + c.CHAVE_INTERNA);
  Logger.log('CONTINGENCIA_CHAVE_PUBLICA  = ' + c.CHAVE_PUBLICA + '   (esta vai no HTML)');
  return 'Chaves geradas. Copie do log de execução.';
}

/* Troca SÓ as chaves de servidor e interna (as que não ficam no HTML) e MANTÉM a pública — assim o index.html não precisa mudar.
   Use quando uma dessas chaves tiver sido exposta. Depois de rodar:
   1) copie as duas chaves novas do Registro de execução;
   2) no projeto da PLANILHA: Configurações do projeto -> Propriedades do script -> edite CONTINGENCIA_CHAVE_SERVIDOR e
      CONTINGENCIA_CHAVE_INTERNA com os valores novos (sem colocar chave no código);
   3) no projeto da planilha rode conferirChavesContingencia() e veja os três testes OK;
   4) peça para os funcionários logados clicarem em Sair e entrarem de novo (a chave interna é buscada no login).
   Faça com a fila vazia: antes de rodar, confira que não há vendas pendentes na contingência. */
function rotacionarChavesSensiveis() {
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('CHAVE_PUBLICA')) return 'Nada feito: não há chave pública cadastrada. Rode gerarChaves() primeiro.';
  const pendentes = readFilaPendente().length;
  if (pendentes > 0) return 'Nada feito: há ' + pendentes + ' venda(s) pendente(s) na contingência. Sincronize/reconcilie antes de trocar as chaves.';
  const nova = prefixo => prefixo + '-' + Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  const c = { CHAVE_SERVIDOR: nova('txbsrv'), CHAVE_INTERNA: nova('txbint') };
  p.setProperties(c);
  Logger.log('CONTINGENCIA_CHAVE_SERVIDOR = ' + c.CHAVE_SERVIDOR);
  Logger.log('CONTINGENCIA_CHAVE_INTERNA  = ' + c.CHAVE_INTERNA);
  Logger.log('CHAVE_PUBLICA mantida (o index.html não muda).');
  return 'Chaves de servidor e interna trocadas. Copie do Registro de execução e siga os passos do comentário da função.';
}

function perfilDaChave_(chave) {
  if (!chave || typeof chave !== 'string') return '';
  const p = PropertiesService.getScriptProperties().getProperties();   // OTIMIZAÇÃO: uma leitura das propriedades em vez de quatro (cada chamada ao serviço custa)
  if (chaveIgual_(chave, p.CHAVE_SERVIDOR)) return 'servidor';
  if (chaveIgual_(chave, p.CHAVE_INTERNA)) return 'interna';
  if (chaveIgual_(chave, p.CHAVE_PUBLICA)) return 'publica';
  if (chaveIgual_(chave, p.CHAVE_LEITURA)) return 'leitura';
  return '';
}

/* Comparação sem atalho: percorre sempre todos os caracteres (não revela, pelo tempo de resposta, quantos acertou). */
function chaveIgual_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  let d = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* Health check (abrir a URL /exec no navegador). Só números — nada de dados de pedido. */
function doGet(e) {
  try {
    /* Público de propósito (teste de "está no ar"): não mostra contagens. Os detalhes saem pela ação 'status', que exige chave. */
    return responder({ ok: true, servico: 'Restaurante - Contingência' });
  } catch (err) {
    return responder({ ok: false, message: 'Erro: ' + err.message });
  }
}

/* Rede de segurança: qualquer erro, mesmo fora do bloco principal, volta como JSON com a causa (antes, voltava uma página HTML do Google). */
function doPost(e) {
  try { return doPost_(e); }
  catch (err) { return responder({ ok: false, message: 'Erro fatal: ' + String(err && err.message || err).slice(0, 300) + ' | ' + String(err && err.stack || '').split('\n').slice(0, 3).join(' / ').slice(0, 300) }); }
}
function doPost_(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return responder({ ok: false, message: 'Requisição inválida.' }); }
  const perfil = perfilDaChave_(body && body.chave);
  if (!perfil) return responder({ ok: false, message: 'Chave inválida.' });
  if (PERMISSOES[perfil].indexOf(body.action) === -1) return responder({ ok: false, message: 'Esta chave não tem permissão para esta ação.' });

  /* OTIMIZAÇÃO: ações só de leitura NÃO esperam a trava. Antes, o cardápio público e a Cozinha ficavam na fila atrás de uma gravação. */
  const SEM_TRAVA = ['status', 'listarPendentes', 'getEspelhoPublico', 'getEspelhoInterno', 'getEspelhoReserva', 'listarFilaInterna', 'listarFotos', 'getArmazenamento', 'lerNota', 'lerPonto', 'analisarFotosSemUso'];
  const lock = LockService.getScriptLock();
  const usaTrava = SEM_TRAVA.indexOf(body.action) === -1;
  if (usaTrava) { try { lock.waitLock(20000); } catch (err) { return responder({ ok: false, ocupado: true, message: 'Contingência ocupada, tente de novo.' }); } }
  try {
    let r;
    switch (body.action) {
      case 'enfileirar': r = enfileirar(body.id, body.tipo, body.dados, perfil); break;
      case 'status': r = { ok: true, pendentes: contarPendentes_(), espelhoAtualizadoEm: espelhoAtualizadoEm_() }; break;
      case 'listarPendentes': r = { ok: true, pendentes: readFilaPendente() }; break;
      case 'marcarSincronizado': r = marcarSincronizado(body.id); break;
      case 'atualizarEspelho': r = atualizarEspelho(body.dados); if (r && r.ok) { try { apagarAbasSbUmaVez_(); } catch (eSb) {} } break;
      case 'getEspelhoPublico': { const esp = lerEspelho_(['publico']); r = { ok: true, espelho: Object.assign({}, esp.publico || {}, { _atualizadoEm: esp._atualizadoEm }) }; break; }
      case 'getEspelhoInterno': { const esp = lerEspelho_(['publico', 'interno']); r = { ok: true, espelho: Object.assign({}, esp.publico || {}, esp.interno || {}, { _atualizadoEm: esp._atualizadoEm }) }; break; }
      case 'getArmazenamento': r = getArmazenamentoCont_(); break;
      case 'listarFotos': r = listarFotos_(); break;
      case 'guardarFoto': r = guardarFoto(body.idOrigem, body.base64); break;
      case 'guardarNota': r = guardarNota(body.nome, body.base64); break;
      case 'lerNota': r = lerNota(body.id); break;
      case 'excluirNota': r = excluirNota(body.ids); break;
      case 'guardarPonto': r = guardarPonto(body.nome, body.base64); break;
      case 'lerPonto': r = lerPonto(body.id); break;
      case 'excluirPonto': r = excluirPonto(body.ids); break;
      case 'removerFotosOrfas': r = removerFotosOrfas(body.ids); break;
      case 'analisarFotosSemUso': r = analisarFotosSemUso(body.emUsoOrigem, body.emUsoReserva); break;
      case 'limparFotosSemUso': r = limparFotosSemUso(body.ids, body.emUsoOrigem, body.emUsoReserva); break;
      case 'restaurarFotos': r = restaurarFotos(body.ids); break;
      case 'gerarChaveLeitura': r = gerarChaveLeitura_(); break;
      case 'listarFilaInterna': r = { ok: true, fila: filaInternaResumo_() }; break;
      case 'getEspelhoReserva': { const esp = lerEspelho_(['reserva']); r = { ok: true, reserva: esp.reserva || null, atualizadoEm: esp._atualizadoEm }; break; }
      default: r = { ok: false, message: 'Ação desconhecida.' };
    }
    return responder(r);
  } catch (err) {
    return responder({ ok: false, message: 'Erro: ' + err.message });
  } finally {
    if (usaTrava) { try { lock.releaseLock(); } catch (eL) {} }
  }
}

/* Texto vindo de fora nunca entra com HTML ou fórmula. */
function limpar_(v, prof) {
  if (prof > 6) return null;
  if (typeof v === 'string') {
    let s = v.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/[<>`]/g, '').replace(/"/g, '\u201D').replace(/'/g, '\u2019').trim().slice(0, 300);
    return /^[=+\-@]/.test(s) ? "'" + s : s;
  }
  if (Array.isArray(v)) return v.slice(0, 80).map(x => limpar_(x, prof + 1));
  if (v && typeof v === 'object') { const o = {}; Object.keys(v).slice(0, 60).forEach(k => { o[String(k).slice(0, 60)] = limpar_(v[k], prof + 1); }); return o; }
  return (typeof v === 'number' || typeof v === 'boolean') ? v : null;
}

/* Guarda o item bruto na fila. Mesmo id = não duplica. */
function enfileirar(id, tipo, dados, perfil) {
  if (perfil === 'publica') {
    const cache = CacheService.getScriptCache();
    const usados = Number(cache.get('enf_publica')) || 0;
    if (usados >= FILA_MAX_PUBLICA_10MIN) return { ok: false, message: 'Muitos pedidos em sequência. Ligue para o restaurante.' };
    cache.put('enf_publica', String(usados + 1), 600);
  }
  if (!id || typeof id !== 'string' || id.length > 80 || !/^[A-Za-z0-9_\-]+$/.test(id)) return { ok: false, message: 'Id inválido.' };
  if ((tipo || 'venda') !== 'venda') return { ok: false, message: 'Tipo não aceito.' };
  if (!dados || typeof dados !== 'object' || !Array.isArray(dados.itens) || !dados.itens.length || dados.itens.length > 60) return { ok: false, message: 'Pedido sem itens válidos.' };
  /* BLOCO 1.1: "hora original da venda" só vale se vier de aparelho logado (nunca da chave pública) e for um instante recente e coerente. */
  if (dados.timestampOriginal !== undefined) {
    const tsO = Number(dados.timestampOriginal), agoraMs = Date.now();
    if (perfil === 'publica' || !Number.isFinite(tsO) || tsO > agoraMs + 60000 || tsO < agoraMs - 24 * 3600000) delete dados.timestampOriginal;
    else dados.timestampOriginal = Math.floor(tsO);
  }
  const json = JSON.stringify(limpar_(dados, 0));
  if (json.length > FILA_MAX_CHARS) return { ok: false, message: 'Pedido grande demais.' };
  const sh = ss_().getSheetByName('Fila');
  const last = sh.getLastRow();
  if (last >= 2) {
    /* OTIMIZAÇÃO: lê só as colunas id, status e origem (a coluna C guarda o pedido inteiro, até 30 mil caracteres por linha). */
    const n = last - 1;
    const ids = sh.getRange(2, 1, n, 1).getValues(), sts = sh.getRange(2, 5, n, 1).getValues(), ori = sh.getRange(2, 7, n, 1).getValues();
    let pend = 0, pendPub = 0;
    for (let i = 0; i < n; i++) {
      if (ids[i][0] === id) return { ok: true, message: 'Já estava na fila (não duplicado).', duplicado: true };
      if (ids[i][0] && sts[i][0] === 'Pendente') { pend++; if (ori[i][0] === 'publica') pendPub++; }
    }
    if (pend >= FILA_MAX_PENDENTES) return { ok: false, message: 'Fila cheia. Ligue para o restaurante.' };
    if (perfil === 'publica' && pendPub >= FILA_MAX_PUBLICA) return { ok: false, message: 'Fila de pedidos online cheia. Ligue para o restaurante.' };
  }
  sh.appendRow([id, 'venda', json, new Date(), 'Pendente', '', perfil || '']);
  return { ok: true, message: 'Guardado na fila de contingência.' };
}

function contarPendentes_() {
  const sh = ss_().getSheetByName('Fila');
  const last = sh.getLastRow();
  if (last < 2) return 0;
  return sh.getRange(2, 5, last - 1, 1).getValues().filter(r => r[0] === 'Pendente').length;
}
function readFilaPendente() {
  /* OTIMIZAÇÃO: descobre pela coluna de status onde estão os pendentes e lê o pedido (coluna C) só dessa faixa. */
  const sh = ss_().getSheetByName('Fila');
  const last = sh.getLastRow();
  if (last < 2) return [];
  const sts = sh.getRange(2, 5, last - 1, 1).getValues();
  let primeira = -1;
  for (let i = 0; i < sts.length; i++) if (sts[i][0] === 'Pendente') { primeira = i; break; }
  if (primeira < 0) return [];
  const ini = primeira + 2;
  return sh.getRange(ini, 1, last - ini + 1, 6).getValues()
    .filter(r => r[0] && r[4] === 'Pendente')
    .map(r => { let d = {}, corrompido = false; try { d = JSON.parse(r[2] || '{}'); } catch (e) { corrompido = true; } return { id: r[0], tipo: r[1], dados: d, corrompido: corrompido, recebidoEm: r[3] }; });
}

/* Depois de reaplicar na principal, marca como sincronizado (não reaplica). */
function marcarSincronizado(id) {
  const sh = ss_().getSheetByName('Fila');
  const last = sh.getLastRow();
  if (last < 2) return { ok: false, message: 'Id não encontrado na fila.' };
  const ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) {
      sh.getRange(i + 2, 5, 1, 2).setValues([['Sincronizado', new Date()]]);
      return { ok: true };
    }
  }
  return { ok: false, message: 'Id não encontrado na fila.' };
}

/* Espelho: uma linha por chave ('publico', 'interno'). Leitura e escrita em bloco.
   Uma célula da planilha aceita no máximo 50.000 caracteres. Falha de 18/10/2026: o espelho cresceu além do limite e a gravação quebrava.
   Agora o valor NUNCA depende de uma célula só: se o JSON passa de 45.000 caracteres ele é comprimido ("gz:" + base64) e, se ainda for maior,
   dividido em pedaços de 45.000 que ficam na coluna B e nas colunas E, F, G... da MESMA linha (até 40 pedaços, cerca de 1,8 milhão de caracteres
   comprimidos, vários milhões de caracteres de dados). A leitura junta os pedaços e reconhece o formato antigo (uma célula só).
   Perto do limite (24 de 40 pedaços) a resposta traz "aviso" e a falha de verdade tem mensagem clara; nada é cortado em silêncio. */
const ESP_CELULA_MAX_ = 45000, ESP_PEDACOS_MAX_ = 40, ESP_PEDACOS_AVISO_ = 24;
function espEmpacotar_(json) {
  if (json.length <= ESP_CELULA_MAX_) return [json];
  const gz = 'gz:' + Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(json, 'application/json', 'esp.json')).getBytes());
  const partes = [];
  for (let k = 0; k < gz.length; k += ESP_CELULA_MAX_) partes.push(gz.slice(k, k + ESP_CELULA_MAX_));
  if (partes.length > ESP_PEDACOS_MAX_) throw new Error('O espelho de uma tabela ficou grande demais (' + gz.length + ' caracteres comprimidos, ' + partes.length + ' pedaços; o máximo é ' + ESP_PEDACOS_MAX_ + '). Reduza os dados espelhados.');
  return partes;
}
function espDesempacotar_(partes) {
  let v = (Array.isArray(partes) ? partes : [partes]).map(function (p) { return String(p == null ? '' : p); }).join('');
  if (v.indexOf('gz:') === 0) return Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(v.slice(3)), 'application/x-gzip', 'esp.gz')).getDataAsString();
  return v;
}
const ESP_COLS_ = 4 + ESP_PEDACOS_MAX_ - 1;   // A chave, B pedaço 1, C data, D hash, E.. demais pedaços
function espGarantirColunas_(sh) { const m = sh.getMaxColumns(); if (m < ESP_COLS_) sh.insertColumnsAfter(m, ESP_COLS_ - m); }   // a aba antiga só tinha 4 colunas
function espLinha_(chave, partes, agora, h) {
  const l = [chave, partes[0], agora, h];
  for (let k = 1; k < ESP_PEDACOS_MAX_; k++) l.push(partes[k] || '');
  return l;
}
function atualizarEspelho(dados) {
  if (!dados || typeof dados !== 'object') return { ok: false, message: 'Sem dados pra espelhar.' };
  const sh = ss_().getSheetByName('Espelho');
  espGarantirColunas_(sh);
  const last = sh.getLastRow();
  const existentes = {}, hashes = {};
  if (last >= 2) sh.getRange(2, 1, last - 1, 4).getValues().forEach((r, i) => { existentes[r[0]] = i + 2; hashes[r[0]] = String(r[3] || ''); });
  const agora = new Date();
  const chaves = Object.keys(dados);
  let gravadas = 0, iguais = 0, maiorPartes = 1; const erros = [];
  chaves.forEach(chave => {
    try {
      const json = JSON.stringify(dados[chave]);
      const h = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, json).map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
      if (existentes[chave] && hashes[chave] === h) { iguais++; return; }   // conteúdo idêntico ao que já está aí: não regrava (coluna D guarda o hash)
      const partes = espEmpacotar_(json);
      maiorPartes = Math.max(maiorPartes, partes.length);
      const linha = espLinha_(chave, partes, agora, h);
      if (existentes[chave]) sh.getRange(existentes[chave], 1, 1, ESP_COLS_).setValues([linha]);   // regrava a linha inteira: pedaços antigos que sobravam ficam vazios
      else sh.appendRow(linha);
      gravadas++;
    } catch (e) { erros.push(chave + ': ' + String(e && e.message || e).slice(0, 200)); }   // uma tabela com problema não impede as outras
  });
  if (gravadas) limparCacheEspelho_();
  const r = { ok: erros.length === 0, message: 'Espelho atualizado (' + gravadas + ' de ' + chaves.length + ' tabelas gravadas' + (iguais ? ', ' + iguais + ' já estavam iguais' : '') + ').', atualizadoEm: agora, maiorPartes: maiorPartes };
  if (erros.length) r.message = 'Espelho com falha: ' + erros.join(' | ');
  if (maiorPartes >= ESP_PEDACOS_AVISO_) r.aviso = 'O espelho está usando ' + maiorPartes + ' de ' + ESP_PEDACOS_MAX_ + ' pedaços. Perto do limite: reduza os dados espelhados antes que pare.';
  return r;
}

function espelhoAtualizadoEm_() {
  const sh = ss_().getSheetByName('Espelho');
  const last = sh.getLastRow();
  if (last < 2) return null;
  let m = null;
  sh.getRange(2, 3, last - 1, 1).getValues().forEach(r => { if (r[0] && (!m || new Date(r[0]) > m)) m = new Date(r[0]); });
  return m;
}
/* OTIMIZAÇÃO: "chaves" limita o que é lido e convertido (o cardápio público não precisa baixar a lista de clientes).
   Cache: o resultado é COMPRIMIDO (gzip) e guardado por 5 min. Antes só era guardado se tivesse menos de 90 mil caracteres (um cardápio
   grande nunca entrava) e por 60 s. A chave leva uma "versão" (ESP_VER) que atualizarEspelho() troca a cada gravação: o cache antigo
   deixa de valer na hora, sem precisar listar chaves para apagar. */
const ESP_CACHE_SEG = 300;
function espCachePut_(cache, ck, texto) {
  const b64 = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(texto, 'application/json', 'esp.json')).getBytes());
  const T = 90000, n = Math.ceil(b64.length / T);
  if (n < 1 || n > 40) return false;
  const obj = {}; obj[ck + '|n'] = String(n);
  for (let i = 0; i < n; i++) obj[ck + '|' + i] = b64.slice(i * T, (i + 1) * T);
  cache.putAll(obj, ESP_CACHE_SEG);
  return true;
}
function espCacheGet_(cache, ck) {
  const n = Number(cache.get(ck + '|n') || 0);
  if (!(n > 0)) return null;
  const chaves = []; for (let i = 0; i < n; i++) chaves.push(ck + '|' + i);
  const got = cache.getAll(chaves), partes = [];
  for (let i = 0; i < n; i++) { if (got[chaves[i]] == null) return null; partes.push(got[chaves[i]]); }
  return Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(partes.join('')), 'application/x-gzip', 'esp.gz')).getDataAsString();
}
function lerEspelho_(chaves) {
  const cache = CacheService.getScriptCache();
  const ver = PropertiesService.getScriptProperties().getProperty('ESP_VER') || '0';
  const ck = 'esp2:' + ver + ':' + (chaves ? chaves.slice().sort().join(',') : '*');
  try { const c = espCacheGet_(cache, ck); if (c != null) { const o = JSON.parse(c); if (o._atualizadoEm) o._atualizadoEm = new Date(o._atualizadoEm); return o; } } catch (e) {}
  const sh = ss_().getSheetByName('Espelho');
  espGarantirColunas_(sh);
  const last = sh.getLastRow();
  const resultado = {};
  let maisRecente = null;
  if (last >= 2) {
    // OTIMIZAÇÃO: lê só chave e data de todas as linhas; o JSON (coluna B, pode ter dezenas de milhares de caracteres) só das linhas pedidas
    const chavesCol = sh.getRange(2, 1, last - 1, 1).getValues(), datasCol = sh.getRange(2, 3, last - 1, 1).getValues();
    chavesCol.forEach((l, i) => {
      const chave = l[0]; if (!chave) return;
      const d = datasCol[i][0];
      if (d && (!maisRecente || new Date(d) > maisRecente)) maisRecente = new Date(d);
      if (chaves && chaves.indexOf(chave) === -1) return;
      try { const lin = sh.getRange(i + 2, 1, 1, ESP_COLS_).getValues()[0]; resultado[chave] = JSON.parse(espDesempacotar_([lin[1]].concat(lin.slice(4)))); } catch (e) { resultado[chave] = null; }
    });
  }
  resultado._atualizadoEm = maisRecente;
  try { espCachePut_(cache, ck, JSON.stringify(resultado)); } catch (e) {}
  return resultado;
}
function limparCacheEspelho_() {
  try { PropertiesService.getScriptProperties().setProperty('ESP_VER', String(Date.now())); } catch (e) {}   // troca a versão: todo cache anterior deixa de valer
}

/* =====================================================================
   DRIVE DA CONTINGÊNCIA: cópia das fotos e leitura do espaço usado
   (as cópias de backup antigas que estiverem na pasta continuam contando no espaço)
   ===================================================================== */
const CONT_FOTO_MAX_BYTES = 5 * 1024 * 1024;
const CONT_ARMAZ_ATENCAO_PCT = 70, CONT_ARMAZ_CRITICO_PCT = 90, CONT_ARMAZ_BLOQUEIO_PCT = 97;

/* Rode UMA vez no editor (menu de funções -> autorizarDrive -> Executar) e aceite as permissões de Drive. */
function autorizarDrive() {
  DriveApp.getRootFolder();
  pastaBackups_(); pastaFotos_(); pastaNotas_(); pastaPonto_(); abaFotos_();
  return 'Drive autorizado. Pastas e aba Fotos prontas.';
}

function pastaDrive_(propChave, nome) {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty(propChave);
  if (id) { try { const p = DriveApp.getFolderById(id); if (!p.isTrashed()) return p; } catch (e) { /* pasta apagada, recria abaixo */ } }
  const raiz = DriveApp.getRootFolder();
  const existentes = raiz.getFoldersByName(nome);
  const pasta = existentes.hasNext() ? existentes.next() : raiz.createFolder(nome);
  props.setProperty(propChave, pasta.getId());
  return pasta;
}
function pastaBackups_() { return pastaDrive_('PASTA_BACKUPS_ID', 'Restaurante - Backups (cópia)'); }
function pastaFotos_() { return pastaDrive_('PASTA_FOTOS_ID', 'Restaurante - Fotos (cópia)'); }

function armazenamento_() {
  const usado = DriveApp.getStorageUsed(), limite = DriveApp.getStorageLimit();
  const pct = limite > 0 ? Math.round(usado / limite * 1000) / 10 : null;
  const nivel = pct === null ? 'Indisponível' : pct > CONT_ARMAZ_CRITICO_PCT ? 'Crítico' : pct >= CONT_ARMAZ_ATENCAO_PCT ? 'Atenção' : 'Normal';
  return { usado: usado, limite: limite, livre: limite > 0 ? Math.max(0, limite - usado) : null, percentual: pct, nivel: nivel };
}
function semEspaco_() { const a = armazenamento_(); return (a.percentual !== null && a.percentual >= CONT_ARMAZ_BLOQUEIO_PCT) ? a : null; }

/* ---------- ITEM 17: cópia das fotos ---------- */
function abaFotos_() {
  const ss = ss_();
  let sh = ss.getSheetByName('Fotos');
  if (!sh) {
    sh = ss.insertSheet('Fotos');
    sh.getRange(1, 1, 1, 5).setValues([['fotoIdOrigem', 'fotoIdReserva', 'nome', 'tamanho', 'atualizadoEm']]);
    sh.setFrozenRows(1);
  }
  return sh;
}
function listarFotos_() {
  const sh = abaFotos_(); const last = sh.getLastRow(); const mapa = {};
  if (last >= 2) sh.getRange(2, 1, last - 1, 2).getValues().forEach(r => { if (r[0] && r[1]) mapa[r[0]] = r[1]; });
  return { ok: true, fotos: mapa };
}
function tipoImagem_(b) {
  const u8 = k => (b[k] + 256) % 256;
  if (u8(0) === 0xFF && u8(1) === 0xD8 && u8(2) === 0xFF) return { tipo: 'image/jpeg', ext: '.jpg' };
  if (u8(0) === 0x89 && u8(1) === 0x50 && u8(2) === 0x4E && u8(3) === 0x47) return { tipo: 'image/png', ext: '.png' };
  if (u8(0) === 0x52 && u8(1) === 0x49 && u8(2) === 0x46 && u8(3) === 0x46 && u8(8) === 0x57 && u8(9) === 0x45 && u8(10) === 0x42 && u8(11) === 0x50) return { tipo: 'image/webp', ext: '.webp' };
  return null;
}
function guardarFoto(idOrigem, base64) {
  if (typeof idOrigem !== 'string' || !/^[\w-]{10,80}$/.test(idOrigem)) return { ok: false, message: 'Id de foto inválido.' };
  if (typeof base64 !== 'string' || !base64) return { ok: false, message: 'Nenhuma imagem recebida.' };
  const sh = abaFotos_(); const last = sh.getLastRow();
  if (last >= 2) { const lin = sh.getRange(2, 1, last - 1, 2).getValues(); for (let i = 0; i < lin.length; i++) if (lin[i][0] === idOrigem) return { ok: true, duplicado: true, fotoIdReserva: lin[i][1] }; }
  const cheio = semEspaco_();
  if (cheio) return { ok: false, message: 'Drive da contingência quase cheio (' + cheio.percentual + '%).' };
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > CONT_FOTO_MAX_BYTES) return { ok: false, message: 'Imagem maior que 5 MB.' };
  const t = tipoImagem_(bytes);
  if (!t) return { ok: false, message: 'Arquivo não é uma imagem válida (JPG, PNG ou WEBP).' };
  const arq = pastaFotos_().createFile(Utilities.newBlob(bytes, t.tipo, idOrigem + t.ext));
  arq.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); // foto de cardápio é pública, como na conta principal
  sh.appendRow([idOrigem, arq.getId(), arq.getName(), bytes.length, new Date()]);
  return { ok: true, fotoIdReserva: arq.getId() };
}
/* ---------- Comprovantes das notas de compra (18/10/2026): PRIVADOS, sem link público ---------- */
function pastaNotas_() { return pastaDrive_('PASTA_NOTAS_ID', 'Restaurante - Notas de compra (cópia)'); }
function tipoNotaCont_(b) {
  const u8 = k => (b[k] + 256) % 256;
  if (u8(0) === 0x25 && u8(1) === 0x50 && u8(2) === 0x44 && u8(3) === 0x46) return { tipo: 'application/pdf', ext: '.pdf' };
  return tipoImagem_(b);
}
function notaNaPastaCont_(arq) { const pid = pastaNotas_().getId(), it = arq.getParents(); while (it.hasNext()) if (it.next().getId() === pid) return true; return false; }
function guardarNota(nome, base64) {
  if (typeof nome !== 'string' || !/^[\w.-]{3,120}$/.test(nome)) return { ok: false, message: 'Nome inválido.' };
  if (typeof base64 !== 'string' || !base64) return { ok: false, message: 'Nenhum arquivo recebido.' };
  const cheio = semEspaco_();
  if (cheio) return { ok: false, message: 'Drive da contingência quase cheio (' + cheio.percentual + '%).' };
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > 3 * 1024 * 1024) return { ok: false, message: 'Arquivo maior que 3 MB.' };
  const t = tipoNotaCont_(bytes);
  if (!t) return { ok: false, message: 'Use foto (JPG, PNG, WEBP) ou PDF.' };
  const arq = pastaNotas_().createFile(Utilities.newBlob(bytes, t.tipo, nome)); // sem setSharing: fica privado
  return { ok: true, id: arq.getId() };
}
function lerNota(id) {
  if (typeof id !== 'string' || !/^[\w-]{10,80}$/.test(id)) return { ok: false, message: 'Arquivo inválido.' };
  let arq; try { arq = DriveApp.getFileById(id); } catch (e) { return { ok: false, message: 'O comprovante não foi encontrado no Drive da contingência.' }; }
  if (arq.isTrashed() || !notaNaPastaCont_(arq)) return { ok: false, message: 'O comprovante não foi encontrado no Drive da contingência.' };
  const blob = arq.getBlob();
  return { ok: true, tipo: blob.getContentType(), nome: arq.getName(), base64: Utilities.base64Encode(blob.getBytes()) };
}
function excluirNota(ids) {
  (Array.isArray(ids) ? ids : []).forEach(id => { try { const a = DriveApp.getFileById(String(id)); if (notaNaPastaCont_(a)) a.setTrashed(true); } catch (e) {} });
  return { ok: true };
}
/* ---------- Fotos da batida do ponto (18/10/2026): PRIVADAS, só JPEG, apagadas após 45 dias pela limpeza diária ---------- */
function pastaPonto_() { return pastaDrive_('PASTA_PONTO_ID', 'Restaurante - Fotos do ponto (cópia)'); }
function pontoNaPastaCont_(arq) { const pid = pastaPonto_().getId(), it = arq.getParents(); while (it.hasNext()) if (it.next().getId() === pid) return true; return false; }
function guardarPonto(nome, base64) {
  if (typeof nome !== 'string' || !/^[\w.-]{3,120}$/.test(nome)) return { ok: false, message: 'Nome inválido.' };
  if (typeof base64 !== 'string' || !base64) return { ok: false, message: 'Nenhuma foto recebida.' };
  const cheio = semEspaco_();
  if (cheio) return { ok: false, message: 'Drive da contingência quase cheio (' + cheio.percentual + '%).' };
  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > 1536 * 1024) return { ok: false, message: 'Foto maior que 1,5 MB.' };
  const u8 = k => (bytes[k] + 256) % 256;
  if (!(u8(0) === 0xFF && u8(1) === 0xD8 && u8(2) === 0xFF)) return { ok: false, message: 'A foto precisa ser JPEG.' };
  const arq = pastaPonto_().createFile(Utilities.newBlob(bytes, 'image/jpeg', nome)); // sem setSharing: fica privado
  return { ok: true, id: arq.getId() };
}
function lerPonto(id) {
  if (typeof id !== 'string' || !/^[\w-]{10,80}$/.test(id)) return { ok: false, message: 'Arquivo inválido.' };
  let arq; try { arq = DriveApp.getFileById(id); } catch (e) { return { ok: false, message: 'A foto não foi encontrada no Drive da contingência.' }; }
  if (arq.isTrashed() || !pontoNaPastaCont_(arq)) return { ok: false, message: 'A foto não foi encontrada no Drive da contingência.' };
  const blob = arq.getBlob();
  return { ok: true, tipo: blob.getContentType(), nome: arq.getName(), base64: Utilities.base64Encode(blob.getBytes()) };
}
function excluirPonto(ids) {
  (Array.isArray(ids) ? ids : []).forEach(id => { try { const a = DriveApp.getFileById(String(id)); if (pontoNaPastaCont_(a)) a.setTrashed(true); } catch (e) {} });
  return { ok: true };
}
/* Apaga a cópia de fotos que não existem mais na principal. Trava de segurança: lista vazia ou "mais da metade órfã" não apaga nada. */
function removerFotosOrfas(idsAtuais) {
  if (!Array.isArray(idsAtuais) || !idsAtuais.length) return { ok: false, message: 'Lista vazia: nada removido (proteção).' };
  const set = {}; idsAtuais.forEach(i => { set[String(i)] = true; });
  const sh = abaFotos_(); const last = sh.getLastRow();
  if (last < 2) return { ok: true, removidas: 0 };
  const linhas = sh.getRange(2, 1, last - 1, 2).getValues();
  const orfas = linhas.map((r, i) => ({ id: r[0], reserva: r[1], lin: i + 2 })).filter(x => x.id && !set[x.id]);
  if (linhas.length > 10 && orfas.length > linhas.length / 2) return { ok: false, message: 'Proteção: mais da metade das fotos ficaria órfã (' + orfas.length + ' de ' + linhas.length + '). Nada removido.' };
  orfas.sort((a, b) => b.lin - a.lin).forEach(x => { try { DriveApp.getFileById(x.reserva).setTrashed(true); } catch (e) {} sh.deleteRow(x.lin); });
  return { ok: true, removidas: orfas.length };
}

/* ---------- P-12 (v1.15): fotos SEM USO na pasta de fotos da contingência ----------
   "Em uso" = cópia de uma foto que o sistema usa (aba Fotos), id de reserva que o sistema usa, ou qualquer id que o
   Espelho atual ainda aponta (o Espelho pode estar atrasado). Arquivo com menos de 7 dias nunca entra.
   Só mexe na pasta de fotos da contingência. Vai para a LIXEIRA do Drive (dá para restaurar por ~30 dias). */
/* TRAVA (só foto do cardápio): só entra na limpeza arquivo que seja IMAGEM (JPG/PNG/WEBP) com o nome que o sistema dá às cópias
   ("<id da foto>.jpg"). Qualquer outro arquivo colocado na pasta (PDF, planilha, foto com outro nome...) nunca é apagado. */
function ehCopiaDoSistemaCont_(f) {
  const tipo = String(f.getMimeType() || '');
  return (tipo === 'image/jpeg' || tipo === 'image/png' || tipo === 'image/webp') && /^[\w-]{10,80}\.(jpg|png|webp)$/.test(String(f.getName() || ''));
}
function fotosEmUsoEspelho_() {
  const set = {};
  try { const esp = lerEspelho_(['publico', 'interno']); (JSON.stringify(esp || {}).match(/[\w-]{25,80}/g) || []).forEach(function (id) { set[id] = true; }); } catch (e) {}
  return set;
}
function analisarFotosSemUso(emUsoOrigem, emUsoReserva) {
  if (!Array.isArray(emUsoOrigem) || !emUsoOrigem.length) return { ok: false, message: 'Lista de fotos em uso vazia: análise cancelada (proteção, nada apagado).' };
  const uso = {}; emUsoOrigem.forEach(function (i) { uso[String(i)] = true; });
  const usoRes = {}; (Array.isArray(emUsoReserva) ? emUsoReserva : []).forEach(function (i) { usoRes[String(i)] = true; });
  const esp = fotosEmUsoEspelho_();
  const sh = abaFotos_(); const last = sh.getLastRow(); const origemDe = {};
  if (last >= 2) sh.getRange(2, 1, last - 1, 2).getValues().forEach(function (r) { if (r[1]) origemDe[r[1]] = r[0]; });
  const limite = Date.now() - 7 * 86400000, semUso = []; let total = 0, bytes = 0, recentes = 0, outros = 0;
  const it = pastaFotos_().getFiles();
  while (it.hasNext() && total < 3000) {
    const f = it.next(); if (f.isTrashed()) continue; total++;
    const id = f.getId(), orig = origemDe[id];
    if (usoRes[id] || esp[id] || (orig && uso[orig])) continue;
    if (!ehCopiaDoSistemaCont_(f)) { outros++; continue; }   // não é cópia de foto do cardápio: nunca entra
    if (f.getDateCreated().getTime() > limite) { recentes++; continue; }
    const t = f.getSize(); bytes += t;
    semUso.push({ id: id, nome: f.getName(), tamanho: t, criadoEm: f.getDateCreated().toISOString(), motivo: orig ? 'cópia de uma foto que o sistema não usa mais' : 'arquivo solto (sem ligação com foto do sistema)' });
  }
  return { ok: true, total: total, qtdSemUso: semUso.length, bytesSemUso: bytes, recentesIgnoradas: recentes, outrosIgnorados: outros, semUso: semUso.slice(0, 500) };
}
function limparFotosSemUso(ids, emUsoOrigem, emUsoReserva) {
  if (!Array.isArray(ids) || !ids.length) return { ok: true, removidas: 0, bytes: 0, ids: [] };
  const a = analisarFotosSemUso(emUsoOrigem, emUsoReserva); if (!a.ok) return a;   // confere de novo na hora de apagar
  const pode = {}; a.semUso.forEach(function (x) { pode[x.id] = x; });
  const feitos = []; let bytes = 0;
  ids.slice(0, 200).forEach(function (id) {
    const x = pode[String(id)]; if (!x) return;
    try { DriveApp.getFileById(x.id).setTrashed(true); feitos.push(x.id); bytes += x.tamanho; } catch (e) {}
  });
  if (feitos.length) {   // tira do mapa as cópias apagadas (senão a sincronização acharia que a cópia ainda existe)
    const sh = abaFotos_(); const last = sh.getLastRow();
    if (last >= 2) { const v = sh.getRange(2, 1, last - 1, 2).getValues(); const set = {}; feitos.forEach(function (i) { set[i] = true; }); for (let i = v.length - 1; i >= 0; i--) if (set[v[i][1]]) sh.deleteRow(i + 2); }
  }
  return { ok: true, removidas: feitos.length, bytes: bytes, ids: feitos };
}
function restaurarFotos(ids) {
  let n = 0;
  (Array.isArray(ids) ? ids : []).slice(0, 300).forEach(function (id) {
    try { const f = DriveApp.getFileById(String(id)); let naPasta = false; const pid = pastaFotos_().getId(), it = f.getParents(); while (it.hasNext()) if (it.next().getId() === pid) naPasta = true; if (naPasta && f.isTrashed()) { f.setTrashed(false); n++; } } catch (e) {}
  });
  return { ok: true, restauradas: n };
}

/* ---------- ITEM 18: espaço usado da conta da contingência ---------- */
function getArmazenamentoCont_() {
  const cats = { 'Cópias de backup': { qtd: 0, bytes: 0 }, 'Fotos (cópia)': { qtd: 0, bytes: 0 } };
  const backups = [];
  const itB = pastaBackups_().getFiles();
  while (itB.hasNext()) { const f = itB.next(); const b = f.getSize(); cats['Cópias de backup'].qtd++; cats['Cópias de backup'].bytes += b; backups.push({ nome: f.getName(), tamanho: b, criadoEm: f.getDateCreated().toISOString() }); }
  backups.sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
  const itF = pastaFotos_().getFiles();
  while (itF.hasNext()) { const f = itF.next(); cats['Fotos (cópia)'].qtd++; cats['Fotos (cópia)'].bytes += f.getSize(); }
  return { ok: true, drive: armazenamento_(), categorias: cats, backups: backups.slice(0, 10) };
}


/* =====================================================================
   RESERVA DE LEITURA
   Quando o Supabase cai, o app mostra os pedidos em andamento (espelho a cada ~10 min) e os pedidos que entraram aqui na fila.
   Perfil "leitura": só lê. Nunca devolve telefone, endereço nem forma de pagamento.
   ===================================================================== */
function gerarChaveLeitura_() {   // só a planilha principal chama (chave do servidor); devolve sempre a mesma chave
  const p = PropertiesService.getScriptProperties();
  let k = p.getProperty('CHAVE_LEITURA');
  if (!k) { k = 'txblei' + Utilities.getUuid().replace(/-/g, ''); p.setProperty('CHAVE_LEITURA', k); }
  return { ok: true, chave: k };
}
function filaInternaResumo_() {
  return readFilaPendente().filter(function (x) { return x.tipo === 'venda' && !x.corrompido; }).slice(-80).map(function (x) {
    const d = x.dados || {};
    const itens = (d.itens || []).map(function (i) { return { descricao: String(i.descricao || ''), quantidade: Number(i.quantidade) || 0 }; });
    const total = (d.itens || []).reduce(function (t, i) { return t + (Number(i.valorUnitario) || 0) * (Number(i.quantidade) || 0); }, 0);
    return { id: x.id, recebidoEm: x.recebidoEm, origem: d.origem || '', cliente: d.clienteNome || '', tipoEntrega: d.tipoEntrega || '', itens: itens,
             total: Math.round(total * 100) / 100, obs: (d.dadosEntrega && d.dadosEntrega.observacoes) ? String(d.dadosEntrega.observacoes) : '' };
  });
}


/* =====================================================================
   LIMPEZA DA FILA
   A aba Fila só crescia: cada pedido sincronizado continuava ali e todo envio relia tudo. Agora as linhas SINCRONIZADAS com mais
   de FILA_RETENCAO_DIAS dias são apagadas (em faixas, de baixo para cima). Pendentes e corrompidos NUNCA são apagados.
   Rode `garantirLimpezaFila` UMA vez no editor para criar o gatilho diário (4h).
   ===================================================================== */
const FILA_RETENCAO_DIAS = 7;
function limparFilaSincronizada() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return 'Ocupado; tente depois.';
  try {
    const sh = ss_().getSheetByName('Fila');
    const last = sh ? sh.getLastRow() : 0;
    if (last < 2) return 'Fila vazia.';
    const dados = sh.getRange(2, 5, last - 1, 2).getValues();   // status, sincronizadoEm
    const corte = Date.now() - FILA_RETENCAO_DIAS * 86400000;
    const apagar = [];
    dados.forEach((r, i) => { if (r[0] === 'Sincronizado' && r[1] && new Date(r[1]).getTime() < corte) apagar.push(i + 2); });
    const faixas = [];
    apagar.forEach(n => { const u = faixas[faixas.length - 1]; if (u && n === u[0] + u[1]) u[1]++; else faixas.push([n, 1]); });
    for (let f = faixas.length - 1; f >= 0; f--) sh.deleteRows(faixas[f][0], faixas[f][1]);
    return 'Fila: ' + apagar.length + ' linha(s) sincronizada(s) antiga(s) apagada(s).';
  } finally { lock.releaseLock(); }
}
function garantirLimpezaFila() {
  const tem = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'limparFilaSincronizada');
  if (!tem) ScriptApp.newTrigger('limparFilaSincronizada').timeBased().everyDays(1).atHour(4).create();
  return 'Limpeza diária da Fila ativada (4h).';
}


/* ============================================================================
   LIMPEZA DE ABAS SEM USO (09/10/2026; 11/10/2026: as abas SB_* também saem)
   Esta planilha só precisa de: Fila, Espelho e Fotos. Qualquer outra (por exemplo
   "Sheet1" / "Página1", as antigas SB_* ou sobras de versões antigas) pode sair.
   COMO USAR (no editor do Apps Script, escolha a função e toque em Executar):
     1) previaLimpezaAbasContingencia   só MOSTRA o que seria apagado (nada é alterado)
     2) limparAbasContingencia          faz uma CÓPIA no seu Drive e então apaga as abas sem uso
   Nunca apaga Fila, Espelho nem Fotos.
   ============================================================================ */
function abaProtegidaContingencia_(nome) { return nome === 'Fila' || nome === 'Espelho' || nome === 'Fotos'; }

/* As abas SB_* eram uma cópia das tabelas do Supabase que deixou de ser enviada para cá (a fila vai só para a planilha principal).
   São apagadas sozinhas UMA vez, depois de um espelho atualizado com sucesso. Não têm nada que não esteja no Supabase. */
function apagarAbasSbUmaVez_() {
  const p = PropertiesService.getScriptProperties();
  if (p.getProperty('ABAS_SB_APAGADAS') === 'v1') return;
  const ss = ss_();
  if (!ss.getSheetByName('Fila') || !ss.getSheetByName('Espelho')) return;
  ss.getSheets().forEach(function (s) { if (/^SB_/.test(s.getName()) && ss.getSheets().length > 1) { try { ss.deleteSheet(s); } catch (e) {} } });
  p.setProperty('ABAS_SB_APAGADAS', 'v1');
}

function previaLimpezaAbasContingencia() {
  const nomes = ss_().getSheets().map(function (s) { return s.getName(); });
  const apagar = nomes.filter(function (n) { return !abaProtegidaContingencia_(n); });
  const ficam = nomes.filter(function (n) { return abaProtegidaContingencia_(n); });
  const texto = 'SERIAM APAGADAS (' + apagar.length + '): ' + (apagar.join(', ') || 'nenhuma') + '\nFICAM (' + ficam.length + '): ' + ficam.join(', ');
  Logger.log(texto); return texto;
}

function limparAbasContingencia() {
  const ss = ss_();
  const apagar = ss.getSheets().map(function (s) { return s.getName(); }).filter(function (n) { return !abaProtegidaContingencia_(n); });
  if (!apagar.length) { const m = 'Nenhuma aba sem uso encontrada.'; Logger.log(m); return m; }
  if (!ss.getSheetByName('Fila') || !ss.getSheetByName('Espelho')) {
    const m = 'NADA FOI APAGADO: as abas Fila/Espelho não existem. Rode "setup" primeiro.'; Logger.log(m); return m;
  }
  let copia;
  try {
    const stamp = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm');
    copia = ss.copy('COPIA antes de limpar abas - ' + stamp);
  } catch (e) { const m = 'NADA FOI APAGADO: não consegui fazer a cópia de segurança (' + e.message + ').'; Logger.log(m); return m; }
  const apagadas = [], falhas = [];
  apagar.forEach(function (n) {
    try { const s = ss.getSheetByName(n); if (s && ss.getSheets().length > 1) { ss.deleteSheet(s); apagadas.push(n); } } catch (e) { falhas.push(n + ' (' + e.message + ')'); }
  });
  const msg = 'Cópia criada: "' + copia.getName() + '" (Drive). Apagadas ' + apagadas.length + ' aba(s): ' + apagadas.join(', ') + (falhas.length ? '. Não apagadas: ' + falhas.join('; ') : '') + '.';
  Logger.log(msg); return msg;
}
