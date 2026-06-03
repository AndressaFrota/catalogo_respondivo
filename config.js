/**
 * config.js — D'Furlan Planejados Portal
 * Edite APENAS este arquivo para configurar o portal após a publicação.
 */

const CONFIG = {

  // ─── API ────────────────────────────────────────────────────────────────────
  // Cole aqui a URL gerada após publicar o Apps Script como Web App
  API_URL: 'https://script.google.com/macros/s/AKfycbxfcWS6QQ0U40uozNGl4jvc933g6z_r0sj03zXFy7IafiFkxehUFH-jyIWCpZ2KQ-R1bQ/exec',

  // ─── IDs das Pastas do Google Drive ─────────────────────────────────────────
  // Para obter o ID: abra a pasta → copie o trecho após /folders/ na URL
  FOLDER_IDS: {
    novidades:        '1_kSHl5GSXlByQNlC72bMemY9c-L9Al8Q',
    vendas:           '1l95-kHeW1DkIbsIdWaAFXxSUc1XOZMGW',
    fornecedores:     '19nQ-d2sY4cDkE9RI_yEm0WXaATBLiUTZ',
    escola:           '1jz_-QR8nCyVPvxv_Rub8ATS3S6S8UdQy',
  },

  // ─── Planilha ────────────────────────────────────────────────────────────────
  SPREADSHEET_ID: '1r8pnLeu-nzwrX1oCyfyWGWgzDGQba7biMf_s-RrVS3k/edit',
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
