/**
 * apps-script.js — D'Furlan Planejados Portal
 * Cole este código no editor do Google Apps Script (script.google.com)
 * Publicar como: Web App → Qualquer pessoa → Acesso anônimo
 *
 * CONFIGURAÇÕES — edite aqui:
 */

const SPREADSHEET_ID = '1r8pnLeu-nzwrX1oCyfyWGWgzDGQba7biMf_s-RrVS3k';
const SHEET_NAME     = 'Conteudos';

const FOLDER_IDS = {
    novidades:        '1_kSHl5GSXlByQNlC72bMemY9c-L9Al8Q',
    vendas:           '1l95-kHeW1DkIbsIdWaAFXxSUc1XOZMGW',
    fornecedores:     '19nQ-d2sY4cDkE9RI_yEm0WXaATBLiUTZ',
    escola:           '1jz_-QR8nCyVPvxv_Rub8ATS3S6S8UdQy',
};

// ─── Ponto de entrada HTTP GET ───────────────────────────────────────────────

function doGet(e) {
  const callback = e && e.parameter && e.parameter.callback;

  try {
    const data = buildPayload();
    const json = JSON.stringify(data);
    const output = callback
      ? ContentService.createTextOutput(`${callback}(${json})`)
          .setMimeType(ContentService.MimeType.JAVASCRIPT)
      : ContentService.createTextOutput(json)
          .setMimeType(ContentService.MimeType.JSON);

    return output;
  } catch (err) {
    const errorPayload = JSON.stringify({ error: true, message: err.message });
    return ContentService.createTextOutput(errorPayload)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── Construção do payload completo ─────────────────────────────────────────

function buildPayload() {
  const sheetItems  = readSheet();
  const driveItems  = readAllFolders();

  // Merge: sheetItems têm prioridade em título/descrição/destaque/ordem
  // driveItems são adicionados automaticamente se não existirem na planilha

  const merged = mergeContent(sheetItems, driveItems);

  const destaques  = merged.filter(i => i.destaque === true || i.destaque === 'Sim');
  const recentes   = [...merged].sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).slice(0, 12);
  const categorias = Object.keys(FOLDER_IDS).map(key => ({
    id: key,
    total: merged.filter(i => i.categoria === key).length,
  }));

  return {
    ok:          true,
    geradoEm:    new Date().toISOString(),
    total:       merged.length,
    categorias,
    destaques,
    recentes,
    conteudos:   merged,
  };
}

// ─── Leitura da planilha ─────────────────────────────────────────────────────

function readSheet() {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) return [];

    const data    = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ''));

    const rows = [];
    for (let r = 1; r < data.length; r++) {
      const row = data[r];
      if (!row[0]) continue; // linha vazia

      const item = {};
      headers.forEach((h, i) => { item[h] = row[i]; });

      rows.push({
        id:           String(item['id'] || ''),
        categoria:    normalizarCategoria(String(item['categoria'] || '')),
        titulo:       String(item['titulo'] || ''),
        descricao:    String(item['descricao'] || ''),
        linkArquivo:  String(item['linkarquivo'] || ''),
        destaque:     ['sim', 'yes', 'true', '1'].includes(String(item['destaque'] || '').toLowerCase()),
        ordem:        Number(item['ordem'] || 999),
        _fromSheet:   true,
      });
    }
    return rows;
  } catch (e) {
    Logger.log('Erro ao ler planilha: ' + e.message);
    return [];
  }
}

// ─── Leitura das pastas do Drive ─────────────────────────────────────────────

function readAllFolders() {
  const all = [];
  for (const [catId, folderId] of Object.entries(FOLDER_IDS)) {
    const items = readFolder(folderId, catId);
    all.push(...items);
  }
  return all;
}

function readFolder(folderId, categoriaId) {
  const items = [];
  try {
    const folder = DriveApp.getFolderById(folderId);
    const files  = folder.getFiles();

    while (files.hasNext()) {
      const file = files.next();
      items.push(fileToItem(file, categoriaId));
    }

    // Subpastas (1 nível)
    const subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      const sub      = subfolders.next();
      const subFiles = sub.getFiles();
      while (subFiles.hasNext()) {
        items.push(fileToItem(subFiles.next(), categoriaId));
      }
    }
  } catch (e) {
    Logger.log(`Erro ao ler pasta ${folderId}: ${e.message}`);
  }
  return items;
}

function fileToItem(file, categoriaId) {
  const name    = file.getName();
  const ext     = name.split('.').pop().toLowerCase();
  const mimeRaw = file.getMimeType();

  return {
    id:          file.getId(),
    categoria:   categoriaId,
    titulo:      stripExtension(name),
    descricao:   '',
    linkArquivo: buildViewUrl(file.getId(), mimeRaw),
    mimeType:    mimeRaw,
    tipo:        inferirTipo(ext, mimeRaw),
    tamanho:     file.getSize(),
    criadoEm:    file.getDateCreated().toISOString(),
    modificadoEm: file.getLastUpdated().toISOString(),
    destaque:    false,
    ordem:       999,
    _fromDrive:  true,
  };
}

function buildViewUrl(fileId, mimeType) {
  // Vídeos: link de download direto (embed)
  if (mimeType && mimeType.startsWith('video/')) {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  }
  // Google Workspace: exportar como PDF
  if (mimeType === 'application/vnd.google-apps.presentation') {
    return `https://docs.google.com/presentation/d/${fileId}/preview`;
  }
  if (mimeType === 'application/vnd.google-apps.document') {
    return `https://docs.google.com/document/d/${fileId}/preview`;
  }
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    return `https://docs.google.com/spreadsheets/d/${fileId}/preview`;
  }
  // PDFs e outros: preview padrão do Drive
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

function inferirTipo(ext, mime) {
  if (mime && mime.startsWith('video/')) return 'video';
  if (['mp4','mov','avi','mkv','webm'].includes(ext)) return 'video';
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (['pptx','ppt','key'].includes(ext) ||
      mime === 'application/vnd.google-apps.presentation') return 'apresentacao';
  if (['docx','doc'].includes(ext) ||
      mime === 'application/vnd.google-apps.document') return 'documento';
  if (['xlsx','xls','csv'].includes(ext) ||
      mime === 'application/vnd.google-apps.spreadsheet') return 'planilha';
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return 'imagem';
  return 'arquivo';
}

// ─── Merge planilha + Drive ──────────────────────────────────────────────────

function mergeContent(sheetItems, driveItems) {
  const byId  = {};

  // Drive items primeiro (base)
  driveItems.forEach(item => {
    byId[item.id] = item;
  });

  // Planilha sobrescreve/enriquece por linkArquivo ou ID
  sheetItems.forEach(si => {
    // Tenta localizar item do Drive pelo link ou ID
    const fileId = extractFileId(si.linkArquivo || si.id);
    if (fileId && byId[fileId]) {
      // Enriquece item existente do Drive com dados da planilha
      const base = byId[fileId];
      byId[fileId] = {
        ...base,
        titulo:     si.titulo    || base.titulo,
        descricao:  si.descricao || base.descricao,
        destaque:   si.destaque,
        ordem:      si.ordem,
        categoria:  si.categoria || base.categoria,
      };
    } else {
      // Item apenas na planilha (link externo ou manual)
      const newId = si.id || fileId || `sheet_${Math.random().toString(36).slice(2)}`;
      byId[newId] = {
        id:           newId,
        categoria:    si.categoria,
        titulo:       si.titulo,
        descricao:    si.descricao,
        linkArquivo:  si.linkArquivo,
        tipo:         inferirTipoFromUrl(si.linkArquivo),
        criadoEm:     new Date().toISOString(),
        modificadoEm: new Date().toISOString(),
        destaque:     si.destaque,
        ordem:        si.ordem,
        _fromSheet:   true,
      };
    }
  });

  return Object.values(byId)
    .sort((a, b) => a.ordem - b.ordem || new Date(b.criadoEm) - new Date(a.criadoEm));
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

function extractFileId(url) {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m) return m[1];
  const m2 = url.match(/id=([a-zA-Z0-9_-]{20,})/);
  if (m2) return m2[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) return url;
  return null;
}

function stripExtension(name) {
  return name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ').replace(/-/g, ' ');
}

function normalizarCategoria(cat) {
  const map = {
    'novidades':          'novidades',
    'novidade':           'novidades',
    'venda':              'vendas',
    'vendas':             'vendas',
    'venda e negociacao': 'vendas',
    'negociacao':         'vendas',
    'fornecedor':         'fornecedores',
    'fornecedores':       'fornecedores',
    'escola':             'escola',
    "escola d'furlan":    'escola',
    'escola dfurlan':     'escola',
  };
  const key = cat.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
  return map[key] || cat.toLowerCase();
}

function inferirTipoFromUrl(url) {
  if (!url) return 'arquivo';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'video';
  if (url.includes('vimeo.com')) return 'video';
  const ext = (url.split('?')[0].split('.').pop() || '').toLowerCase();
  return inferirTipo(ext, '');
}
