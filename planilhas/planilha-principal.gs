/**
 * RESTAURANTE — PLANILHA PRINCIPAL (versão enxuta, 11/10/2026)
 *
 * O sistema hoje roda no Supabase. Esta planilha ficou só com o que ainda é dela:
 *   - abas SB_<tabela>: cópia automática do cardápio, clientes e vendas (chega pelo Supabase a cada 2 min);
 *   - abas Arquivo_*: vendas e caixas antigos que saíram do Supabase para liberar espaço (os relatórios leem daqui);
 *   - Log e Auditoria;
 *   - fotos e cópias de backup no Google Drive desta conta;
 *   - o espelho da planilha de contingência (o Supabase pede a cada 10 min e completo às 3h).
 * Quem chama esta planilha é só o Supabase, com a chave guardada na propriedade do script SB_CHAVE_SERVIDOR (nenhuma chave fica escrita neste arquivo).
 *
 * COMO ATUALIZAR: Extensões > Apps Script > apague tudo e cole este arquivo > Salvar >
 *   Implantar > Gerenciar implantações > lápis (editar) > Versão: "Nova versão" > Implantar. O endereço /exec continua o mesmo.
 * Os gatilhos (acionadores) do sistema antigo se apagam sozinhos na primeira chamada depois da atualização.
 * Para apagar as abas antigas: escolha "limparAbasAntigas" na lista de funções e toque em Executar (ela faz uma cópia da planilha antes).
 *
 * PLANILHA NOVA (outro restaurante): cole o arquivo, rode "configurarIdPlanilha" uma vez, cadastre as chaves da contingência nas Propriedades do script e rode "conferirChavesContingencia"
 *   (se houver contingência). Implantar > Nova implantação > App da Web > Executar como "Eu" > Acesso "Qualquer pessoa".
 *   No Supabase: SHEETS_MAIN_URL = endereço /exec e PRINCIPAL_CHAVE_SERVIDOR = a mesma chave da propriedade SB_CHAVE_SERVIDOR.
 */

const FUSO         = 'America/Sao_Paulo';

/* Quem fez a ação (vai para o Log e a Auditoria). Nas chamadas do Supabase ficam vazios. */
let USUARIO_ATUAL = '';
let NIVEL_ATUAL = '';
let APARELHO_ATUAL = ''; // BLOCO 4.2/4.5: "aparelho xxxxxxxx · Chrome · Android" da sessão (o Apps Script não expõe IP)
let AUTORIZADOR_ATUAL = '';

/* ---------- CONTINGÊNCIA (Item 81) ----------
   API separada, numa conta Google diferente, que serve de plano B: espelho de
   leitura (cardápio/produtos/clientes) + fila de vendas feitas enquanto esta
   planilha estiver fora do ar. */
const CONTINGENCIA_API_URL = '';   // cole aqui o endereço (/exec) da planilha de contingência depois de publicá-la
/* SEGURANÇA: as chaves da contingência NÃO ficam no código. Cadastre em Configurações do projeto ->
   Propriedades do script: CONTINGENCIA_CHAVE_SERVIDOR (só esta planilha usa) e CONTINGENCIA_CHAVE_INTERNA
   (entregue só a Admin/Operador logados). Os valores saem da função gerarChaves() do script da contingência. */
function chaveContingencia_(nome) {
  const v = PropertiesService.getScriptProperties().getProperty(nome);
  if (!v) throw new Error('Chave da contingência não configurada (' + nome + '). Veja Propriedades do script.');
  return v;
}

/* ITEM 16 — conferência das chaves da contingência.
   Rode no editor do Apps Script (menu de funções -> conferirChavesContingencia -> Executar) e veja o "Registro de execução".
   Nunca mostra a chave inteira. */
function conferirChavesContingencia() {
  const p = PropertiesService.getScriptProperties();
  const srv = p.getProperty('CONTINGENCIA_CHAVE_SERVIDOR') || '';
  const int = p.getProperty('CONTINGENCIA_CHAVE_INTERNA') || '';
  const mascara = v => v ? v.slice(0, 7) + '…' + v.slice(-4) + ' (' + v.length + ' caracteres)' : 'AUSENTE';
  const chamar = (chave, action) => {
    try {
      const r = UrlFetchApp.fetch(CONTINGENCIA_API_URL, { method: 'post', contentType: 'application/json', payload: JSON.stringify({ chave: chave, action: action }), muteHttpExceptions: true });
      return JSON.parse(r.getContentText());
    } catch (e) { return { ok: false, message: 'Falha de rede: ' + e.message }; }
  };
  const L = [];
  L.push('CONTINGENCIA_CHAVE_SERVIDOR: ' + mascara(srv) + (srv && srv.indexOf('txbsrv-') !== 0 ? '   ⚠ prefixo inesperado (deveria começar com txbsrv-)' : ''));
  L.push('CONTINGENCIA_CHAVE_INTERNA : ' + mascara(int) + (int && int.indexOf('txbint-') !== 0 ? '   ⚠ prefixo inesperado (deveria começar com txbint-)' : ''));
  if (srv && srv === int) L.push('⚠ SERVIDOR e INTERNA são iguais — devem ser chaves diferentes.');
  if (srv) { const r = chamar(srv, 'listarPendentes'); L.push('Teste SERVIDOR (listarPendentes): ' + (r.ok ? 'OK — a contingência aceitou a chave' : 'FALHOU — ' + (r.message || 'sem resposta'))); }
  if (int) {
    const r1 = chamar(int, 'getEspelhoInterno'); L.push('Teste INTERNA (getEspelhoInterno): ' + (r1.ok ? 'OK — a contingência aceitou a chave' : 'FALHOU — ' + (r1.message || 'sem resposta')));
    const r2 = chamar(int, 'listarPendentes'); L.push('Teste INTERNA não pode listar pendentes: ' + (r2.ok ? '⚠ ela aceitou uma ação só de servidor — confira se não é a mesma chave' : 'OK (negado, como deve ser)'));
  }
  L.push('Chave PÚBLICA: fica no index.html (constante CONTINGENCIA_CHAVE_PUBLICA) e deve ser igual à CHAVE_PUBLICA do projeto da contingência.');
  Logger.log(L.join('\n'));
  return L.join('\n');
}

/* OTIMIZAÇÃO (leitura): a planilha ativa e cada aba são buscadas UMA vez por execução (antes, cada função repetia getActiveSpreadsheet + getSheetByName). */
let _ssAtivaMemo_ = null, _abasMemo_ = {};
function ssAtiva_() { if (!_ssAtivaMemo_) _ssAtivaMemo_ = SpreadsheetApp.getActiveSpreadsheet(); return _ssAtivaMemo_; }
function abaPorNome_(nome) { if (!_abasMemo_[nome]) _abasMemo_[nome] = ssAtiva_().getSheetByName(nome); return _abasMemo_[nome]; }   // aba que não existe não fica guardada (pode ser criada logo depois)

function responder(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function agora() { return Utilities.formatDate(new Date(), FUSO, 'dd/MM/yyyy HH:mm'); }
let _ssMemo_ = null; // OTIMIZAÇÃO: abre a planilha UMA vez por execução (antes, cada leitura chamava openById de novo)
function ss_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('SPREADSHEET_ID');
  if (!id) {
    // Primeira vez rodando: captura o ID enquanto ainda há um contexto vinculado
    // disponível, e guarda pra sempre — depois disso, nunca mais depende de
    // getActiveSpreadsheet() (que falha silenciosamente em Web App e em gatilhos
    // por tempo, já que ali não existe planilha "ativa").
    const ativa = SpreadsheetApp.getActiveSpreadsheet();
    if (!ativa) throw new Error('Não foi possível identificar a planilha na primeira execução. Abra o editor do Apps Script pela própria planilha (Extensões → Apps Script) e rode a função configurarIdPlanilha() uma vez.');
    id = ativa.getId();
    props.setProperty('SPREADSHEET_ID', id);
  }
  if (!_ssMemo_) _ssMemo_ = SpreadsheetApp.openById(id);
  return _ssMemo_;
}
/* Rode esta função uma vez pelo editor do Apps Script (aberto a partir da
   própria planilha) se por algum motivo o ID precisar ser (re)configurado. */
function configurarIdPlanilha() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  return 'ID da planilha configurado: ' + ss.getId();
}

const ACOES_AUDITADAS_RE = /ajuste p[óo]s-venda|suspens|retomad|desconto|cancelad|editada|estorno|estoque|perda|inventário|usuário|senha|sangria|despesa|forma de pagamento|restaur|backup|acesso negado|preço|fechamento|entregador atribu|login falhou|conta de mesa|qr da mesa/i;
function registrarAuditoria_(acao, detalhes) {
  const ss = ss_();
  let sh = ss.getSheetByName('Auditoria');
  if (!sh) {
    sh = ss.insertSheet('Auditoria');
    sh.appendRow(['Data/Hora', 'Usuário', 'Perfil', 'Ação', 'Detalhes', 'Autorizado por', 'Aparelho']);
    sh.setFrozenRows(1); sh.setTabColor('#5a5a5a');
  }
  if (sh.getLastColumn() < 7) sh.getRange(1, 7).setValue('Aparelho'); // BLOCO 4.2: abas antigas ganham a coluna sozinhas
  sh.appendRow([agora(), USUARIO_ATUAL || '', NIVEL_ATUAL || '', acao, detalhes || '', AUTORIZADOR_ATUAL || '', APARELHO_ATUAL || '']);
}

/* ---------- LOG ---------- */
function registrarLog(acao, telefone, detalhes) {
  const ss = ss_();
  let sh = ss.getSheetByName('Log');
  if (!sh) { sh = ss.insertSheet('Log'); sh.appendRow(['Data/Hora', 'Ação', 'Telefone', 'Detalhes', 'Usuário']); sh.setFrozenRows(1); }
  sh.appendRow([agora(), acao, telefone || '', detalhes || '', USUARIO_ATUAL || '']);
  if (ACOES_AUDITADAS_RE.test(String(acao))) registrarAuditoria_(acao, (telefone ? '[' + telefone + '] ' : '') + (detalhes || ''));
}
function urlFoto_(fotoId) { return fotoId ? ('https://drive.google.com/uc?export=view&id=' + fotoId) : ''; }
/* ---------- FOTOS (Google Drive) ---------- */
function obterPastaFotos_() {
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('PASTA_FOTOS_ID');
  if (folderId) {
    try { return DriveApp.getFolderById(folderId); } catch (e) { /* pasta foi apagada, recria abaixo */ }
  }
  const raiz = DriveApp.getRootFolder();
  const existentes = raiz.getFoldersByName('Restaurante - Fotos');
  const pasta = existentes.hasNext() ? existentes.next() : raiz.createFolder('Restaurante - Fotos');
  props.setProperty('PASTA_FOTOS_ID', pasta.getId());
  return pasta;
}
function nomeArquivoSeguro_(nome) {
  const base = (nome || 'item').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\-_ ]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
  return (base || 'item');
}
/* Sobe a foto NOVA primeiro; só depois de confirmado que ela foi salva com sucesso
   é que a foto ANTIGA (fotoIdAntigo) é excluída do Drive. Se o upload falhar, a antiga permanece intacta. */
function _uploadFotoSegura(nomeBase, base64Data, mimeType, fotoIdAntigo) {
  if (!base64Data) return { ok: false, message: 'Nenhuma imagem recebida.' };
  try {
    const pasta = obterPastaFotos_();
    const dadosLimpos = base64Data.indexOf(',') >= 0 ? base64Data.split(',').pop() : base64Data;
    const bytes = Utilities.base64Decode(dadosLimpos);
    /* SEGURANÇA (Módulo 3): confere o conteúdo real do arquivo (não confia no tipo informado). Só JPEG/PNG/WEBP até 5 MB —
       impede hospedar HTML, SVG ou executável no Drive do restaurante com link público. */
    if (bytes.length > 5 * 1024 * 1024) return { ok: false, message: 'Imagem grande demais (máximo 5 MB).' };
    const b = bytes;
    const u8 = function (k) { return (b[k] + 256) % 256; };
    let tipoReal = '', ext = '';
    if (u8(0) === 0xFF && u8(1) === 0xD8 && u8(2) === 0xFF) { tipoReal = 'image/jpeg'; ext = '.jpg'; }
    else if (u8(0) === 0x89 && u8(1) === 0x50 && u8(2) === 0x4E && u8(3) === 0x47) { tipoReal = 'image/png'; ext = '.png'; }
    else if (u8(0) === 0x52 && u8(1) === 0x49 && u8(2) === 0x46 && u8(3) === 0x46 && u8(8) === 0x57 && u8(9) === 0x45 && u8(10) === 0x42 && u8(11) === 0x50) { tipoReal = 'image/webp'; ext = '.webp'; }
    if (!tipoReal) return { ok: false, message: 'Arquivo não é uma imagem válida (use JPG, PNG ou WEBP).' };
    const nomeArquivo = nomeArquivoSeguro_(nomeBase) + '-' + Utilities.getUuid().slice(0, 8) + ext;
    const blob = Utilities.newBlob(bytes, tipoReal, nomeArquivo);
    const arquivo = pasta.createFile(blob);
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const novoId = arquivo.getId();
    // Só chega aqui se o upload da nova foto deu certo — agora sim pode excluir a antiga.
    if (fotoIdAntigo) { try { DriveApp.getFileById(fotoIdAntigo).setTrashed(true); } catch (e) { /* antiga já não existe, ok */ } }
    return { ok: true, fotoId: novoId, fotoUrl: urlFoto_(novoId) };
  } catch (e) {
    return { ok: false, message: 'Não foi possível salvar a foto: ' + e.message };
  }
}
/* ---------- P-12 (v1.15): FOTOS SEM USO no Drive principal e no da contingência ----------
   O Supabase manda a lista COMPLETA das fotos em uso (produtos, combos e histórico de fotos). Se ela vier vazia, nada é feito.
   Só mexe na pasta "Restaurante - Fotos" (comprovantes de nota e fotos do ponto têm regra própria e ficam de fora).
   Arquivo com menos de 7 dias nunca entra (upload em andamento). Vai para a LIXEIRA do Drive (restaurável por ~30 dias);
   o espaço só volta de fato quando a lixeira do Drive é esvaziada. Cada limpeza fica anotada na aba Fotos_Limpeza. */
/* TRAVA (só foto do cardápio): só entra na limpeza arquivo que seja IMAGEM (JPG/PNG/WEBP) com o nome que o sistema dá às fotos
   ("nome-do-item-1a2b3c4d.jpg"). Qualquer outro arquivo colocado na pasta (PDF, planilha, foto com outro nome...) nunca é apagado. */
function sbEhFotoDoSistema_(f) {
  const tipo = String(f.getMimeType() || '');
  return (tipo === 'image/jpeg' || tipo === 'image/png' || tipo === 'image/webp') && /^[a-z0-9_-]+-[0-9a-f]{8}\.(jpg|png|webp)$/.test(String(f.getName() || ''));
}
function sbFotosBase_(nome) { return String(nome || '').replace(/\.[a-z0-9]+$/i, '').replace(/-[0-9a-f]{8}$/i, ''); }
function sbFotosAnalisarPrincipal_(emUso) {
  const uso = {}; emUso.forEach(function (i) { uso[String(i)] = true; });
  const limite = Date.now() - 7 * 86400000, semUso = [], usadas = {}; let total = 0, bytes = 0, recentes = 0, outros = 0;
  const it = obterPastaFotos_().getFiles(), soltas = [];
  while (it.hasNext() && total < 3000) {
    const f = it.next(); if (f.isTrashed()) continue; total++;
    const id = f.getId();
    if (uso[id]) { usadas[sbFotosBase_(f.getName()) + '|' + f.getSize()] = true; continue; }
    if (!sbEhFotoDoSistema_(f)) { outros++; continue; }   // não é foto do cardápio: nunca entra
    if (f.getDateCreated().getTime() > limite) { recentes++; continue; }
    soltas.push(f);
  }
  soltas.forEach(function (f) {
    const t = f.getSize(); bytes += t;
    semUso.push({ id: f.getId(), nome: f.getName(), tamanho: t, criadoEm: f.getDateCreated().toISOString(),
      motivo: usadas[sbFotosBase_(f.getName()) + '|' + t] ? 'duplicada de uma foto em uso' : 'não é foto de nenhum produto ou combo' });
  });
  return { total: total, qtdSemUso: semUso.length, bytesSemUso: bytes, recentesIgnoradas: recentes, outrosIgnorados: outros, semUso: semUso.slice(0, 500) };
}
function sbFotosAnalisar_(body) {
  const emUso = Array.isArray(body.emUso) ? body.emUso.filter(Boolean) : [];
  if (!emUso.length) return { ok: false, message: 'A lista de fotos em uso veio vazia: análise cancelada (proteção, nada foi apagado).' };
  const principal = sbFotosAnalisarPrincipal_(emUso);
  let contingencia;
  try { contingencia = chamarContingencia_('analisarFotosSemUso', { emUsoOrigem: emUso, emUsoReserva: Array.isArray(body.emUsoCont) ? body.emUsoCont : [] }); }
  catch (e) { contingencia = { ok: false, message: 'A contingência não respondeu: ' + e.message }; }
  return { ok: true, principal: principal, contingencia: contingencia };
}
function sbFotosAbaLimpeza_() {
  let sh = abaPorNome_('Fotos_Limpeza');
  if (!sh) { sh = ssAtiva_().insertSheet('Fotos_Limpeza'); sh.appendRow(['Data', 'Drive', 'Id', 'Nome', 'Tamanho', 'Restaurada em']); sh.setFrozenRows(1); }
  return sh;
}
function sbFotosLimpar_(body) {
  const emUso = Array.isArray(body.emUso) ? body.emUso.filter(Boolean) : [];
  if (!emUso.length) return { ok: false, message: 'A lista de fotos em uso veio vazia: nada foi apagado (proteção).' };
  const res = { ok: true, principal: { removidas: 0, bytes: 0 }, contingencia: { removidas: 0, bytes: 0 } };
  const linhas = [], agoraTxt = new Date();
  const idsP = Array.isArray(body.ids) ? body.ids.slice(0, 200) : [];
  if (idsP.length) {
    const a = sbFotosAnalisarPrincipal_(emUso), pode = {};   // confere de novo na hora de apagar
    a.semUso.forEach(function (x) { pode[x.id] = x; });
    idsP.forEach(function (id) {
      const x = pode[String(id)]; if (!x) return;
      try { DriveApp.getFileById(x.id).setTrashed(true); res.principal.removidas++; res.principal.bytes += x.tamanho; linhas.push([agoraTxt, 'principal', x.id, x.nome, x.tamanho, '']); } catch (e) {}
    });
  }
  const idsC = Array.isArray(body.idsCont) ? body.idsCont.slice(0, 200) : [];
  if (idsC.length) {
    try {
      const c = chamarContingencia_('limparFotosSemUso', { ids: idsC, emUsoOrigem: emUso, emUsoReserva: Array.isArray(body.emUsoCont) ? body.emUsoCont : [] });
      if (c && c.ok) { res.contingencia = { removidas: c.removidas || 0, bytes: c.bytes || 0 }; (c.ids || []).forEach(function (id) { linhas.push([agoraTxt, 'contingencia', id, '', '', '']); }); }
      else res.contingencia = { removidas: 0, bytes: 0, erro: (c && c.message) || 'A contingência recusou.' };
    } catch (e) { res.contingencia = { removidas: 0, bytes: 0, erro: 'A contingência não respondeu: ' + e.message }; }
  }
  if (linhas.length) { const sh = sbFotosAbaLimpeza_(); sh.getRange(sh.getLastRow() + 1, 1, linhas.length, 6).setValues(linhas); }
  return res;
}
/* Restaura (tira da lixeira) tudo o que a ÚLTIMA limpeza mandou para a lixeira. */
function sbFotosRestaurar_(body) {
  const sh = abaPorNome_('Fotos_Limpeza'); if (!sh || sh.getLastRow() < 2) return { ok: true, restauradas: 0, message: 'Nenhuma limpeza registrada.' };
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();
  let ultima = 0; v.forEach(function (r) { const t = new Date(r[0]).getTime(); if (!r[5] && t > ultima) ultima = t; });
  if (!ultima) return { ok: true, restauradas: 0, message: 'Não há limpeza para restaurar.' };
  const pid = obterPastaFotos_().getId(), idsCont = [], agora = new Date(); let n = 0;
  v.forEach(function (r, i) {
    if (r[5] || new Date(r[0]).getTime() !== ultima) return;
    if (r[1] === 'principal') {
      try { const f = DriveApp.getFileById(String(r[2])); let naPasta = false; const it = f.getParents(); while (it.hasNext()) if (it.next().getId() === pid) naPasta = true; if (naPasta && f.isTrashed()) { f.setTrashed(false); n++; } } catch (e) {}
    } else idsCont.push(String(r[2]));
    sh.getRange(i + 2, 6).setValue(agora);
  });
  let nc = 0;
  if (idsCont.length) { try { const c = chamarContingencia_('restaurarFotos', { ids: idsCont }); if (c && c.ok) nc = c.restauradas || 0; } catch (e) {} }
  return { ok: true, restauradas: n + nc, message: (n + nc) + ' foto(s) tirada(s) da lixeira. As cópias da contingência voltam a ser ligadas na próxima sincronização.' };
}
const ARMAZ_ATENCAO_PCT = 70, ARMAZ_CRITICO_PCT = 90;
function obterPastaBackups_() {
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('PASTA_BACKUPS_ID');
  if (folderId) { try { return DriveApp.getFolderById(folderId); } catch (e) { /* pasta apagada, recria abaixo */ } }
  const raiz = DriveApp.getRootFolder();
  const existentes = raiz.getFoldersByName('Restaurante - Backups');
  const pasta = existentes.hasNext() ? existentes.next() : raiz.createFolder('Restaurante - Backups');
  props.setProperty('PASTA_BACKUPS_ID', pasta.getId());
  return pasta;
}
/* Google Sheets nativo devolve getSize()=0; o tamanho real é medido pela exportação xlsx (aproximado). */
function tamanhoAproximadoPlanilha_(fileId) {
  try {
    const r = UrlFetchApp.fetch('https://docs.google.com/spreadsheets/d/' + fileId + '/export?format=xlsx',
      { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
    return r.getResponseCode() === 200 ? r.getBlob().getBytes().length : 0;
  } catch (e) { return 0; }
}
function obterArmazenamentoDrive_() {
  const usado = DriveApp.getStorageUsed(), limite = DriveApp.getStorageLimit();
  const pct = limite > 0 ? Math.round(usado / limite * 1000) / 10 : null;
  const nivel = pct === null ? 'Indisponível' : pct > ARMAZ_CRITICO_PCT ? 'Crítico' : pct >= ARMAZ_ATENCAO_PCT ? 'Atenção' : 'Normal';
  return { usado: usado, limite: limite, livre: limite > 0 ? Math.max(0, limite - usado) : null, percentual: pct, nivel: nivel };
}

/* ---------- ITEM 18: espaço da conta da contingência ---------- */
function obterArmazenamentoContingencia() {
  try {
    const r = chamarContingencia_('getArmazenamento');
    if (!r || !r.ok) return { ok: false, message: (r && r.message) || 'A contingência não respondeu.' };
    return r;
  } catch (e) { return { ok: false, message: 'Não foi possível falar com a contingência: ' + e.message }; }
}

/* ---------- CONTINGÊNCIA — SINCRONIZAÇÃO E RECONCILIAÇÃO (Item 81) ---------- */
function chamarContingencia_(action, extra) {
  const payload = Object.assign({ chave: chaveContingencia_('CONTINGENCIA_CHAVE_SERVIDOR'), action: action }, extra || {});
  const resp = UrlFetchApp.fetch(CONTINGENCIA_API_URL, {
    method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true
  });
  const txt = resp.getContentText();
  try { return JSON.parse(txt); }
  catch (eP) { return { ok: false, message: 'A contingência respondeu algo que não é JSON (HTTP ' + resp.getResponseCode() + '): ' + String(txt).replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) }; }
}

/* ============================================================================
   CHAMADAS DO SUPABASE (Edge Functions sync-fila, planilha-admin, arquivar-antigos, upload-foto, remover-foto,
   sincronizar-fotos, criar-backup e conferir-integridade). Toda chamada traz a chave do servidor.
   ============================================================================ */
/* Chave que a Edge Function envia: SÓ a propriedade do script SB_CHAVE_SERVIDOR (Configurações do projeto → Propriedades do script).
   Versão 1.15 (auditoria final): a chave que ficava escrita aqui como "padrão" saiu do arquivo. Sem a propriedade, a planilha recusa
   tudo com a mensagem abaixo (nada falha calado). Antes de colar esta versão, confira a propriedade (passo a passo no LEIA-ME). */
const ACOES_SERVIDOR_SB_ = ['syncLote', 'arquivar', 'replicarFotos', 'contarVendasHoje', 'uploadFotoSb', 'excluirFotoSb',
  'sbSincronizarContingencia', 'sbLerArquivo', 'sbLerArquivoCaixa', 'sbLerArquivoCliente', 'sbContarArquivo', 'sbGuardarBackup', 'sbChaveLeitura', 'sbArmazenamento', 'sbArmazenamentoContingencia', 'sbChaveContingencia', 'sbListarPendentesContingencia', 'sbMarcarSincronizadoContingencia', 'sbAnonimizarArquivo', 'sbAquecerArquivo', 'sbGuardarNota', 'sbLerNota', 'sbExcluirNota', 'sbGuardarPonto', 'sbLerPonto', 'sbExcluirPonto', 'sbAvisoEmail', 'sbFotosAnalisar', 'sbFotosLimpar', 'sbFotosRestaurar', 'sbGuardarBloco', 'sbApagarBlocoTeste', 'sbResumoMensal', 'sbCelulasArquivos'];
const ACOES_SEM_TRAVA_SB_ = ['sbLerNota', 'sbLerPonto', 'sbAvisoEmail', 'contarVendasHoje', 'sbSincronizarContingencia', 'sbArmazenamento', 'sbArmazenamentoContingencia', 'sbChaveContingencia', 'sbListarPendentesContingencia', 'sbFotosAnalisar', 'sbCelulasArquivos'];
const SB_FUSO_ = 'America/Sao_Paulo';
const SB_LIMITE_CELULA_ = 40000;

function acaoServidorSb_(action, body) {
  try { removerGatilhosAntigosUmaVez_(false); } catch (eG) {}
  const esperada = PropertiesService.getScriptProperties().getProperty('SB_CHAVE_SERVIDOR');
  if (!esperada) return { ok: false, message: 'Planilha sem a chave do servidor: crie a propriedade do script SB_CHAVE_SERVIDOR (veja o LEIA-ME).' };
  if (!sbIgual_(String(body.chave || ''), esperada)) return { ok: false, message: 'Chave inválida.' };
  /* Só leitura (não altera nada): não espera nem segura o lock, para um relatório de mês antigo não travar o envio de vendas e vice-versa. */
  if (action === 'sbLerArquivo' || action === 'sbLerArquivoCaixa' || action === 'sbLerArquivoCliente') {
    try { return action === 'sbLerArquivo' ? sbLerArquivo_(body.mes) : action === 'sbLerArquivoCaixa' ? sbLerArquivoCaixa_(body.mes) : sbLerArquivoCliente_(body.telefone, body.clienteId); }
    catch (e) { return { ok: false, message: 'Erro: ' + String(e && e.message || e).slice(0, 300) }; }
  }
  /* Fase 3.3 — só conta quantos pedidos há na aba Arquivo_Vendas (para conferir com o resumo guardado no Supabase). Não altera nada. */
  if (action === 'sbContarArquivo') {
    try { return sbContarArquivo_(); }
    catch (e) { return { ok: false, message: 'Erro: ' + String(e && e.message || e).slice(0, 300) }; }
  }
  /* Aquecimento (só leitura): monta o índice do arquivo e deixa guardado, para o primeiro relatório de mês antigo do dia já sair rápido.
     O Supabase chama logo depois de arquivar (a marca das abas muda a cada arquivamento e o índice anterior deixa de valer). */
  if (action === 'sbAquecerArquivo') {
    try { const t0 = Date.now(); sbIndiceArq_(); return { ok: true, ms: Date.now() - t0 }; }
    catch (e) { return { ok: false, message: 'Erro: ' + String(e && e.message || e).slice(0, 300) }; }
  }
  /* só leitura / demoradas: NÃO seguram a trava das gravações. Antes, abrir o painel de armazenamento
     (que varre o Drive) ou rodar o espelho da contingência fazia o envio de vendas esperar. */
  if (ACOES_SEM_TRAVA_SB_.indexOf(action) !== -1) {
    try {
      if (action === 'sbLerNota') return sbLerNota_(body);
      if (action === 'sbLerPonto') return sbLerPonto_(body);
      if (action === 'sbAvisoEmail') return sbAvisoEmail_(body);
      if (action === 'contarVendasHoje') return sbContarVendasHoje_(body.data);
      if (action === 'sbSincronizarContingencia') return sbSincronizarContingenciaGuardada_(body.rapido === true);
      if (action === 'sbArmazenamento') return sbObterArmazenamento_();
      if (action === 'sbArmazenamentoContingencia') return obterArmazenamentoContingencia();
      if (action === 'sbChaveContingencia') return sbChaveContingencia_();
      if (action === 'sbListarPendentesContingencia') return sbListarPendentesContingencia_();
      if (action === 'sbFotosAnalisar') return sbFotosAnalisar_(body);
      if (action === 'sbCelulasArquivos') return sbCelulasArquivos_();
    } catch (e) { return { ok: false, message: 'Erro: ' + String(e && e.message || e).slice(0, 300) }; }
  }
  const lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (e) { return { ok: false, ocupado: true, message: 'Planilha ocupada.' }; }
  try {
    if (action === 'syncLote') return sbSyncLote_(body.itens);
    if (action === 'arquivar') return sbArquivar_(body);
    if (action === 'replicarFotos') return sbReplicarFotos_(body.itens);
    if (action === 'uploadFotoSb') return sbUploadFotoSb_(body);
    if (action === 'excluirFotoSb') return sbExcluirFotoSb_(body.ids);
    if (action === 'sbGuardarNota') return sbGuardarNota_(body);
    if (action === 'sbExcluirNota') return sbExcluirNota_(body);
    if (action === 'sbGuardarPonto') return sbGuardarPonto_(body);
    if (action === 'sbExcluirPonto') return sbExcluirPonto_(body);
    if (action === 'contarVendasHoje') return sbContarVendasHoje_(body.data);
    if (action === 'sbSincronizarContingencia') return sbSincronizarContingencia_(body.rapido === true);
    if (action === 'sbChaveLeitura') return sbChaveLeitura_(body.renovar === true);
    if (action === 'sbArmazenamento') return sbObterArmazenamento_();
    if (action === 'sbLerArquivo') return sbLerArquivo_(body.mes);
    if (action === 'sbLerArquivoCaixa') return sbLerArquivoCaixa_(body.mes);
    if (action === 'sbGuardarBackup') return sbGuardarBackup_(body);
    if (action === 'sbArmazenamentoContingencia') return obterArmazenamentoContingencia();
    if (action === 'sbChaveContingencia') return sbChaveContingencia_();
    if (action === 'sbListarPendentesContingencia') return sbListarPendentesContingencia_();
    if (action === 'sbMarcarSincronizadoContingencia') return sbMarcarSincronizadoContingencia_(body.ids);
    if (action === 'sbAnonimizarArquivo') return sbAnonimizarArquivo_(body.telefone, body.clienteId, body.lista);
    if (action === 'sbFotosLimpar') return sbFotosLimpar_(body);
    if (action === 'sbFotosRestaurar') return sbFotosRestaurar_(body);
    if (action === 'sbGuardarBloco') return sbGuardarBloco_(body);
    if (action === 'sbApagarBlocoTeste') return sbApagarBlocoTeste_(body);
    if (action === 'sbResumoMensal') return sbResumoMensal_(body);
    return { ok: false, message: 'Ação desconhecida.' };
  } catch (e) {
    return { ok: false, message: 'Erro: ' + String(e && e.message || e).slice(0, 300) };
  } finally { try { sbGravarStamps_(); } catch (e) {} lock.releaseLock(); }
}

function sbIgual_(a, b) { // comparação sem atalho por tamanho/posição
  if (a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/* Valor → célula. Texto que o Sheets converteria sozinho (datas, números, fórmulas) ganha apóstrofo para ficar texto;
   números de verdade continuam números (evita o problema de "número formatado como texto"). */
function sbCelula_(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  let s = (typeof v === 'object') ? JSON.stringify(v) : String(v);
  if (s.length > SB_LIMITE_CELULA_) s = s.slice(0, SB_LIMITE_CELULA_);
  if (/^[=+\-@]/.test(s) || /^\d{4}-\d{2}-\d{2}/.test(s) || /^[\d.,\s:]+(e\d+)?$/i.test(s)) s = "'" + s;
  return s;
}

function sbAba_(nome) {
  let sh = abaPorNome_(nome);
  if (!sh) { sh = ssAtiva_().insertSheet(nome); sh.getRange(1, 1).setValue('_id'); sh.setFrozenRows(1); _abasMemo_[nome] = sh; }
  return sh;
}

/* marcas de "o que mudou": cada aba SB_ alterada recebe a hora da última alteração.
   O espelho da contingência usa essas marcas para reler e reenviar SÓ o que mudou. Gravadas UMA vez por chamada (sbGravarStamps_). */
let _sbStamps_ = {};
function sbMarcarAlterada_(aba) { if (/^(SB_|Arquivo_)/.test(aba)) _sbStamps_[aba] = Date.now(); }   // Arquivo_* também: o cache de leitura do arquivo usa a marca
function sbLerStamps_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('SB_STAMPS') || '{}') || {}; } catch (e) { return {}; } }
function sbGravarStamps_() {
  const ks = Object.keys(_sbStamps_); if (!ks.length) return;
  try { const m = sbLerStamps_(); ks.forEach(function (k) { m[k] = _sbStamps_[k]; }); PropertiesService.getScriptProperties().setProperty('SB_STAMPS', JSON.stringify(m)); } catch (e) { /* só um acelerador: sem a marca, o próximo espelho completo reenvia tudo */ }
  _sbStamps_ = {};
}
/* Agrupa números de linha em faixas contínuas: [3,4,5,9] -> [[3,3],[9,1]] como [inicio, quantidade]. */
function sbFaixas_(linhas) {
  const o = linhas.slice().sort(function (a, b) { return a - b; }), out = [];
  o.forEach(function (n) { const u = out[out.length - 1]; if (u && n === u[0] + u[1]) u[1]++; else out.push([n, 1]); });
  return out;
}

/* Upsert/remoção por id numa aba. linhas = [{id, dados}], remover = [id]. Devolve {gravadas, removidas}.
   OTIMIZADO: lê a coluna de ids UMA vez; grava linhas vizinhas em um só bloco; apaga linhas em faixas (deleteRows),
   em vez de uma chamada à planilha por linha. O resultado na planilha é idêntico ao da versão anterior. */
function sbUpsert_(nomeAba, linhas, remover) {
  const sh = sbAba_(nomeAba);
  let cab = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String) : ['_id'];
  if (!cab.length || cab[0] === '') cab = ['_id'];
  // colunas novas
  const novas = [];
  linhas.forEach(function (l) { Object.keys(l.dados).forEach(function (k) { if (cab.indexOf(k) === -1 && novas.indexOf(k) === -1) novas.push(k); }); });
  if (novas.length) { cab = cab.concat(novas); sh.getRange(1, 1, 1, cab.length).setValues([cab]); }
  const ultima = sh.getLastRow();
  const ids = ultima > 1 ? sh.getRange(2, 1, ultima - 1, 1).getValues().map(function (r) { return String(r[0]).replace(/^'/, ''); }) : [];
  const pos = {}; ids.forEach(function (id, i) { pos[id] = i + 2; });

  const atualizar = [], novasLinhas = [], idxNova = {}; let gravadas = 0;
  linhas.forEach(function (l) {
    const linha = cab.map(function (c, i) { return i === 0 ? sbCelula_(l.id) : (c in l.dados ? sbCelula_(l.dados[c]) : ''); });
    const chave = String(l.id), p = pos[chave];
    if (p > 0) atualizar.push({ p: p, linha: linha });
    else if (idxNova[chave] !== undefined) novasLinhas[idxNova[chave]] = linha;   // mesmo id duas vezes no lote: vale o último
    else { idxNova[chave] = novasLinhas.length; novasLinhas.push(linha); }
    gravadas++;
  });
  // atualizações: linhas vizinhas viram UMA gravação
  if (atualizar.length) {
    atualizar.sort(function (a, b) { return a.p - b.p; });
    let k = 0;
    while (k < atualizar.length) {
      let f = k; while (f + 1 < atualizar.length && atualizar[f + 1].p === atualizar[f].p + 1) f++;
      sh.getRange(atualizar[k].p, 1, f - k + 1, cab.length).setValues(atualizar.slice(k, f + 1).map(function (x) { return x.linha; }));
      k = f + 1;
    }
  }
  if (novasLinhas.length) sh.getRange(sh.getLastRow() + 1, 1, novasLinhas.length, cab.length).setValues(novasLinhas);

  let removidas = 0;
  if (remover && remover.length) {
    const alvo = {}; remover.forEach(function (id) { alvo[String(id)] = true; });
    const apagar = []; ids.forEach(function (id, i) { if (alvo[id]) apagar.push(i + 2); });
    const faixas = sbFaixas_(apagar);
    for (let f = faixas.length - 1; f >= 0; f--) { sh.deleteRows(faixas[f][0], faixas[f][1]); removidas += faixas[f][1]; }   // de baixo para cima: as posições de cima não mudam
  }
  if (gravadas || removidas) sbMarcarAlterada_(nomeAba);
  return { gravadas: gravadas, removidas: removidas };
}

/* Tabelas copiadas para abas SB_: só as que esta planilha usa (espelho da contingência, conferência do dia e arquivo de vendas).
   O banco já só manda estas; se chegar outra (versão antiga do banco), ela é ignorada e conta como recebida. */
const SB_TABELAS_ESPELHO_ = ['categorias', 'produtos', 'produto_precos', 'combos', 'combo_precos', 'combo_itens', 'adicionais', 'produto_adicionais',
  'formas_pagamento', 'sistema', 'clientes', 'vendas', 'itens_venda', 'pagamentos_venda'];

/* itens da fila_sync: {id, tabela, registro_id, operacao, payload}. Só vale o ÚLTIMO estado de cada registro. */
function sbSyncLote_(itens) {
  if (!Array.isArray(itens)) return { ok: false, message: 'Lote inválido.' };
  const ultimo = {}; // tabela|id -> item
  itens.forEach(function (it) { if (it && it.tabela && it.registro_id != null) ultimo[it.tabela + '|' + it.registro_id] = it; });
  const porTabela = {};
  Object.keys(ultimo).forEach(function (k) {
    const it = ultimo[k]; const t = String(it.tabela).replace(/[^a-z0-9_]/gi, '');
    if (!t || SB_TABELAS_ESPELHO_.indexOf(t) === -1) return;
    porTabela[t] = porTabela[t] || { up: [], del: [] };
    if (it.operacao === 'DELETE') porTabela[t].del.push(String(it.registro_id));
    else porTabela[t].up.push({ id: String(it.registro_id), dados: it.payload || {} });
  });
  let total = 0;
  Object.keys(porTabela).forEach(function (t) {
    const r = sbUpsert_('SB_' + t, porTabela[t].up, porTabela[t].del);
    total += r.gravadas + r.removidas;
  });
  return { ok: true, processados: total };
}

/* Uma planilha do Google aceita no máximo 10 milhões de células (todas as abas somadas, contando as linhas e colunas reservadas).
   Esta função soma o que já está reservado; o sistema guarda o número e avisa o Admin quando passar de 80%. */
function sbCelulasUsadas_() {
  try { return ssAtiva_().getSheets().reduce(function (t, sh) { return t + sh.getMaxRows() * sh.getMaxColumns(); }, 0); } catch (e) { return 0; }
}

/* arquivo permanente. Grava por id (reenvio não duplica), LÊ DE VOLTA da planilha para conferir e só então tira do espelho.
   "recebidas" é o número de pedidos (ou caixas) que foram ENCONTRADOS na aba depois de gravar; o sistema só apaga do Supabase se esse número for igual ao enviado.
   Se faltar qualquer linha (venda, item ou pagamento), devolve -1 e nada é apagado do Supabase. */
function sbArquivar_(b) {
  function pacote(lista, aba, chaveAba) {
    const linhas = (lista || []).map(function (r) {
      if (!r || r.id == null) throw new Error('Linha sem id em ' + aba);
      return { id: String(r.id), dados: r };
    });
    sbUpsert_(aba, linhas, []);
    SpreadsheetApp.flush();
    const sh = sbAba_(aba), ult = sh.getLastRow(), achados = {};
    if (ult > 1) sh.getRange(2, 1, ult - 1, 1).getValues().forEach(function (r) { achados[String(r[0]).replace(/^'/, '')] = true; });
    let achadas = 0; linhas.forEach(function (l) { if (achados[l.id]) achadas++; });
    if (achadas === linhas.length && abaPorNome_(chaveAba)) sbUpsert_(chaveAba, [], linhas.map(function (l) { return l.id; })); // sai do espelho "vivo" (sem criar aba que não existe)
    return achadas;
  }
  if (b.tipo === 'vendas') {
    const n = pacote(b.vendas, 'Arquivo_Vendas', 'SB_vendas');
    const ni = pacote(b.itens, 'Arquivo_Itens', 'SB_itens_venda');
    const np = pacote(b.pagamentos, 'Arquivo_Pagamentos', 'SB_pagamentos_venda');
    const completo = ni === (b.itens || []).length && np === (b.pagamentos || []).length;
    return completo ? { ok: true, recebidas: n, celulas: sbCelulasUsadas_() } : { ok: true, recebidas: -1, message: 'A planilha não confirmou todos os itens/pagamentos (' + ni + '/' + (b.itens || []).length + ' e ' + np + '/' + (b.pagamentos || []).length + ').' };
  }
  if (b.tipo === 'caixa') {
    const n = pacote(b.caixas, 'Arquivo_Caixa', 'SB_caixa_sessoes');
    const ns = pacote(b.sangrias, 'Arquivo_Sangrias', 'SB_sangrias');
    return ns === (b.sangrias || []).length ? { ok: true, recebidas: n, celulas: sbCelulasUsadas_() } : { ok: true, recebidas: -1, message: 'A planilha não confirmou todas as sangrias (' + ns + '/' + (b.sangrias || []).length + ').' };
  }
  return { ok: false, message: 'Tipo de arquivamento desconhecido.' };
}

/* fotos. O envio usa _uploadFotoSegura (valida tipo/tamanho) e a cópia para a reserva usa a mesma
   contingência que o app já tinha (chamarContingencia_ 'guardarFoto'): nada de pasta ou conta nova. */
function sbUploadFotoSb_(b) {
  const r = _uploadFotoSegura(b.nomeBase || 'item', b.base64Data, b.mimeType, null);
  if (!r.ok) return r;
  let reserva = '';
  if (b.copiarContingencia) {
    try {
      const bytes = DriveApp.getFileById(r.fotoId).getBlob().getBytes();
      const c = chamarContingencia_('guardarFoto', { idOrigem: r.fotoId, base64: Utilities.base64Encode(bytes) });
      if (c && c.ok) reserva = c.fotoIdReserva;
    } catch (e) { /* a foto principal já está salva; a reserva é copiada depois pelo botão de sincronizar */ }
  }
  return { ok: true, fotoId: r.fotoId, fotoReservaId: reserva };
}
/* ---------- ALERTAS DO SISTEMA POR E-MAIL (18/10/2026, Fase 7.1) ----------
   O Supabase manda aqui só os alertas de falha e vencimento; o e-mail vai para a conta dona desta planilha.
   Limite próprio: no máximo 20 por dia (a cota do Gmail no Apps Script é de 100/dia). */
function sbAvisoEmail_(b) {
  const assunto = String(b.assunto || '').slice(0, 120), texto = String(b.texto || '').slice(0, 1500);
  if (!assunto) return { ok: false, message: 'Sem assunto.' };
  const props = PropertiesService.getScriptProperties(), hoje = Utilities.formatDate(new Date(), SB_FUSO_, 'yyyy-MM-dd');
  const cont = props.getProperty('AVISO_EMAIL_DIA') === hoje ? Number(props.getProperty('AVISO_EMAIL_QTD') || 0) : 0;
  if (cont >= 20) return { ok: false, message: 'Limite diário de e-mails de alerta atingido.' };
  const para = Session.getEffectiveUser().getEmail();
  if (!para) return { ok: false, message: 'Conta sem e-mail.' };
  MailApp.sendEmail(para, assunto, texto);
  props.setProperties({ AVISO_EMAIL_DIA: hoje, AVISO_EMAIL_QTD: String(cont + 1) });
  return { ok: true };
}
/* ---------- COMPROVANTES DAS NOTAS DE COMPRA (18/10/2026) ----------
   Mesmo caminho das fotos (Edge Function -> esta planilha -> Drive), mas os arquivos ficam PRIVADOS (sem link público):
   só a Edge Function nota-anexo (Admin) lê, devolvendo o conteúdo. destino: 'principal', 'contingencia' ou 'ambos'. */
const NOTA_MAX_BYTES_ = 3 * 1024 * 1024;
function obterPastaNotas_() {
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('PASTA_NOTAS_ID');
  if (folderId) { try { return DriveApp.getFolderById(folderId); } catch (e) { /* pasta apagada, recria abaixo */ } }
  const raiz = DriveApp.getRootFolder();
  const existentes = raiz.getFoldersByName('Restaurante - Notas de compra');
  const pasta = existentes.hasNext() ? existentes.next() : raiz.createFolder('Restaurante - Notas de compra');
  props.setProperty('PASTA_NOTAS_ID', pasta.getId());
  return pasta;
}
function tipoNota_(b) {
  const u8 = function (k) { return (b[k] + 256) % 256; };
  if (u8(0) === 0xFF && u8(1) === 0xD8 && u8(2) === 0xFF) return { tipo: 'image/jpeg', ext: '.jpg' };
  if (u8(0) === 0x89 && u8(1) === 0x50 && u8(2) === 0x4E && u8(3) === 0x47) return { tipo: 'image/png', ext: '.png' };
  if (u8(0) === 0x52 && u8(1) === 0x49 && u8(2) === 0x46 && u8(3) === 0x46 && u8(8) === 0x57 && u8(9) === 0x45 && u8(10) === 0x42 && u8(11) === 0x50) return { tipo: 'image/webp', ext: '.webp' };
  if (u8(0) === 0x25 && u8(1) === 0x50 && u8(2) === 0x44 && u8(3) === 0x46) return { tipo: 'application/pdf', ext: '.pdf' };
  return null;
}
function notaNaPasta_(arq) {
  const pastaId = obterPastaNotas_().getId(), it = arq.getParents();
  while (it.hasNext()) if (it.next().getId() === pastaId) return true;
  return false;
}
function sbGuardarNota_(b) {
  const destino = String(b.destino || 'ambos');
  if (['principal', 'contingencia', 'ambos'].indexOf(destino) === -1) return { ok: false, message: 'Destino inválido.' };
  const dados = String(b.base64Data || ''); if (!dados) return { ok: false, message: 'Nenhum arquivo recebido.' };
  const limpo = dados.indexOf(',') >= 0 ? dados.split(',').pop() : dados;
  const bytes = Utilities.base64Decode(limpo);
  if (bytes.length > NOTA_MAX_BYTES_) return { ok: false, message: 'Arquivo grande demais (máximo 3 MB).' };
  const t = tipoNota_(bytes);
  if (!t) return { ok: false, message: 'Use foto (JPG, PNG, WEBP) ou PDF.' };
  const nome = nomeArquivoSeguro_(b.nomeBase || 'nota') + '-' + Utilities.getUuid().slice(0, 8) + t.ext;
  let id = '', reserva = '', avisoReserva = '';
  if (destino !== 'contingencia') id = obterPastaNotas_().createFile(Utilities.newBlob(bytes, t.tipo, nome)).getId(); // sem setSharing: fica privado
  if (destino !== 'principal') {
    try {
      const c = chamarContingencia_('guardarNota', { nome: nome, base64: Utilities.base64Encode(bytes) });
      if (c && c.ok) reserva = c.id; else avisoReserva = (c && c.message) || 'A contingência não respondeu.';
    } catch (e) { avisoReserva = String(e && e.message || e).slice(0, 200); }
    if (!reserva && !id) return { ok: false, message: 'Não consegui salvar no Drive da contingência: ' + avisoReserva + ' (atualize e republique o script da contingência, ou escolha o Drive principal).' };
  }
  return { ok: true, id: id, idReserva: reserva, tipo: t.tipo, avisoReserva: avisoReserva };
}
function sbLerNota_(b) {
  const id = String(b.id || ''); if (!/^[\w-]{10,80}$/.test(id)) return { ok: false, message: 'Arquivo inválido.' };
  if (b.onde === 'contingencia') return chamarContingencia_('lerNota', { id: id });
  let arq; try { arq = DriveApp.getFileById(id); } catch (e) { return { ok: false, message: 'O comprovante não foi encontrado no Drive principal.' }; }
  if (arq.isTrashed() || !notaNaPasta_(arq)) return { ok: false, message: 'O comprovante não foi encontrado no Drive principal.' };
  const blob = arq.getBlob();
  return { ok: true, tipo: blob.getContentType(), nome: arq.getName(), base64: Utilities.base64Encode(blob.getBytes()) };
}
function sbExcluirNota_(b) {
  (b.ids || []).forEach(function (id) { try { const a = DriveApp.getFileById(String(id)); if (notaNaPasta_(a)) a.setTrashed(true); } catch (e) {} });
  if ((b.idsReserva || []).length) { try { chamarContingencia_('excluirNota', { ids: b.idsReserva }); } catch (e) {} }
  return { ok: true };
}
/* ---------- FOTOS DA BATIDA DO PONTO (18/10/2026) ----------
   Selfie tirada na entrada/saída. Arquivos PRIVADOS (sem link público), pasta própria, só JPEG de até 1,5 MB.
   Ficam 45 dias: a limpeza diária (Edge Function ponto-foto, ação "limpar") manda apagar aqui e na contingência. */
const PONTO_MAX_BYTES_ = 1536 * 1024;
function obterPastaPonto_() {
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('PASTA_PONTO_ID');
  if (folderId) { try { return DriveApp.getFolderById(folderId); } catch (e) { /* pasta apagada, recria abaixo */ } }
  const raiz = DriveApp.getRootFolder();
  const existentes = raiz.getFoldersByName('Restaurante - Fotos do ponto');
  const pasta = existentes.hasNext() ? existentes.next() : raiz.createFolder('Restaurante - Fotos do ponto');
  props.setProperty('PASTA_PONTO_ID', pasta.getId());
  return pasta;
}
function pontoNaPasta_(arq) {
  const pastaId = obterPastaPonto_().getId(), it = arq.getParents();
  while (it.hasNext()) if (it.next().getId() === pastaId) return true;
  return false;
}
function sbGuardarPonto_(b) {
  const destino = String(b.destino || 'ambos');
  if (['principal', 'contingencia', 'ambos'].indexOf(destino) === -1) return { ok: false, message: 'Destino inválido.' };
  const dados = String(b.base64Data || ''); if (!dados) return { ok: false, message: 'Nenhuma foto recebida.' };
  const limpo = dados.indexOf(',') >= 0 ? dados.split(',').pop() : dados;
  const bytes = Utilities.base64Decode(limpo);
  if (bytes.length > PONTO_MAX_BYTES_) return { ok: false, message: 'Foto grande demais (máximo 1,5 MB).' };
  const u8 = function (k) { return (bytes[k] + 256) % 256; };
  if (!(u8(0) === 0xFF && u8(1) === 0xD8 && u8(2) === 0xFF)) return { ok: false, message: 'A foto precisa ser JPEG.' };
  const nome = nomeArquivoSeguro_(b.nomeBase || 'ponto') + '-' + Utilities.getUuid().slice(0, 8) + '.jpg';
  let id = '', reserva = '', avisoReserva = '';
  if (destino !== 'contingencia') id = obterPastaPonto_().createFile(Utilities.newBlob(bytes, 'image/jpeg', nome)).getId(); // sem setSharing: fica privado
  if (destino !== 'principal') {
    try {
      const c = chamarContingencia_('guardarPonto', { nome: nome, base64: Utilities.base64Encode(bytes) });
      if (c && c.ok) reserva = c.id; else avisoReserva = (c && c.message) || 'A contingência não respondeu.';
    } catch (e) { avisoReserva = String(e && e.message || e).slice(0, 200); }
    if (!reserva && !id) return { ok: false, message: 'Não consegui salvar no Drive da contingência: ' + avisoReserva + ' (atualize e republique o script da contingência, ou escolha o Drive principal).' };
  }
  return { ok: true, id: id, idReserva: reserva, avisoReserva: avisoReserva };
}
function sbLerPonto_(b) {
  const id = String(b.id || ''); if (!/^[\w-]{10,80}$/.test(id)) return { ok: false, message: 'Arquivo inválido.' };
  if (b.onde === 'contingencia') return chamarContingencia_('lerPonto', { id: id });
  let arq; try { arq = DriveApp.getFileById(id); } catch (e) { return { ok: false, message: 'A foto não foi encontrada no Drive principal.' }; }
  if (arq.isTrashed() || !pontoNaPasta_(arq)) return { ok: false, message: 'A foto não foi encontrada no Drive principal.' };
  const blob = arq.getBlob();
  return { ok: true, tipo: blob.getContentType(), nome: arq.getName(), base64: Utilities.base64Encode(blob.getBytes()) };
}
function sbExcluirPonto_(b) {
  let n = 0;
  (b.ids || []).forEach(function (id) { try { const a = DriveApp.getFileById(String(id)); if (pontoNaPasta_(a)) { a.setTrashed(true); n++; } } catch (e) {} });
  if ((b.idsReserva || []).length) { try { chamarContingencia_('excluirPonto', { ids: b.idsReserva }); } catch (e) {} }
  return { ok: true, apagadas: n };
}
function sbExcluirFotoSb_(ids) {
  (ids || []).forEach(function (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) { /* já não existe */ } });
  return { ok: true };
}
function sbReplicarFotos_(itens) {
  const inicio = Date.now(), resultados = [], falhas = [];
  (itens || []).forEach(function (p) {
    if (Date.now() - inicio > 200000 || !p.foto_id_principal) return;
    try {
      const bytes = DriveApp.getFileById(p.foto_id_principal).getBlob().getBytes();
      if (bytes.length > 5 * 1024 * 1024) { falhas.push(p.id + ': maior que 5 MB'); return; }
      const c = chamarContingencia_('guardarFoto', { idOrigem: p.foto_id_principal, base64: Utilities.base64Encode(bytes) });
      if (c && c.ok) resultados.push({ tipo: p.tipo, id: p.id, foto_id_contingencia: c.fotoIdReserva });
      else falhas.push(p.id + ': ' + ((c && c.message) || 'recusada'));
    } catch (e) { falhas.push(p.id + ': ' + e.message); }
  });
  return { ok: true, resultados: resultados, falhas: falhas, message: falhas.length ? falhas.length + ' foto(s) não copiadas.' : '' };
}

/* vendas confirmadas do dia (horário de Brasília) no espelho. data = 'yyyy-MM-dd'.
   OTIMIZADO: lê só as colunas status e data_hora, de baixo para cima, e para quando passa dos dias que interessam
   (antes lia a aba inteira, todas as colunas). Sem trava: é só leitura. */
function sbContarVendasHoje_(data) {
  const a = sbAbaCab_('SB_vendas');
  if (!a) return { ok: true, total: 0 };
  const iS = a.cab.indexOf('status'), iD = a.cab.indexOf('data_hora');
  if (iS < 0 || iD < 0) return { ok: false, message: 'Colunas status/data_hora não encontradas em SB_vendas.' };
  const corte = Date.parse(String(data) + 'T00:00:00Z') - 3 * 86400000;   // folga de 3 dias: cobre fuso e linhas fora de ordem
  const BLOCO = 1000; let total = 0, fim = a.ultima;
  while (fim >= 2) {
    const ini = Math.max(2, fim - BLOCO + 1), n = fim - ini + 1;
    const st = a.sh.getRange(ini, iS + 1, n, 1).getValues(), dh = a.sh.getRange(ini, iD + 1, n, 1).getValues();
    let todasAntigas = true;
    for (let k = 0; k < n; k++) {
      const d = (dh[k][0] instanceof Date) ? dh[k][0] : new Date(String(dh[k][0]));
      if (isNaN(d.getTime())) { todasAntigas = false; continue; }
      if (d.getTime() >= corte) todasAntigas = false;
      if (String(st[k][0]) === 'Confirmada' && Utilities.formatDate(d, SB_FUSO_, 'yyyy-MM-dd') === data) total++;
    }
    if (todasAntigas) break;
    fim = ini - 1;
  }
  return { ok: true, total: total };
}


/* ============================================================================
   RESTAURANTE — CONTINGÊNCIA E ARMAZENAMENTO
   (Já faz parte deste arquivo.)
   O espelho da contingência agora é montado a partir das abas SB_<tabela> (o que o Supabase envia),
   e não mais das abas antigas (Produtos, Clientes…), que deixaram de ser atualizadas.
   Chamadas só pela Edge Function "planilha-admin" (chave do servidor); as chaves da contingência
   continuam só nas Propriedades do script.
   ============================================================================ */
function sbLerAba_(nome) {
  const sh = abaPorNome_(nome);
  if (!sh || sh.getLastRow() < 2 || sh.getLastColumn() < 2) return [];
  const cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  return sh.getRange(2, 1, sh.getLastRow() - 1, cab.length).getValues().map(function (r) {
    const o = {}; for (let i = 1; i < cab.length; i++) if (cab[i]) o[cab[i]] = r[i]; return o;
  }).filter(function (o) { return o.id !== undefined && String(o.id) !== ''; });
}
function sbJson_(v, padrao) { if (v && typeof v === 'object') return v; try { const o = JSON.parse(String(v || '').replace(/^'/, '')); return o === null ? padrao : o; } catch (e) { return padrao; } }
function sbBool_(v) { return v === true || String(v).toLowerCase() === 'true'; }
function sbNum_(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function sbUrlFoto_(id) { return id ? ('https://drive.google.com/uc?export=view&id=' + id) : ''; }

/* Copia para a contingência só as fotos que ela ainda não tem (ids vêm de SB_produtos / SB_combos). */
function sbSincronizarFotosContingencia_(prods, combos, limiteMs) {
  const inicio = Date.now();
  const res = { mapa: {}, enviadas: 0, faltam: 0, falhas: [], removidas: 0, totalFotos: 0 };
  const ids = {};
  prods.forEach(function (p) { if (p.foto_id_principal) ids[p.foto_id_principal] = true; });
  combos.forEach(function (c) { if (c.foto_id_principal) ids[c.foto_id_principal] = true; });
  const lista = Object.keys(ids); res.totalFotos = lista.length;
  const l = chamarContingencia_('listarFotos');
  if (!l || !l.ok) { res.falhas.push((l && l.message) || 'listarFotos falhou'); return res; }
  res.mapa = l.fotos || {};
  const faltando = lista.filter(function (id) { return !res.mapa[id]; });
  for (let i = 0; i < faltando.length; i++) {
    if (Date.now() - inicio > limiteMs) { res.faltam = faltando.length - i; break; }
    const id = faltando[i];
    try {
      const bytes = DriveApp.getFileById(id).getBlob().getBytes();
      if (bytes.length > 5 * 1024 * 1024) { res.falhas.push(id + ': maior que 5 MB'); continue; }
      const r = chamarContingencia_('guardarFoto', { idOrigem: id, base64: Utilities.base64Encode(bytes) });
      if (r && r.ok) { res.mapa[id] = r.fotoIdReserva; res.enviadas++; } else res.falhas.push(id + ': ' + ((r && r.message) || 'recusada'));
    } catch (e) { res.falhas.push(id + ': ' + e.message); }
  }
  if (!res.faltam && !res.falhas.length && lista.length) { // só limpa fotos órfãs (de produtos que mudaram de foto ou foram removidos) quando tudo está em dia
    try { const rm = chamarContingencia_('removerFotosOrfas', { ids: lista }); if (rm && rm.ok) res.removidas = rm.removidas || 0; } catch (e) {}
  }
  return res;
}

/* Monta o mesmo "espelho" que a contingência sempre recebeu (formato idêntico ao antigo), agora lendo as abas SB_. */
function sbSincronizarContingencia_(rapido) {
  /* espelho INCREMENTAL. No modo rápido (a cada ~10 min) só relê e reenvia o que mudou desde o último envio
     (as marcas por aba vêm de sbUpsert_). A "reserva" (pedidos em andamento) é sempre refeita: lê só o final das abas de vendas.
     Sincronização manual e a diária das 3h continuam COMPLETAS (rede de segurança contra qualquer diferença). */
  const stamps = sbLerStamps_(), sigAnt = sbLerAssinaturasEspelho_();
  let sigPub = sbAssinatura_(SB_ABAS_ESPELHO_PUBLICO_, stamps), sigInt = sbAssinatura_(SB_ABAS_ESPELHO_INTERNO_, stamps);
  let mapaFotosRapido = null;
  if (rapido === true) { try { const lf0 = chamarContingencia_('listarFotos'); if (lf0 && lf0.ok) mapaFotosRapido = lf0.fotos || {}; } catch (e0) {} }
  // rápido sem conseguir listar as fotos da contingência: não reenvia o público (evitaria apagar os ids das fotos de reserva)
  const precisaPublico = rapido !== true ? true : (!!mapaFotosRapido && (!sigAnt.publico || sigAnt.publico !== (sigPub + '|' + sbHashMapa_(mapaFotosRapido))));
  const precisaInterno = rapido !== true || !sigAnt.interno || sigAnt.interno !== sigInt;
  const cat = precisaPublico ? sbLerAba_('SB_categorias') : [], prods = precisaPublico ? sbLerAba_('SB_produtos') : [], combos = precisaPublico ? sbLerAba_('SB_combos') : [];
  if (precisaPublico && !prods.length && !combos.length) return { ok: false, message: 'As abas SB_produtos/SB_combos estão vazias: a sincronização com o Supabase ainda não chegou aqui. Rode "Sincronizar agora" e tente de novo.' };
  let fotos = { mapa: {}, enviadas: 0, faltam: 0, falhas: [], totalFotos: 0 };
  try {
    if (rapido) { if (mapaFotosRapido) fotos.mapa = mapaFotosRapido; }   // espelho rápido (a cada ~10 min): só reaproveita as fotos que a contingência já tem
    else fotos = sbSincronizarFotosContingencia_(prods, combos, 20000);
  } catch (eF) { registrarLog('Falha ao copiar fotos para a contingência', '', eF.message); }
  const reserva = function (id) { return (id && fotos.mapa[id]) || ''; };
  const cfg = {}; if (precisaPublico) sbLerAba_('SB_sistema').forEach(function (r) { cfg[String(r.chave)] = r.valor; });
  const txt = function (k, pad) { const v = cfg[k]; return (v === undefined || v === null || v === '') ? pad : String(v); };
  const formas = (precisaPublico || precisaInterno ? sbLerAba_('SB_formas_pagamento') : []).map(function (f, i) {
    return { id: f.id, nome: f.nome, ativa: sbBool_(f.ativa), visivelCardapio: sbBool_(f.visivel_cardapio), taxaPct: sbNum_(f.taxa_percentual), taxaFixa: sbNum_(f.taxa_fixa),
             prazoDias: sbNum_(f.prazo_dias), permiteTroco: sbBool_(f.permite_troco), ordem: sbNum_(f.ordem) || (i + 1),
             acrescimoPct: sbNum_(f.acrescimo_percentual), acrescimoFixo: sbNum_(f.acrescimo_fixo) };
  }).sort(function (a, b) { return a.ordem - b.ordem; });
  const dados = {};
  if (precisaPublico) dados.publico = {
      categorias: cat.map(function (c) { return { id: c.id, nome: c.nome, ativa: sbBool_(c.ativa), ordem: sbNum_(c.ordem) }; }).sort(function (a, b) { return a.ordem - b.ordem; }),
      produtos: prods.map(function (p) { return { id: p.id, nome: p.nome, descricao: p.descricao || '', categoria: p.categoria_id || '', ativo: sbBool_(p.ativo), fotoUrl: sbUrlFoto_(p.foto_id_principal), fotoReservaId: reserva(p.foto_id_principal), destaque: sbBool_(p.destaque), ordemCardapio: sbNum_(p.ordem_cardapio) }; }),
      produtoPrecos: sbLerAba_('SB_produto_precos').map(function (x) { return { produtoId: x.produto_id, formaPagamentoId: x.forma_pagamento_id, preco: sbNum_(x.preco) }; }),
      combos: combos.map(function (c) { return { id: c.id, nome: c.nome, categoria: c.categoria_id || '', ativo: sbBool_(c.ativo), fotoUrl: sbUrlFoto_(c.foto_id_principal), fotoReservaId: reserva(c.foto_id_principal), destaque: sbBool_(c.destaque), ordemCardapio: sbNum_(c.ordem_cardapio) }; }),
      comboPrecos: sbLerAba_('SB_combo_precos').map(function (x) { return { comboId: x.combo_id, formaPagamentoId: x.forma_pagamento_id, preco: sbNum_(x.preco) }; }),
      adicionais: sbLerAba_('SB_adicionais').map(function (a) { return { id: a.id, nome: a.nome, preco: sbNum_(a.preco), ativo: sbBool_(a.ativo) }; }),
      produtoAdicionais: sbLerAba_('SB_produto_adicionais').map(function (x) { return { id: x.id, produtoId: x.produto_id, adicionalId: x.adicional_id }; }),
      comboItens: sbLerAba_('SB_combo_itens').map(function (x) { return { comboId: x.combo_id, produtoId: x.produto_id }; }),
      formasPagamento: formas.map(function (f) { return { id: f.id, nome: f.nome, ativa: f.ativa, visivelCardapio: f.visivelCardapio, permiteTroco: f.permiteTroco, ordem: f.ordem, acrescimoPct: f.acrescimoPct, acrescimoFixo: f.acrescimoFixo }; }),
      configCardapio: { kicker: txt('CardapioKicker', 'DELIVERY · SABOR QUE CONQUISTA'), frase: txt('CardapioFrase', 'Peça pelo cardápio — rápido, sem complicação.'),
        tempoEntrega: txt('CardapioTempoEntrega', '40-60 min'), tempoRetirada: txt('CardapioTempoRetirada', '20-30 min'), tempoMesa: txt('CardapioTempoMesa', '20-30 min'),
        taxaEntrega: sbNum_(cfg['TaxaEntregaPadrao']),
        fechamento: { manual: sbJson_(cfg['CardapioFechadoManual'], null), periodos: sbJson_(cfg['CardapioPeriodosFechado'], []) },
        restaurante: { nome: txt('RestauranteNome', ''), endereco: txt('RestauranteEndereco', ''), telefone: txt('RestauranteTelefone', ''), horario: txt('RestauranteHorario', ''), redes: txt('RestauranteRedes', '') } }
  };
  if (precisaInterno) dados.interno = {
      clientes: sbLerAba_('SB_clientes').map(function (c) { return { id: c.id, nome: c.nome, telefone: c.telefone }; }),
      formasPagamentoCompleto: formas
  };
  // Reserva de leitura: pedidos em andamento (sem telefone, endereço nem pagamento)
  // OTIMIZAÇÃO: no modo rápido, só relê as abas de vendas se algo mudou nelas desde o último envio (ou se passaram 25 min, para o espelho não parecer parado).
  const sigRes = sbAssinatura_(['SB_vendas', 'SB_itens_venda'], stamps);
  const reservaParada = rapido === true && sigAnt.reserva === sigRes && (Date.now() - (Number(sigAnt.reservaEm) || 0)) < 25 * 60000;
  if (!reservaParada) try {
    const ATIVOS = { 'Recebido': 1, 'Em preparo': 1, 'Pronta': 1, 'Saiu para entrega': 1 };
    const vs = sbLerAbaUltimas_('SB_vendas', 500).filter(function (v) { return v.status === 'Confirmada' && ATIVOS[v.status_pedido]; });
    const idv = {}; vs.forEach(function (v) { idv[String(v.id)] = true; });
    const porVenda = {};
    sbLerAbaUltimas_('SB_itens_venda', 4000).forEach(function (i) { if (idv[String(i.venda_id)]) (porVenda[String(i.venda_id)] = porVenda[String(i.venda_id)] || []).push({ descricao: String(i.descricao || ''), quantidade: sbNum_(i.quantidade) }); });
    dados.reserva = { geradoEm: new Date().toISOString(), pedidos: vs.map(function (v) {
      return { numero: sbNum_(v.numero_pedido), em: (v.data_hora instanceof Date) ? v.data_hora.toISOString() : String(v.data_hora || ''), cliente: String(v.cliente_nome || ''), tipo: String(v.tipo || ''),
               statusPedido: String(v.status_pedido || ''), obs: String(v.observacoes_entrega || ''), itens: porVenda[String(v.id)] || [], total: sbNum_(v.valor_total) };
    }).sort(function (a, b) { return a.numero - b.numero; }).slice(-60) };
  } catch (eR) { registrarLog('Falha ao montar a reserva de leitura', '', eR.message); }
  // A contingência agora divide o espelho em vários pedaços (até ~3 milhões de caracteres): NÃO se corta mais a lista de clientes em silêncio.
  // Só em caso extremo (acima de 3 milhões) corta, e isso fica registrado no log e na resposta.
  let cortouClientes = false;
  while (dados.interno && JSON.stringify(dados.interno).length > 3000000 && dados.interno.clientes.length > 50) { dados.interno.clientes = dados.interno.clientes.slice(0, Math.floor(dados.interno.clientes.length * 0.9)); cortouClientes = true; }
  if (cortouClientes) registrarLog('Espelho da contingência cortou a lista de clientes', '', 'O espelho passou de 3 milhões de caracteres; os clientes mais recentes ficaram de fora.');
  try {
    if (!Object.keys(dados).length) return { ok: true, message: 'Nada para enviar agora.' };
    const r = chamarContingencia_('atualizarEspelho', { dados: dados });
    if (r && r.ok) {   // guarda "o que a contingência já tem" para o próximo envio rápido saltar o que não mudou
      const novaSig = { publico: sigAnt.publico || '', interno: sigAnt.interno || '' };
      if (dados.publico) novaSig.publico = sigPub + '|' + sbHashMapa_(fotos.mapa || {});
      if (dados.interno) novaSig.interno = sigInt;
      if (dados.reserva) { novaSig.reserva = sigRes; novaSig.reservaEm = Date.now(); } else { novaSig.reserva = sigAnt.reserva || ''; novaSig.reservaEm = sigAnt.reservaEm || 0; }
      sbGravarAssinaturasEspelho_(novaSig);
    }
    const nota = (rapido === true ? ' Modo rápido: enviado só o que mudou (' + Object.keys(dados).join(', ') + ').' : '') + ' Fotos: ' + fotos.enviadas + ' copiada(s) agora' + (fotos.faltam ? ', faltam ' + fotos.faltam + ' (sincronize de novo)' : '') + (fotos.falhas.length ? ', ' + fotos.falhas.length + ' com falha (veja o Log)' : '') + '.';
    if (r) r.message = ((r.message || '') + nota + (cortouClientes ? ' Atenção: a lista de clientes do espelho foi reduzida por tamanho.' : '')).trim();
    if (fotos.falhas.length) registrarLog('Fotos que não foram para a contingência', '', fotos.falhas.slice(0, 5).join(' | '));
    registrarLog('Contingência sincronizada (a partir do Supabase)', '', (r && r.message) || '');
    return r;
  } catch (e) {
    registrarLog('Falha ao sincronizar contingência', '', e.message);
    return { ok: false, message: 'Não foi possível falar com a API de contingência: ' + e.message };
  }
}
const SB_ABAS_ESPELHO_PUBLICO_ = ['SB_categorias', 'SB_produtos', 'SB_combos', 'SB_sistema', 'SB_formas_pagamento', 'SB_produto_precos', 'SB_combo_precos', 'SB_adicionais', 'SB_produto_adicionais', 'SB_combo_itens'];
const SB_ABAS_ESPELHO_INTERNO_ = ['SB_clientes', 'SB_formas_pagamento'];
function sbAssinatura_(abas, stamps) { return abas.map(function (a) { return String(stamps[a] || 0); }).join('.'); }
function sbHashMapa_(mapa) {
  const ks = Object.keys(mapa || {}).sort(), txt = ks.map(function (k) { return k + '=' + mapa[k]; }).join('|');
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, txt).map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function sbLerAssinaturasEspelho_() { try { return JSON.parse(PropertiesService.getScriptProperties().getProperty('SB_ESPELHO_SIG') || '{}') || {}; } catch (e) { return {}; } }
function sbGravarAssinaturasEspelho_(o) { try { PropertiesService.getScriptProperties().setProperty('SB_ESPELHO_SIG', JSON.stringify(o)); } catch (e) {} }
/* Impede dois espelhos ao mesmo tempo (manual + automático) SEM usar a trava das gravações: o envio de vendas nunca espera o espelho. */
function sbSincronizarContingenciaGuardada_(rapido) {
  const cache = CacheService.getScriptCache();
  if (cache.get('sb_espelho_rodando')) return { ok: false, message: 'Já há uma sincronização do espelho em andamento. Aguarde alguns segundos.' };
  cache.put('sb_espelho_rodando', '1', 120);
  try { return sbSincronizarContingencia_(rapido); } finally { try { cache.remove('sb_espelho_rodando'); } catch (e) {} }
}

function sbChaveContingencia_() {
  try { return { ok: true, chave: chaveContingencia_('CONTINGENCIA_CHAVE_INTERNA') }; }
  catch (e) { return { ok: false, message: 'Contingência sem chave configurada.' }; }
}
function sbListarPendentesContingencia_() {
  try { const r = chamarContingencia_('listarPendentes'); return (r && r.ok) ? { ok: true, pendentes: r.pendentes || [] } : { ok: false, message: (r && r.message) || 'A contingência recusou a chamada.' }; }
  catch (e) { return { ok: false, message: 'Não foi possível falar com a contingência: ' + e.message }; }
}
function sbMarcarSincronizadoContingencia_(ids) {
  let n = 0; const falhas = [];
  (ids || []).slice(0, 100).forEach(function (id) {
    try { const r = chamarContingencia_('marcarSincronizado', { id: String(id) }); if (r && r.ok) n++; else falhas.push(String(id)); } catch (e) { falhas.push(String(id)); }
  });
  return { ok: true, marcadas: n, falhas: falhas };
}

/* Espaço do Google Drive desta conta (mesmo formato de antes), classificando as fotos pelas abas SB_. */
function sbObterArmazenamento_() {
  const arm = obterArmazenamentoDrive_();
  const cats = { 'Imagens de produtos': { qtd: 0, bytes: 0 }, 'Imagens de combos': { qtd: 0, bytes: 0 }, 'Outras imagens': { qtd: 0, bytes: 0 },
                 'Arquivos de backup': { qtd: 0, bytes: 0 }, 'Arquivos do sistema': { qtd: 1, bytes: 0 } };
  const fp = {}, fc = {};
  sbLerColuna_('SB_produtos', 'foto_id_principal').forEach(function (v) { if (v) fp[v] = true; });   // só a coluna da foto (antes lia a aba inteira)
  sbLerColuna_('SB_combos', 'foto_id_principal').forEach(function (v) { if (v) fc[v] = true; });
  const arquivos = [];
  const varrer = function (pasta, catFn, limite) {
    const it = pasta.getFiles(); let n = 0;
    while (it.hasNext() && n++ < limite) {
      const f = it.next(), c = catFn(f), b = f.getSize();
      cats[c].qtd++; cats[c].bytes += b;
      arquivos.push({ nome: f.getName(), categoria: c, tamanho: b, criadoEm: f.getDateCreated().toISOString() });
    }
  };
  try { varrer(obterPastaFotos_(), function (f) { return fp[f.getId()] ? 'Imagens de produtos' : fc[f.getId()] ? 'Imagens de combos' : 'Outras imagens'; }, 500); } catch (e) {}
  try { varrer(obterPastaBackups_(), function () { return 'Arquivos de backup'; }, 200); } catch (e) {}
  try { const ssf = DriveApp.getFileById(ssAtiva_().getId()); cats['Arquivos do sistema'].bytes = tamanhoAproximadoPlanilha_(ssf.getId()) || ssf.getSize();
        arquivos.push({ nome: ssf.getName() + ' (planilha principal)', categoria: 'Arquivos do sistema', tamanho: cats['Arquivos do sistema'].bytes, criadoEm: ssf.getDateCreated().toISOString() }); } catch (e) {}
  arquivos.sort(function (a, b) { return b.tamanho - a.tamanho; });
  return { ok: true, drive: arm, categorias: cats, arquivos: arquivos.slice(0, 30), totalArquivos: arquivos.length };
}


/* ============================================================================
   MESES ARQUIVADOS NOS RELATÓRIOS
   Devolve as vendas (com itens e pagamentos) de um mês que já saiu do Supabase e está nas abas Arquivo_*.
   Chamado pela Edge Function "planilha-admin" (acao arquivoVendas). Só leitura.
   ============================================================================ */
/* Leitura enxuta das abas Arquivo_*: lê só UMA coluna para achar as linhas que interessam e depois só essas linhas
   (em blocos). Antes lia a aba inteira, em todas as colunas, a cada mês pedido. O resultado é o mesmo de sbLerAba_ + filter. */
function sbAbaCab_(nome) {
  const sh = abaPorNome_(nome);
  if (!sh || sh.getLastRow() < 2 || sh.getLastColumn() < 2) return null;
  return { sh: sh, cab: sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String), ultima: sh.getLastRow() };
}
function sbLinhasOnde_(a, col, pred) {
  const ci = a.cab.indexOf(col); if (ci < 0) return [];
  const vals = a.sh.getRange(2, ci + 1, a.ultima - 1, 1).getValues(), out = [];
  for (let i = 0; i < vals.length; i++) if (pred(vals[i][0])) out.push(i + 2);
  return out;
}
/* Agrupa linhas (em ordem crescente) em blocos de leitura; linhas a até "folga" de distância ficam no mesmo bloco. */
function sbBlocos_(linhas, folga) {
  const blocos = []; let ini = linhas[0], fim = linhas[0];
  for (let k = 1; k < linhas.length; k++) { if (linhas[k] - fim <= folga) fim = linhas[k]; else { blocos.push([ini, fim]); ini = fim = linhas[k]; } }
  blocos.push([ini, fim]);
  return blocos;
}
/* OTIMIZAÇÃO: cada bloco é UMA chamada à planilha. Se as linhas estão espalhadas (muitos blocos), a folga aumenta até caber em ~20 chamadas:
   ler algumas linhas a mais custa menos do que dezenas de chamadas. Só as linhas pedidas saem no resultado (igual a antes). */
function sbLerLinhas_(a, linhas) {
  if (!linhas.length) return [];
  let folga = 25, blocos = sbBlocos_(linhas, folga);
  while (blocos.length > 20 && folga < 4000) { folga *= 4; blocos = sbBlocos_(linhas, folga); }
  const quer = {}; linhas.forEach(function (l) { quer[l] = true; });
  const out = [];
  blocos.forEach(function (b) {
    a.sh.getRange(b[0], 1, b[1] - b[0] + 1, a.cab.length).getValues().forEach(function (r, idx) {
      if (!quer[b[0] + idx]) return;
      const o = {}; for (let i = 1; i < a.cab.length; i++) if (a.cab[i]) o[a.cab[i]] = r[i];
      if (o.id !== undefined && String(o.id) !== '') out.push(o);
    });
  });
  return out;
}
function sbLerAbaOnde_(nome, col, pred) { const a = sbAbaCab_(nome); return a ? sbLerLinhas_(a, sbLinhasOnde_(a, col, pred)) : []; }

function sbLerColuna_(nome, col) {
  const a = sbAbaCab_(nome); if (!a) return [];
  const ci = a.cab.indexOf(col); if (ci < 0) return [];
  return a.sh.getRange(2, ci + 1, a.ultima - 1, 1).getValues().map(function (r) { return r[0]; });
}
function sbMs_(v) { return (v instanceof Date) ? v.getTime() : Date.parse(String(v)); }
/* ============================================================================
   CACHE COMPRIMIDO DO ARQUIVO (leitura)
   Antes: o resultado era guardado em partes de 30 mil caracteres, no máximo 30 partes (~900 mil caracteres) e só por 30 min:
   um mês movimentado nunca cabia e era relido da planilha a cada pedido. Agora o texto é comprimido (gzip) e guardado por 2 h.
   A chave leva a marca de alteração + o nº de linhas de cada aba: se o Supabase arquivar mais linhas (ou alguém apagar/inserir linhas),
   o cache antigo deixa de valer sozinho. Para forçar a releitura na hora: rode "limparCacheArquivo" no editor.
   ============================================================================ */
const SB_TTL_ARQ_ = 7200;
function limparCacheArquivo() { PropertiesService.getScriptProperties().setProperty('ARQ_CACHE_VER', String(Date.now())); return 'Cache do arquivo renovado: a próxima leitura vem direto da planilha.'; }
function sbAssinaturaArq_(abas) {
  const props = PropertiesService.getScriptProperties().getProperties();
  let st = {}; try { st = JSON.parse(props.SB_STAMPS || '{}') || {}; } catch (e) { st = {}; }
  return String(props.ARQ_CACHE_VER || '0') + '.' + abas.map(function (a) { const sh = abaPorNome_(a); return String(st[a] || 0) + '/' + (sh ? sh.getLastRow() : 0); }).join('.');
}
function sbCachePut_(cache, chave, texto, seg) {
  const b64 = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(texto, 'application/json', 'arq.json')).getBytes());
  const T = 90000, n = Math.ceil(b64.length / T);
  if (n < 1 || n > 40) return false;   // muito grande até comprimido: não guarda (a leitura segue normal, só sem o atalho)
  const obj = {}; obj[chave + '|n'] = String(n);
  for (let i = 0; i < n; i++) obj[chave + '|' + i] = b64.slice(i * T, (i + 1) * T);
  cache.putAll(obj, seg);
  return true;
}
function sbCacheGet_(cache, chave) {
  const n = Number(cache.get(chave + '|n') || 0);
  if (!(n > 0)) return null;
  const chaves = []; for (let i = 0; i < n; i++) chaves.push(chave + '|' + i);
  const got = cache.getAll(chaves), partes = [];
  for (let i = 0; i < n; i++) { if (got[chaves[i]] == null) return null; partes.push(got[chaves[i]]); }
  return Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(partes.join('')), 'application/x-gzip', 'arq.gz')).getDataAsString();
}
function sbCacheArq_(chave, abas, calcular) {
  const k = 'arq3|' + chave + '|' + sbAssinaturaArq_(abas);
  let cache = null; try { cache = CacheService.getScriptCache(); } catch (e) {}
  if (cache) { try { const t = sbCacheGet_(cache, k); if (t != null) return JSON.parse(t); } catch (e) { /* cache é só acelerador */ } }
  const r = calcular();
  if (cache && r && r.ok) { try { sbCachePut_(cache, k, JSON.stringify(r), SB_TTL_ARQ_); } catch (e) { /* sem cache: segue normal */ } }
  return r;
}

/* Colunas devolvidas à página — uma lista só, usada pelo mês e pelo cliente. As colunas internas (requisicao_id, status_antes_suspensao) ficam só na planilha. */
const SB_COLS_VENDA_ = ['id','numero_pedido','data_hora','cliente_nome','telefone_cliente','forma_pagamento','valor_total','custo_total','status','motivo_cancelamento','tipo','status_pedido','endereco','complemento','referencia','observacoes_entrega','pronta_em','concluida_em','status_pagamento','recebido_em','valor_original','valor_desconto','desconto_detalhe','entregador_id','saiu_em','origem','mesa_id','taxa_entrega','fechamento_entrega_id','registrado_por','inicio_preparo_em','cliente_id','acrescimo_forma','cpf_nota','canal','caixa_id','preferencias_cliente'];
const SB_COLS_ITEM_ = ['id','venda_id','produto_id','combo_id','descricao','quantidade','valor_unitario','custo_unitario','valor_total_item','adicionais_ids'];
const SB_COLS_PAG_ = ['id','venda_id','forma_pagamento','valor','taxa_aplicada','acrescimo'];
function sbPick_(o, cols) { const r = {}; cols.forEach(function (c) { r[c] = (o[c] instanceof Date) ? o[c].toISOString() : o[c]; }); return r; }
/* adicionais_ids vai para a planilha como texto JSON ('["id1","id2"]'); a página espera uma lista. Sem esta conversão, os adicionais dos pedidos
   arquivados sumiam do relatório de adicionais. */
function sbLista_(v) {
  if (Array.isArray(v)) return v;
  const t = String(v == null ? '' : v).replace(/^'/, '').trim();
  if (!t) return [];
  try { const o = JSON.parse(t); return Array.isArray(o) ? o : []; } catch (e) { return []; }
}
function sbItemSaida_(i) { const r = sbPick_(i, SB_COLS_ITEM_); r.adicionais_ids = sbLista_(r.adicionais_ids); return r; }

/* ÍNDICE DO ARQUIVO — em quais linhas de Arquivo_Vendas / Arquivo_Itens / Arquivo_Pagamentos está cada mês (faixas [linhaInicial, quantidade]).
   Montado lendo UMA vez as colunas id e data_hora das vendas e venda_id de itens e pagamentos; fica guardado (comprimido) com a mesma chave
   de validade do cache. Depois disso, ler qualquer mês é ler só as linhas dele — sem varrer as colunas inteiras de novo a cada mês.
   O mês é o do relógio local do projeto (o mesmo critério de antes: data >= dia 1 do mês e < dia 1 do mês seguinte). */
function sbMesLocal_(v) {
  const t = sbMs_(v); if (!isFinite(t)) return '';
  const d = new Date(t); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
}
function sbFaixaAdd_(mapa, ym, linha) {
  const r = mapa[ym] || (mapa[ym] = []), u = r[r.length - 1];
  if (u && linha === u[0] + u[1]) u[1]++; else r.push([linha, 1]);
}
function sbExpandir_(faixas) { const out = []; (faixas || []).forEach(function (f) { for (let k = 0; k < f[1]; k++) out.push(f[0] + k); }); return out; }
function sbContarFaixas_(faixas) { let n = 0; (faixas || []).forEach(function (f) { n += f[1]; }); return n; }
function sbConstruirIndiceArq_() {
  const ix = { v: {}, i: {}, p: {} }, idMes = {};
  const av = sbAbaCab_('Arquivo_Vendas');
  if (av) {
    const ci = av.cab.indexOf('id'), cd = av.cab.indexOf('data_hora');
    if (ci >= 0 && cd >= 0) {
      const ids = av.sh.getRange(2, ci + 1, av.ultima - 1, 1).getValues(), dts = av.sh.getRange(2, cd + 1, av.ultima - 1, 1).getValues();
      for (let k = 0; k < ids.length; k++) {
        const id = String(ids[k][0] == null ? '' : ids[k][0]); if (id === '') continue;   // linha sem id nunca saiu na leitura
        const ym = sbMesLocal_(dts[k][0]); if (!ym) continue;                            // data ilegível nunca entrou em mês nenhum
        idMes[id] = ym; sbFaixaAdd_(ix.v, ym, k + 2);
      }
    }
  }
  const porVenda = function (nome, saida) {
    const a = sbAbaCab_(nome); if (!a) return;
    const cv = a.cab.indexOf('venda_id'); if (cv < 0) return;
    const vals = a.sh.getRange(2, cv + 1, a.ultima - 1, 1).getValues();
    for (let k = 0; k < vals.length; k++) { const ym = idMes[String(vals[k][0])]; if (ym) sbFaixaAdd_(saida, ym, k + 2); }
  };
  porVenda('Arquivo_Itens', ix.i); porVenda('Arquivo_Pagamentos', ix.p);
  return ix;
}
function sbIndiceArq_(ignorarCache) {
  const k = 'arqidx|' + sbAssinaturaArq_(['Arquivo_Vendas', 'Arquivo_Itens', 'Arquivo_Pagamentos']);
  let cache = null; try { cache = CacheService.getScriptCache(); } catch (e) {}
  if (cache && !ignorarCache) { try { const t = sbCacheGet_(cache, k); if (t != null) return JSON.parse(t); } catch (e) {} }
  const ix = sbConstruirIndiceArq_();
  if (cache) { try { sbCachePut_(cache, k, JSON.stringify(ix), SB_TTL_ARQ_); } catch (e) {} }
  return ix;
}

function sbLerArquivo_(mes) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(mes || ''))) return { ok: false, message: 'Mês inválido.' };
  return sbCacheArq_('v|' + mes, ['Arquivo_Vendas', 'Arquivo_Itens', 'Arquivo_Pagamentos', 'Arquivo_Indice'], function () { return sbLerArquivoCalc_(mes); });
}
function sbLerArquivoCalc_(mes) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(mes || ''))) return { ok: false, message: 'Mês inválido.' };
  const lerFaixas = function (nome, faixas) { const a = (faixas && faixas.length) ? sbAbaCab_(nome) : null; return a ? sbLerLinhas_(a, sbExpandir_(faixas)) : []; };
  let res = null;
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const ix = sbIndiceArq_(tentativa > 0);   // 2ª tentativa: refaz o índice direto da planilha (não usa o guardado)
    const vendas = lerFaixas('Arquivo_Vendas', ix.v[mes]), itens = lerFaixas('Arquivo_Itens', ix.i[mes]), pags = lerFaixas('Arquivo_Pagamentos', ix.p[mes]);
    /* CONFERÊNCIA: o índice só vale se as linhas lidas são mesmo deste mês e os itens/pagamentos são dessas vendas
       (se alguém apagou ou inseriu linhas à mão, o índice guardado fica errado — aí ele é refeito e a leitura repetida). */
    const ids = {}; let bom = vendas.length === sbContarFaixas_(ix.v[mes]);
    vendas.forEach(function (v) { ids[String(v.id)] = true; if (sbMesLocal_(v.data_hora) !== mes) bom = false; });
    itens.forEach(function (i) { if (!ids[String(i.venda_id)]) bom = false; });
    pags.forEach(function (x) { if (!ids[String(x.venda_id)]) bom = false; });
    res = { ok: true, mes: mes, vendas: vendas.map(function (v) { return sbPick_(v, SB_COLS_VENDA_); }), itens: itens.map(sbItemSaida_), pagamentos: pags.map(function (x) { return sbPick_(x, SB_COLS_PAG_); }) };
    if (bom) break;
  }
  return sbJuntarVendas_(res, sbBlocosDe_('vendas', mes));   // v1.15: + o que veio do Storage em blocos
}


/* ARQUIVO POR CLIENTE — todas as vendas arquivadas de um cliente (pelo telefone em dígitos e/ou pelo id do cliente), com itens e pagamentos.
   Mesmo formato do mês arquivado (o app reaproveita o mesmo conversor). Só leitura. Chamado por "planilha-admin" (acao arquivoCliente). */
function sbContarArquivo_() { return sbCacheArq_('n', ['Arquivo_Vendas', 'Arquivo_Indice'], sbContarArquivoCalc_); }
function sbContarArquivoCalc_() {
  const a = sbAbaCab_('Arquivo_Vendas');
  const emBlocos = sbIndiceLer_().filter(function (x) { return x.tipo === 'vendas'; }).reduce(function (t, x) { return t + x.qtd; }, 0);   // v1.15: pedidos guardados em blocos
  if (!a) return { ok: true, pedidos: emBlocos, emBlocos: emBlocos };
  const ci = a.cab.indexOf('id'); if (ci < 0) return { ok: false, message: 'Aba Arquivo_Vendas sem a coluna id.' };
  const vals = a.sh.getRange(2, ci + 1, a.ultima - 1, 1).getValues(), vistos = {};
  for (let i = 0; i < vals.length; i++) { const v = String(vals[i][0] == null ? '' : vals[i][0]).replace(/^'/, ''); if (v) vistos[v] = true; }
  return { ok: true, pedidos: Object.keys(vistos).length + emBlocos, emBlocos: emBlocos };
}
function sbLerArquivoCliente_(telefone, clienteId) {
  const tel = String(telefone || '').replace(/\D/g, ''), cid = String(clienteId || '').trim();
  if (tel.length < 8 && !cid) return { ok: false, message: 'Informe o telefone ou o cliente.' };
  const dig = function (x) { return String(x == null ? '' : x).replace(/^'/, '').replace(/\D/g, ''); };
  const a = sbAbaCab_('Arquivo_Vendas');
  const doCliente = function (v) { return (tel.length >= 8 && dig(v.telefone_cliente) === tel) || (cid && String(v.cliente_id || '') === cid); };
  if (!a) return sbJuntarVendas_({ ok: true, vendas: [], itens: [], pagamentos: [] }, sbBlocosDe_('vendas'), doCliente);
  const set = {};
  if (tel.length >= 8) sbLinhasOnde_(a, 'telefone_cliente', function (x) { return dig(x) === tel; }).forEach(function (l) { set[l] = true; });
  if (cid) sbLinhasOnde_(a, 'cliente_id', function (x) { return String(x == null ? '' : x).replace(/^'/, '') === cid; }).forEach(function (l) { set[l] = true; });
  const linhas = Object.keys(set).map(Number).sort(function (x, y) { return x - y; });
  const vendas = sbLerLinhas_(a, linhas);
  const ids = {}; vendas.forEach(function (v) { ids[String(v.id)] = true; });
  const itens = sbLerAbaOnde_('Arquivo_Itens', 'venda_id', function (x) { return ids[String(x)]; }).map(sbItemSaida_);
  const pagamentos = sbLerAbaOnde_('Arquivo_Pagamentos', 'venda_id', function (x) { return ids[String(x)]; })
    .map(function (x) { return sbPick_(x, SB_COLS_PAG_); });
  return sbJuntarVendas_({ ok: true, vendas: vendas.map(function (v) { return sbPick_(v, SB_COLS_VENDA_); }), itens: itens, pagamentos: pagamentos }, sbBlocosDe_('vendas'), doCliente);
}

/* LGPD (Fase 3)  anonimiza na planilha os pedidos ARQUIVADOS de um cliente que foi anonimizado no sistema.
   Chamado pela Edge Function "arquivar-antigos" (fila anonimizar_arquivo_fila, uma vez por dia). Acha as linhas de Arquivo_Vendas pelo
   telefone (so digitos) e/ou pelo id do cliente e limpa os dados pessoais; valores, itens e datas ficam (relatorios continuam certos).
   Pode rodar de novo sem problema (idempotente). Roda dentro da trava das gravacoes. */
function sbAnonimizarArquivo_(telefone, clienteId, lista) {
  /* v1.15: aceita uma LISTA de clientes ([{telefone, clienteId}]) para abrir cada bloco e cada aba uma vez só */
  const alvos = (Array.isArray(lista) && lista.length ? lista : [{ telefone: telefone, clienteId: clienteId }])
    .map(function (x) { return { tel: String((x && x.telefone) || '').replace(/\D/g, ''), cid: String((x && x.clienteId) || '').trim() }; })
    .filter(function (x) { return x.tel.length >= 8 || x.cid; });
  if (!alvos.length) return { ok: false, message: 'Informe o telefone ou o cliente.' };
  const tels = {}, cids = {}; alvos.forEach(function (x) { if (x.tel.length >= 8) tels[x.tel] = true; if (x.cid) cids[x.cid] = true; });
  const dig = function (x) { return String(x == null ? '' : x).replace(/^'/, '').replace(/\D/g, ''); };
  const emBlocos = sbAnonimizarBlocos_(function (v) { return !!tels[dig(v.telefone_cliente)] || !!cids[String(v.cliente_id || '')]; });   // v1.15
  const a = sbAbaCab_('Arquivo_Vendas');
  if (!a) return { ok: true, anonimizadas: emBlocos };
  const set = {};
  sbLinhasOnde_(a, 'telefone_cliente', function (x) { return !!tels[dig(x)]; }).forEach(function (l) { set[l] = true; });
  sbLinhasOnde_(a, 'cliente_id', function (x) { return !!cids[String(x == null ? '' : x).replace(/^'/, '')]; }).forEach(function (l) { set[l] = true; });
  const linhas = Object.keys(set).map(Number);
  if (!linhas.length) return { ok: true, anonimizadas: emBlocos };
  const limpar = { cliente_nome: 'Cliente anonimizado', telefone_cliente: '', endereco: '', complemento: '', referencia: '', observacoes_entrega: '', cpf_nota: '', preferencias_cliente: '' };
  const faixas = sbFaixas_(linhas);
  Object.keys(limpar).forEach(function (col) {
    const ci = a.cab.indexOf(col); if (ci < 0) return;
    faixas.forEach(function (f) {
      const vals = []; for (let i = 0; i < f[1]; i++) vals.push([limpar[col]]);
      a.sh.getRange(f[0], ci + 1, f[1], 1).setValues(vals);
    });
  });
  sbMarcarAlterada_('Arquivo_Vendas');
  return { ok: true, anonimizadas: linhas.length + emBlocos };
}

/* D17 (Fase 8) — caixas fechados e sangrias de um mês arquivado (Arquivo_Caixa / Arquivo_Sangrias). Só leitura.
   Chamado pela Edge Function "planilha-admin" (acao arquivoCaixa). */
function sbLerArquivoCaixa_(mes) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(mes || ''))) return { ok: false, message: 'Mês inválido.' };
  return sbCacheArq_('c|' + mes, ['Arquivo_Caixa', 'Arquivo_Sangrias', 'Arquivo_Indice'], function () { return sbLerArquivoCaixaCalc_(mes); });
}
function sbLerArquivoCaixaCalc_(mes) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(mes || ''))) return { ok: false, message: 'Mês inválido.' };
  const a = String(mes).split('-'), ini = new Date(Number(a[0]), Number(a[1]) - 1, 1).getTime(), fim = new Date(Number(a[0]), Number(a[1]), 1).getTime();
  const lim = function (o) { const r = {}; Object.keys(o).forEach(function (k) { r[k] = (o[k] instanceof Date) ? o[k].toISOString() : o[k]; }); return r; };
  const caixas = sbLerAbaOnde_('Arquivo_Caixa', 'abertura', function (x) { const t = sbMs_(x); return t >= ini && t < fim; }).map(lim);
  const sangrias = sbLerAbaOnde_('Arquivo_Sangrias', 'data_hora', function (x) { const t = sbMs_(x); return t >= ini && t < fim; }).map(lim);
  const vc = {}, vs = {}; caixas.forEach(function (c) { vc[String(c.id)] = true; }); sangrias.forEach(function (x) { vs[String(x.id)] = true; });
  sbBlocosDe_('caixa', mes).forEach(function (o) {   // v1.15: + o que veio do Storage em blocos
    (o.caixas || []).forEach(function (c) { if (!vc[String(c.id)]) { vc[String(c.id)] = true; caixas.push(c); } });
    (o.sangrias || []).forEach(function (x) { if (!vs[String(x.id)]) { vs[String(x.id)] = true; sangrias.push(x); } });
  });
  return { ok: true, mes: mes, caixas: caixas, sangrias: sangrias };
}


/* ============================================================================
   CÓPIA DO BACKUP DO SUPABASE NO GOOGLE DRIVE
   A Edge Function "criar-backup" envia cada backup (.json.gz) para cá logo depois de guardá-lo no Storage do Supabase.
   Pasta própria (não mistura com as cópias da planilha). Limpa só os AUTOMÁTICOS antigos; manuais e de segurança ficam.
   ============================================================================ */
function sbPastaBackupsSupabase_() {
  const nome = 'Restaurante - Backups do Supabase';
  const it = DriveApp.getFoldersByName(nome);
  return it.hasNext() ? it.next() : DriveApp.createFolder(nome);
}
function sbGuardarBackup_(b) {
  const nome = String(b.nome || '');
  if (!/^backup-[0-9A-Za-z\-]+\.json\.gz$/.test(nome)) return { ok: false, message: 'Nome de arquivo inválido.' };
  if (!b.base64 || String(b.base64).length > 25 * 1024 * 1024) return { ok: false, message: 'Arquivo ausente ou grande demais.' };
  const pasta = sbPastaBackupsSupabase_();
  const ja = pasta.getFilesByName(nome);
  if (ja.hasNext()) return { ok: true, repetido: true };                 // reenvio não duplica
  const blob = Utilities.newBlob(Utilities.base64Decode(String(b.base64)), 'application/gzip', nome);
  const f = pasta.createFile(blob);
  let removidos = 0;
  const dias = Math.max(7, Number(b.retencaoDias) || 7), corte = Date.now() - dias * 86400000;
  const it = pasta.getFiles();
  while (it.hasNext()) {
    const x = it.next();
    if (/-auto\.json\.gz$/.test(x.getName()) && x.getDateCreated().getTime() < corte) { x.setTrashed(true); removidos++; }
  }
  return { ok: true, id: f.getId(), tamanho: f.getSize(), removidos: removidos };
}


/* Reserva de leitura: chave só de consulta para os aparelhos (todos os perfis). Gerada pela própria contingência. */
function sbChaveLeitura_(renovar) {
  const props = PropertiesService.getScriptProperties();
  let k = props.getProperty('CONTINGENCIA_CHAVE_LEITURA');
  if (!k || renovar) {
    const r = chamarContingencia_('gerarChaveLeitura');
    if (!r || !r.ok || !r.chave) return { ok: false, message: (r && r.message) || 'A contingência não gerou a chave de leitura (atualize e republique o script da contingência).' };
    k = r.chave; props.setProperty('CONTINGENCIA_CHAVE_LEITURA', k);
  }
  return { ok: true, chave: k };
}
/* Lê só as últimas N linhas de uma aba SB_ (as vendas recentes ficam no fim). */
function sbLerAbaUltimas_(nome, n) {
  const sh = abaPorNome_(nome);
  if (!sh || sh.getLastRow() < 2 || sh.getLastColumn() < 2) return [];
  const cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const ini = Math.max(2, sh.getLastRow() - n + 1);
  return sh.getRange(ini, 1, sh.getLastRow() - ini + 1, cab.length).getValues().map(function (r) {
    const o = {}; for (let i = 1; i < cab.length; i++) if (cab[i]) o[cab[i]] = r[i]; return o;
  }).filter(function (o) { return o.id !== undefined && String(o.id) !== ''; });
}


/* ============================================================================
   LIMPEZA DAS ABAS QUE NÃO SÃO MAIS USADAS (criada em 09/10/2026, ampliada em 11/10/2026)
   O app hoje fala com o Supabase. Esta planilha só precisa de:
     - SB_*        cópia automática do Supabase, só das tabelas da lista SB_TABELAS_ESPELHO_ (as outras SB_ saem)
     - Arquivo_*   vendas e caixas antigos enviados pelo app para liberar espaço
     - Log         registro de eventos da sincronização (ainda é usado)
     - Auditoria   registro de ações importantes
   Tudo que está na lista abaixo é do sistema antigo (Google Sheets puro) e não tem mais uso.

   COMO USAR (no editor do Apps Script, escolha a função na lista e toque em Executar):
     1) previaLimpezaAbas        só MOSTRA o que seria apagado (nada é alterado). Veja em Execuções/Registro.
     2) ocultarAbasAntigas       esconde as abas (reversível: botão direito nas abas > Mostrar). Use uns dias.
     3) limparAbasAntigas        faz uma CÓPIA da planilha no seu Drive e então APAGA as abas antigas
                                 e os acionadores (gatilhos) antigos. Só apaga se a cópia foi feita.
     removerAcionadoresAntigos   remove só os gatilhos antigos (já está dentro do passo 3).
   Nunca apaga as SB_ da lista, Arquivo_*, Log nem Auditoria.
   ============================================================================ */
const ABAS_ANTIGAS_LIMPEZA_ = [
  'Vendas', 'ItensVenda', 'PagamentosVenda', 'Clientes', 'Produtos', 'ProdutoPrecos', 'ProdutoAdicionais', 'ProdutoIngredientes',
  'Combos', 'ComboPrecos', 'ComboItens', 'Categorias', 'Adicionais', 'Formas de Pagamento', 'Promoções', 'Cupons', 'CuponsUsos',
  'Mesas', 'Caixa', 'Sangrias', 'Estoque', 'MovimentaçõesEstoque', 'Despesas', 'DespesasRecorrentes', 'AjustesPosVenda',
  'Ocorrências', 'Feedbacks', 'Indicações', 'Fidelidade', 'Eventos', 'EventosCustos', 'EventosRecebimentos',
  'FechamentosEntrega', 'EntregasFechadas', 'Configurações', 'Usuários', 'Backups', 'Requisicoes', 'ContingenciaReconciliada',
  'Sheet1', 'Página1', 'Planilha1'
];
const ACIONADORES_ANTIGOS_LIMPEZA_ = ['tarefaDespesasMensais', 'criarBackupDiario', 'sincronizarContingencia', 'reconciliarContingenciaAuto', 'sbSincronizarContingenciaAuto'];

function abaSbUsada_(nome) { return /^SB_/.test(nome) && SB_TABELAS_ESPELHO_.indexOf(nome.slice(3)) !== -1; }
function abaProtegidaLimpeza_(nome) { return abaSbUsada_(nome) || /^Arquivo_/.test(nome) || nome === 'Log' || nome === 'Auditoria'; }

function abasParaLimpar_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const todas = ss.getSheets().map(function (s) { return s.getName(); });
  return {
    apagar: todas.filter(function (n) { return (ABAS_ANTIGAS_LIMPEZA_.indexOf(n) !== -1 || /^SB_/.test(n)) && !abaProtegidaLimpeza_(n); }),
    mantidas: todas.filter(function (n) { return abaProtegidaLimpeza_(n); }),
    desconhecidas: todas.filter(function (n) { return ABAS_ANTIGAS_LIMPEZA_.indexOf(n) === -1 && !/^SB_/.test(n) && !abaProtegidaLimpeza_(n); })
  };
}

function previaLimpezaAbas() {
  const r = abasParaLimpar_();
  const texto = 'SERIAM APAGADAS (' + r.apagar.length + '): ' + (r.apagar.join(', ') || 'nenhuma') +
    '\nFICAM (' + r.mantidas.length + '): ' + (r.mantidas.join(', ') || 'nenhuma') +
    '\nNÃO RECONHECIDAS, ficam como estão (' + r.desconhecidas.length + '): ' + (r.desconhecidas.join(', ') || 'nenhuma') +
    '\nACIONADORES ANTIGOS ENCONTRADOS: ' + (acionadoresAntigosEncontrados_().join(', ') || 'nenhum');
  Logger.log(texto);
  return texto;
}

function ocultarAbasAntigas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const r = abasParaLimpar_();
  const visiveisFicam = ss.getSheets().filter(function (s) { return r.apagar.indexOf(s.getName()) === -1 && !s.isSheetHidden(); }).length;
  if (!visiveisFicam) { Logger.log('Nada a ocultar: sobraria nenhuma aba visível.'); return 'Nada a ocultar.'; }
  r.apagar.forEach(function (n) { const s = ss.getSheetByName(n); if (s && !s.isSheetHidden()) s.hideSheet(); });
  const msg = 'Ocultadas ' + r.apagar.length + ' aba(s): ' + r.apagar.join(', ') + '. Para mostrar de novo: menu Exibir > Planilhas ocultas.';
  Logger.log(msg); return msg;
}

function acionadoresAntigosEncontrados_() {
  return ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); })
    .filter(function (f) { return ACIONADORES_ANTIGOS_LIMPEZA_.indexOf(f) !== -1; });
}

function removerAcionadoresAntigos() {
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (ACIONADORES_ANTIGOS_LIMPEZA_.indexOf(t.getHandlerFunction()) !== -1) { ScriptApp.deleteTrigger(t); n++; }
  });
  const msg = n + ' acionador(es) antigo(s) removido(s).';
  Logger.log(msg); return msg;
}

function limparAbasAntigas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const r = abasParaLimpar_();
  if (!r.apagar.length) { const m = 'Nenhuma aba antiga encontrada. ' + removerAcionadoresAntigos(); Logger.log(m); return m; }
  // 1) cópia de segurança no Drive; sem ela, nada é apagado
  let copia;
  try {
    const stamp = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm');
    copia = ss.copy('COPIA antes de limpar abas antigas - ' + stamp);
  } catch (e) {
    const m = 'NADA FOI APAGADO: não consegui fazer a cópia de segurança (' + e.message + ').'; Logger.log(m); return m;
  }
  // 2) apaga (nunca deixa a planilha sem abas)
  const apagadas = [], falhas = [];
  r.apagar.forEach(function (n) {
    try {
      if (ss.getSheets().length <= 1) { falhas.push(n + ' (única aba restante)'); return; }
      const s = ss.getSheetByName(n); if (s) { ss.deleteSheet(s); apagadas.push(n); }
    } catch (e) { falhas.push(n + ' (' + e.message + ')'); }
  });
  // 3) gatilhos antigos
  const gat = removerAcionadoresAntigos();
  const msg = 'Cópia criada: "' + copia.getName() + '" (Drive). Apagadas ' + apagadas.length + ' aba(s): ' + apagadas.join(', ') +
    (falhas.length ? '. Não apagadas: ' + falhas.join('; ') : '') + '. ' + gat;
  Logger.log(msg); return msg;
}


/* ============================================================================
   ENTRADA DO APP DA WEB
   GET (?ping=1): só responde "estou no ar" (o Supabase usa a cada 2 min para a planilha não "dormir").
   POST: só as ações do Supabase (ACOES_SERVIDOR_SB_). O sistema antigo (login, vendas pela planilha) foi retirado.
   ============================================================================ */
function doGet(e) {
  try { removerGatilhosAntigosUmaVez_(false); } catch (err) {}
  return responder({ ok: true, servico: 'Restaurante - Planilha principal' });
}
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return responder({ ok: false, message: 'Requisição inválida.' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.action !== 'string') return responder({ ok: false, message: 'Requisição inválida.' });
  if (ACOES_SERVIDOR_SB_.indexOf(body.action) !== -1) return responder(acaoServidorSb_(body.action, body));
  return responder({ ok: false, message: 'Ação desconhecida: esta planilha só recebe chamadas do Supabase.' });
}

/* GATILHOS ANTIGOS: apaga os acionadores do sistema antigo (e o do espelho das 3h, que o Supabase já faz) UMA vez.
   Roda sozinho na primeira chamada depois de colar este código. Se algum gatilho antigo disparar antes disso,
   a função dele (abaixo) só chama esta limpeza: nada do sistema antigo roda. */
function removerGatilhosAntigosUmaVez_(forcar) {
  const props = PropertiesService.getScriptProperties();
  if (!forcar && props.getProperty('GATILHOS_ANTIGOS_LIMPOS') === 'v2') return;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  try {
    if (!forcar && props.getProperty('GATILHOS_ANTIGOS_LIMPOS') === 'v2') return;
    const msg = removerAcionadoresAntigos();
    props.setProperty('GATILHOS_ANTIGOS_LIMPOS', 'v2');
    try { registrarLog('Gatilhos antigos removidos', '', msg); } catch (e) {}
  } finally { lock.releaseLock(); }
}
function tarefaDespesasMensais() { removerGatilhosAntigosUmaVez_(true); }
function criarBackupDiario() { removerGatilhosAntigosUmaVez_(true); }
function sincronizarContingencia() { removerGatilhosAntigosUmaVez_(true); }
function reconciliarContingenciaAuto() { removerGatilhosAntigosUmaVez_(true); }
function sbSincronizarContingenciaAuto() { removerGatilhosAntigosUmaVez_(true); }


/* ============================================================================
   v1.15 (P-08) — BLOCOS DO ARQUIVO (quando o Storage do Supabase enche)
   O arquivo mais antigo do Storage chega aqui INTEIRO, comprimido (.json.gz em base64), e fica guardado em
   blocos de texto num ARQUIVO ANUAL próprio: "Restaurante - Arquivo AAAA" (um por ano; se encher, abre o
   "(2)", "(3)"...). Assim a planilha principal não cresce e nunca bate no limite de 10 milhões de células.
   - Índice na planilha principal: aba "Arquivo_Indice" (caminho, tipo, mês, quantidade, arquivo, blocos, data).
   - Antes de gravar: confere as células do arquivo anual; passando de 8 milhões, abre o próximo.
   - Depois de gravar: LÊ DE VOLTA, descomprime e conta. Só responde "ok" se a contagem bater; aí o Supabase
     apaga do Storage. Reenvio do mesmo arquivo não duplica.
   - A leitura de meses antigos, o cliente, a contagem e a LGPD juntam estes blocos com as abas Arquivo_*.
   ============================================================================ */
const SB_BLOCO_TAM_ = 45000;              // caracteres por célula (limite do Google: 50.000)
const SB_ANUAL_MAX_CELULAS_ = 8000000;    // abre o próximo arquivo anual antes de chegar perto dos 10 milhões
const SB_INDICE_COLS_ = ['caminho', 'tipo', 'mes', 'qtd', 'arquivo_id', 'arquivo_nome', 'blocos', 'guardado_em', 'chave_dados'];   // chave_dados: em qual chave da aba Blocos estão os pedaços (muda numa regravação da LGPD)
const SB_BLOCO_PREFIXO_ = 'b:';   // todo pedaço começa com isto: o Google nunca lê o texto como número ou fórmula (base64 pode começar com + ou =)

function sbIndiceAba_() {
  let sh = abaPorNome_('Arquivo_Indice');
  if (!sh) { sh = ssAtiva_().insertSheet('Arquivo_Indice'); sh.getRange(1, 1, 1, SB_INDICE_COLS_.length).setValues([SB_INDICE_COLS_]); sh.setFrozenRows(1); _abasMemo_['Arquivo_Indice'] = sh; sbAparar_(sh, SB_INDICE_COLS_.length); }
  return sh;
}
function sbIndiceLer_() {
  const sh = abaPorNome_('Arquivo_Indice'); if (!sh || sh.getLastRow() < 2) return [];
  if (sh.getMaxColumns() < SB_INDICE_COLS_.length) { sh.insertColumnsAfter(sh.getMaxColumns(), SB_INDICE_COLS_.length - sh.getMaxColumns()); sh.getRange(1, 1, 1, SB_INDICE_COLS_.length).setValues([SB_INDICE_COLS_]); }
  return sh.getRange(2, 1, sh.getLastRow() - 1, SB_INDICE_COLS_.length).getValues().map(function (r, i) {
    const o = { linha: i + 2 }; SB_INDICE_COLS_.forEach(function (c, k) { o[c] = String(r[k] == null ? '' : r[k]).replace(/^'/, ''); }); o.qtd = Number(o.qtd) || 0; return o;
  }).filter(function (o) { return o.caminho; });
}
/* Apara a aba: tira linhas e colunas vazias reservadas (cada célula reservada conta no limite de 10 milhões, mesmo vazia). */
function sbAparar_(sh, colsMin) {
  try {
    const ur = Math.max(sh.getLastRow(), 2), uc = Math.max(sh.getLastColumn(), colsMin || 1);
    if (sh.getMaxRows() > ur + 50) sh.deleteRows(ur + 51, sh.getMaxRows() - ur - 50);
    if (sh.getMaxColumns() > uc) sh.deleteColumns(uc + 1, sh.getMaxColumns() - uc);
  } catch (e) { /* aparar é só economia: se falhar, segue */ }
}
function sbCelulasDe_(ss) { try { return ss.getSheets().reduce(function (t, s) { return t + s.getMaxRows() * s.getMaxColumns(); }, 0); } catch (e) { return 0; } }

/* Arquivo anual com espaço: "Restaurante - Arquivo 2026", depois "(2)", "(3)"... Ids guardados nas propriedades do script. */
function sbArquivoAnual_(ano, celulasNecessarias) {
  const props = PropertiesService.getScriptProperties();
  for (let n = 1; n < 50; n++) {
    const nome = 'Restaurante - Arquivo ' + ano + (n > 1 ? ' (' + n + ')' : ''), chave = 'ARQ_ANUAL_' + ano + '_' + n;
    let ss = null; const id = props.getProperty(chave);
    if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
    if (!ss) {
      const it = DriveApp.getFilesByName(nome);
      ss = it.hasNext() ? SpreadsheetApp.openById(it.next().getId()) : SpreadsheetApp.create(nome);
      props.setProperty(chave, ss.getId());
      let sh = ss.getSheetByName('Blocos');
      if (!sh) {
        sh = ss.getSheets()[0]; sh.setName('Blocos');
        sh.getRange(1, 1, 1, 5).setValues([['caminho', 'parte', 'partes', 'qtd', 'dados']]); sh.setFrozenRows(1);
        sbAparar_(sh, 5);
        sh.getRange('A:E').setNumberFormat('@');   // tudo como texto
      }
    }
    if (sbCelulasDe_(ss) + (celulasNecessarias || 0) < SB_ANUAL_MAX_CELULAS_) return ss;
  }
  throw new Error('Todos os arquivos anuais de ' + ano + ' estão cheios.');
}
function sbLinhasDoCaminho_(sh, caminho) {
  const ult = sh.getLastRow(); if (ult < 2) return [];
  const v = sh.getRange(2, 1, ult - 1, 1).getValues(), out = [];
  for (let i = 0; i < v.length; i++) if (String(v[i][0]) === caminho) out.push(i + 2);
  return out;
}
function sbApagarLinhas_(sh, linhas) { sbFaixas_(linhas).reverse().forEach(function (f) { sh.deleteRows(f[0], f[1]); }); }
function sbDecodificarBloco_(b64) {
  const bytes = Utilities.base64Decode(b64);
  return JSON.parse(Utilities.ungzip(Utilities.newBlob(bytes, 'application/x-gzip', 'b.json.gz')).getDataAsString('UTF-8'));
}
/* Lê um bloco guardado (todas as partes, na ordem) e devolve o objeto descomprimido. */
function sbLerBloco_(item) {
  const ss = SpreadsheetApp.openById(item.arquivo_id), sh = ss.getSheetByName('Blocos'), chave = item.chave_dados || item.caminho;
  const linhas = sbLinhasDoCaminho_(sh, chave); if (!linhas.length) throw new Error('Bloco ' + item.caminho + ' não encontrado no ' + item.arquivo_nome + '.');
  const partes = [];
  sbFaixas_(linhas).forEach(function (f) { sh.getRange(f[0], 2, f[1], 4).getValues().forEach(function (r) { partes.push({ p: Number(r[0]), n: Number(r[1]), d: String(r[3]).replace(/^b:/, '') }); }); });
  partes.sort(function (a, b) { return a.p - b.p; });
  if (!partes.length || partes.length !== partes[0].n) throw new Error('Bloco ' + item.caminho + ' incompleto (' + partes.length + ' de ' + (partes[0] && partes[0].n) + ' partes).');
  return sbDecodificarBloco_(partes.map(function (x) { return x.d; }).join(''));
}
function sbChaveContagem_(tipo, pedida) { return pedida || (tipo === 'caixa' ? 'caixas' : 'vendas'); }

function sbGuardarBloco_(b) {
  const caminho = String(b.caminho || ''), tipo = String(b.tipo || ''), mes = String(b.mes || ''), qtd = Number(b.qtd), b64 = String(b.gzBase64 || '');
  if (!/^[a-z]+\/[0-9A-Za-z_\-\/\.]+\.json\.gz$/.test(caminho) || ['vendas', 'caixa', 'teste'].indexOf(tipo) < 0 || !/^\d{4}-\d{2}$/.test(mes) || !(qtd >= 0) || !b64)
    return { ok: false, message: 'Bloco inválido (caminho, tipo, mês, quantidade ou conteúdo).' };
  const chave = sbChaveContagem_(tipo, b.chaveContagem);
  // 1) confere o conteúdo ANTES de gravar (o que chegou bate com o que o Supabase disse?)
  let obj; try { obj = sbDecodificarBloco_(b64); } catch (e) { return { ok: false, message: 'Conteúdo do bloco não abriu (corrompido na viagem).' }; }
  const n0 = Array.isArray(obj[chave]) ? obj[chave].length : -1;
  if (n0 !== qtd) return { ok: false, message: 'Contagem do bloco não bate (' + n0 + ' de ' + qtd + ').' };
  // 2) já guardado antes? Confere e não duplica
  const idx = sbIndiceLer_(), ja = idx.filter(function (x) { return x.caminho === caminho; })[0];
  if (ja) {
    try { const o = sbLerBloco_(ja); if ((o[chave] || []).length === qtd) return { ok: true, qtd: qtd, repetido: true, arquivo: ja.arquivo_nome, celulas: sbCelulasUsadas_() }; } catch (e) { /* refaz abaixo */ }
    sbIndiceAba_().deleteRow(ja.linha);
  }
  // 3) grava em partes no arquivo anual com espaço
  const partes = []; for (let i = 0; i < b64.length; i += SB_BLOCO_TAM_) partes.push(b64.slice(i, i + SB_BLOCO_TAM_));
  const ss = sbArquivoAnual_(tipo === 'teste' ? 'Teste' : mes.slice(0, 4), partes.length * 5 + 100), sh = ss.getSheetByName('Blocos');
  const velhas = sbLinhasDoCaminho_(sh, caminho); if (velhas.length) sbApagarLinhas_(sh, velhas);   // sobra de tentativa anterior
  const ini = sh.getLastRow() + 1;
  if (sh.getMaxRows() < ini + partes.length - 1) sh.insertRowsAfter(sh.getMaxRows(), ini + partes.length - 1 - sh.getMaxRows() + 20);
  sh.getRange(ini, 1, partes.length, 5).setNumberFormat('@').setValues(partes.map(function (d, i) { return [caminho, i + 1, partes.length, qtd, SB_BLOCO_PREFIXO_ + d]; }));
  SpreadsheetApp.flush();
  // 4) LÊ DE VOLTA e conta
  const item = { caminho: caminho, arquivo_id: ss.getId(), arquivo_nome: ss.getName() };
  let volta; try { volta = sbLerBloco_(item); } catch (e) { sbApagarLinhas_(sh, sbLinhasDoCaminho_(sh, caminho)); return { ok: false, message: 'Gravou mas não conseguiu ler de volta: ' + e.message }; }
  if ((volta[chave] || []).length !== qtd) { sbApagarLinhas_(sh, sbLinhasDoCaminho_(sh, caminho)); return { ok: false, message: 'Leitura de volta com contagem diferente.' }; }
  // 5) índice na principal (bloco de teste não entra no índice)
  if (tipo !== 'teste') {
    const ix = sbIndiceAba_();
    if (ix.getMaxColumns() < SB_INDICE_COLS_.length) { ix.insertColumnsAfter(ix.getMaxColumns(), SB_INDICE_COLS_.length - ix.getMaxColumns()); ix.getRange(1, 1, 1, SB_INDICE_COLS_.length).setValues([SB_INDICE_COLS_]); }
    ix.appendRow([caminho, tipo, mes, qtd, ss.getId(), ss.getName(), partes.length, Utilities.formatDate(new Date(), SB_FUSO_, 'yyyy-MM-dd HH:mm'), caminho]);
    sbMarcarAlterada_('Arquivo_Indice'); sbGravarStamps_();
  }
  return { ok: true, qtd: qtd, arquivo: ss.getName(), partes: partes.length, celulas: sbCelulasUsadas_(), celulasArquivo: sbCelulasDe_(ss) };
}
function sbApagarBlocoTeste_(b) {
  const caminho = String(b.caminho || ''); if (!/^teste\//.test(caminho)) return { ok: false, message: 'Só apaga bloco de teste.' };
  const ss = sbArquivoAnual_('Teste', 0), sh = ss.getSheetByName('Blocos');
  sbApagarLinhas_(sh, sbLinhasDoCaminho_(sh, caminho));
  return { ok: true };
}

/* Blocos de um tipo (e mês, se informado) já abertos, para juntar na leitura do arquivo. */
function sbBlocosDe_(tipo, mes) {
  return sbIndiceLer_().filter(function (x) { return x.tipo === tipo && (!mes || x.mes === mes); }).map(function (x) { return sbLerBloco_(x); });
}
function sbJuntarVendas_(res, blocos, filtro) {
  const vistos = {}; res.vendas.forEach(function (v) { vistos[String(v.id)] = true; });
  blocos.forEach(function (o) {
    const ids = {};
    (o.vendas || []).forEach(function (v) { if (vistos[String(v.id)] || (filtro && !filtro(v))) return; vistos[String(v.id)] = ids[String(v.id)] = true; res.vendas.push(sbPick_(v, SB_COLS_VENDA_)); });
    (o.itens || []).forEach(function (i) { if (ids[String(i.venda_id)]) res.itens.push(sbItemSaida_(i)); });
    (o.pagamentos || []).forEach(function (p) { if (ids[String(p.venda_id)]) res.pagamentos.push(sbPick_(p, SB_COLS_PAG_)); });
  });
  return res;
}

/* Cópia mensal do resumo (dia a dia do mês anterior) na aba "Resumo_Mensal". Reenvio do mesmo mês substitui. */
function sbResumoMensal_(b) {
  const mes = String(b.mes || ''); if (!/^\d{4}-\d{2}$/.test(mes)) return { ok: false, message: 'Mês inválido.' };
  const dias = Array.isArray(b.dias) ? b.dias : [];
  const cols = ['mes', 'dia', 'pedidos', 'cancelados', 'faturamento', 'ticket_medio', 'copiado_em'];
  let sh = abaPorNome_('Resumo_Mensal');
  if (!sh) { sh = ssAtiva_().insertSheet('Resumo_Mensal'); sh.getRange(1, 1, 1, cols.length).setValues([cols]); sh.setFrozenRows(1); _abasMemo_['Resumo_Mensal'] = sh; sbAparar_(sh, cols.length); }
  const velhas = sbLinhasDoCaminho_(sh, mes); if (velhas.length) sbApagarLinhas_(sh, velhas);
  const quando = Utilities.formatDate(new Date(), SB_FUSO_, 'yyyy-MM-dd HH:mm');
  const linhas = dias.map(function (d) { const ped = Number(d.pedidos) || 0, tot = Number(d.total) || 0; return [mes, d.dia, ped, Number(d.cancelados) || 0, tot, ped ? Math.round(tot / ped * 100) / 100 : 0, quando]; });
  if (linhas.length) {
    const ini = sh.getLastRow() + 1;
    if (sh.getMaxRows() < ini + linhas.length - 1) sh.insertRowsAfter(sh.getMaxRows(), ini + linhas.length - 1 - sh.getMaxRows() + 10);
    sh.getRange(ini, 1, linhas.length, cols.length).setValues(linhas);
  }
  return { ok: true, mes: mes, dias: linhas.length, celulas: sbCelulasUsadas_() };
}

/* Células por arquivo (para a tela Armazenamento): a principal e cada arquivo anual. Só leitura. */
function sbCelulasArquivos_() {
  const props = PropertiesService.getScriptProperties().getProperties(), out = [{ nome: ssAtiva_().getName(), celulas: sbCelulasUsadas_(), principal: true }];
  Object.keys(props).filter(function (k) { return /^ARQ_ANUAL_\d{4}_\d+$/.test(k) && !/^ARQ_ANUAL_2000_/.test(k); }).sort().forEach(function (k) {
    try { const ss = SpreadsheetApp.openById(props[k]); out.push({ nome: ss.getName(), celulas: sbCelulasDe_(ss) }); } catch (e) { out.push({ nome: k, erro: 'não abriu' }); }
  });
  return { ok: true, limite: 10000000, arquivos: out, blocos: sbIndiceLer_().length };
}

/* LGPD nos blocos: abre cada bloco de vendas, limpa os dados pessoais de quem foi anonimizado e regrava (mesmo arquivo anual). */
function sbAnonimizarBlocos_(doCliente) {
  const limpar = { cliente_nome: 'Cliente anonimizado', telefone_cliente: '', endereco: '', complemento: '', referencia: '', observacoes_entrega: '', cpf_nota: '', preferencias_cliente: '' };
  let n = 0;
  sbIndiceLer_().filter(function (x) { return x.tipo === 'vendas'; }).forEach(function (item) {
    const o = sbLerBloco_(item); let mudou = false;
    (o.vendas || []).forEach(function (v) { if (doCliente(v)) { Object.keys(limpar).forEach(function (k) { v[k] = limpar[k]; }); mudou = true; n++; } });
    if (!mudou) return;
    const b64 = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(JSON.stringify(o), 'application/json', 'b.json')).getBytes());
    const partes = []; for (let i = 0; i < b64.length; i += SB_BLOCO_TAM_) partes.push(b64.slice(i, i + SB_BLOCO_TAM_));
    const sh = SpreadsheetApp.openById(item.arquivo_id).getSheetByName('Blocos');
    const antiga = item.chave_dados || item.caminho, nova = item.caminho + '@' + Date.now();
    const ini = sh.getLastRow() + 1;
    if (sh.getMaxRows() < ini + partes.length - 1) sh.insertRowsAfter(sh.getMaxRows(), ini + partes.length - 1 - sh.getMaxRows() + 20);
    sh.getRange(ini, 1, partes.length, 5).setNumberFormat('@').setValues(partes.map(function (d, i) { return [nova, i + 1, partes.length, item.qtd, SB_BLOCO_PREFIXO_ + d]; }));
    SpreadsheetApp.flush();
    // 1) confere a versão nova; 2) troca o ponteiro no índice (uma célula só: quem ler antes vê a antiga, quem ler depois vê a nova);
    // 3) só então apaga a antiga. Se o tempo acabar no meio, nada fica ilegível: sobra no máximo uma cópia extra.
    const conf = sbLerBloco_({ caminho: item.caminho, chave_dados: nova, arquivo_id: item.arquivo_id, arquivo_nome: item.arquivo_nome });
    if ((conf.vendas || []).length !== item.qtd) { sbApagarLinhas_(sh, sbLinhasDoCaminho_(sh, nova)); throw new Error('Anonimização do bloco ' + item.caminho + ' não conferiu.'); }
    const ix = sbIndiceAba_();
    ix.getRange(item.linha, 7, 1, 3).setValues([[partes.length, ix.getRange(item.linha, 8).getValue(), nova]]);
    SpreadsheetApp.flush();
    try { sbApagarLinhas_(sh, sbLinhasDoCaminho_(sh, antiga)); } catch (eA) { /* sobra de cópia antiga: só ocupa espaço */ }
    sbMarcarAlterada_('Arquivo_Indice');
  });
  return n;
}
