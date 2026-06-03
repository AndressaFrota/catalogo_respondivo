/**
 * config.js — D'Furlan Planejados Portal
 * Edite APENAS este arquivo para configurar o portal após a publicação.
 */

const CONFIG = {

  // ─── API ────────────────────────────────────────────────────────────────────
  // Cole aqui a URL gerada após publicar o Apps Script como Web App
  API_URL: 'https://script.google.com/macros/s/AKfycbztkJSFN7PJTMT5_UWt1tyf-zaiiCDESTxr7KBqZzlO2p-JM1HT46WPjfn_7HvLN9f0QA/exec',

  // ─── IDs das Pastas do Google Drive ─────────────────────────────────────────
  // Para obter o ID: abra a pasta → copie o trecho após /folders/ na URL
  FOLDER_IDS: {
    novidades:        '1xFj6UIBTU-XFuF4wfBznqZdkbAavtmji?usp=drive_link',
    vendas:           '1DvwiTdZREM2AB24YtsfaJQtZ04EufkOX?usp=drive_link',
    fornecedores:     '1AvprrY2isedTrEhKE8cBKua8aP10IoUB?usp=drive_link',
    escola:           '1uuWEowAo81W6xPkgNuNTpZMP79RlRBTX?usp=drive_link',
  },

  // ─── Planilha ────────────────────────────────────────────────────────────────
  SPREADSHEET_ID: 'd/1r8pnLeu-nzwrX1oCyfyWGWgzDGQba7biMf_s-RrVS3k/edit?usp=sharing',
  SHEET_NAME: 'Conteudos',

  // ─── Cache ───────────────────────────────────────────────────────────────────
  // Tempo em milissegundos para considerar o cache válido (padrão: 15 minutos)
  CACHE_TTL: 15 * 60 * 1000,
  CACHE_KEY: 'dfurlan_portal_cache',
  CACHE_TS_KEY: 'dfurlan_portal_cache_ts',

  // ─── Empresa ─────────────────────────────────────────────────────────────────
  COMPANY_NAME: "D'Furlan Planejados",
  PORTAL_TITLE: "Portal D'Furlan",
  PORTAL_SUBTITLE: 'Sua plataforma de treinamento e comunicação interna',

  // ─── Identidade Visual ────────────────────────────────────────────────────────
  COLORS: {
    gold:    '#CA9833',
    black:   '#000000',
    gray:    '#484848',
    light:   '#FCFCFC',
    goldHover: '#b8871f',
    surface: '#111111',
    border:  '#2a2a2a',
  },

  // ─── Categorias ───────────────────────────────────────────────────────────────
  CATEGORIES: [
    { id: 'novidades',    label: 'Novidades',           icon: 'bell',         color: '#CA9833' },
    { id: 'vendas',       label: 'Venda e Negociação',  icon: 'trending-up',  color: '#3a7bd5' },
    { id: 'fornecedores', label: 'Fornecedores',        icon: 'package',      color: '#5cb85c' },
    { id: 'escola',       label: "Escola D'Furlan",     icon: 'book-open',    color: '#9b59b6' },
  ],

  // ─── Paginação ────────────────────────────────────────────────────────────────
  ITEMS_PER_PAGE: 12,

  // ─── Carrossel de Destaques ───────────────────────────────────────────────────
  CAROUSEL_INTERVAL: 5000, // ms

  // ─── Tipos de arquivo suportados ─────────────────────────────────────────────
  FILE_TYPES: {
    video:        ['mp4', 'mov', 'avi', 'mkv', 'webm'],
    pdf:          ['pdf'],
    presentation: ['pptx', 'ppt', 'key'],
    document:     ['docx', 'doc', 'txt'],
    spreadsheet:  ['xlsx', 'xls', 'csv'],
    image:        ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
  },

};

// Exporta para uso em módulos (compatível com script tag direto)
if (typeof module !== 'undefined') module.exports = CONFIG;
