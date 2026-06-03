/**
 * app.js — D'Furlan Planejados Portal
 * Lógica principal: roteamento, API, busca, filtros, favoritos, carrossel, cache
 */

/* ── Estado Global ───────────────────────────────────────── */
const State = {
  data:         null,         // payload completo da API
  page:         'home',       // página atual
  search:       '',           // termo de busca
  filter: {
    category:   null,
    type:       null,
    destaque:   false,
    sort:       'recent',
  },
  pagination: {
    current:    1,
    perPage:    CONFIG.ITEMS_PER_PAGE,
  },
  favorites:    new Set(),
  carousel:     { index: 0, timer: null },
  loading:      true,
  error:        null,
};

/* ── Bootstrap ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadFavorites();
  applyTheme(getSavedTheme());
  bindGlobalEvents();
  fetchData();
});

/* ── API / Cache ─────────────────────────────────────────── */
async function fetchData(forceRefresh = false) {
  showLoading(true);
  hideError();

  try {
    // Verificar cache
    if (!forceRefresh) {
      const cached = readCache();
      if (cached) {
        State.data = cached;
        showLoading(false);
        renderCurrentPage();
        updateNavBadges();
        return;
      }
    }

    const url = `${CONFIG.API_URL}?t=${Date.now()}`;
    const response = await fetchWithTimeout(url, 12000);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();

    if (!json.ok) throw new Error(json.message || 'Erro na API');

    State.data  = json;
    State.error = null;
    writeCache(json);

  } catch (err) {
    console.warn('Erro ao buscar dados:', err);

    // Tentar cache mesmo expirado como fallback
    const stale = readCache(true);
    if (stale) {
      State.data = stale;
      showError('Usando dados salvos. Verifique sua conexão.');
    } else {
      State.data  = null;
      State.error = err.message;
      showError('Não foi possível carregar os conteúdos. Tente novamente.');
    }
  }

  showLoading(false);
  renderCurrentPage();
  updateNavBadges();
}

function fetchWithTimeout(url, ms) {
  return Promise.race([
    fetch(url, { mode: 'cors' }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}

/* ── Cache ───────────────────────────────────────────────── */
function writeCache(data) {
  try {
    localStorage.setItem(CONFIG.CACHE_KEY,    JSON.stringify(data));
    localStorage.setItem(CONFIG.CACHE_TS_KEY, String(Date.now()));
  } catch (e) { /* quota */ }
}

function readCache(ignoreExpiry = false) {
  try {
    const ts   = Number(localStorage.getItem(CONFIG.CACHE_TS_KEY) || 0);
    const data = localStorage.getItem(CONFIG.CACHE_KEY);
    if (!data) return null;
    if (!ignoreExpiry && Date.now() - ts > CONFIG.CACHE_TTL) return null;
    return JSON.parse(data);
  } catch (e) { return null; }
}

/* ── Roteamento ──────────────────────────────────────────── */
function navigate(page, category = null) {
  State.page            = page;
  State.pagination.current = 1;
  State.search          = '';

  if (category) {
    State.filter.category = category;
  } else if (!['home','favoritos','novidades','vendas','fornecedores','escola'].includes(page)) {
    State.filter.category = null;
  }

  // Sync filter.category com páginas de categoria
  const catPages = ['novidades','vendas','fornecedores','escola'];
  if (catPages.includes(page)) State.filter.category = page;
  if (page === 'home' || page === 'favoritos') State.filter.category = null;

  // Atualizar nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Atualizar search bar
  const searchInput = document.getElementById('globalSearch');
  if (searchInput) searchInput.value = '';
  document.querySelector('.search-bar')?.classList.remove('has-value');

  // Mostrar página
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('active', el.id === `page-${page}`);
  });

  renderCurrentPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Render principal ────────────────────────────────────── */
function renderCurrentPage() {
  if (!State.data && !State.error) return;

  switch (State.page) {
    case 'home':        renderHome();        break;
    case 'novidades':   renderCategory('novidades');    break;
    case 'vendas':      renderCategory('vendas');       break;
    case 'fornecedores':renderCategory('fornecedores'); break;
    case 'escola':      renderCategory('escola');       break;
    case 'favoritos':   renderFavoritos();  break;
  }
}

/* ── Home ────────────────────────────────────────────────── */
function renderHome() {
  if (!State.data) return;

  // Stats
  renderStats();

  // Category cards
  renderCategoryCards();

  // Destaques carousel
  const destaques = State.data.destaques || [];
  if (destaques.length > 0) {
    renderCarousel(destaques);
  } else {
    const carousel = document.getElementById('carouselWrapper');
    if (carousel) carousel.innerHTML = '<div class="empty-state" style="min-height:180px"><p class="empty-desc">Nenhum destaque configurado ainda.</p></div>';
  }

  // Recentes
  renderHomeRecentes();
}

function renderStats() {
  const d = State.data;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('statTotal',       d.total || 0);
  set('statNovidades',   (d.categorias?.find(c => c.id === 'novidades')?.total) || 0);
  set('statVendas',      (d.categorias?.find(c => c.id === 'vendas')?.total) || 0);
  set('statEscola',      (d.categorias?.find(c => c.id === 'escola')?.total) || 0);
}

function renderCategoryCards() {
  CONFIG.CATEGORIES.forEach(cat => {
    const countEl = document.getElementById(`catCount_${cat.id}`);
    if (countEl) {
      const found = State.data.categorias?.find(c => c.id === cat.id);
      countEl.textContent = `${found?.total || 0} conteúdo${(found?.total || 0) !== 1 ? 's' : ''}`;
    }
  });
}

function renderHomeRecentes() {
  const container = document.getElementById('homeRecentes');
  if (!container) return;

  const items = (State.data.recentes || []).slice(0, 6);
  if (items.length === 0) {
    container.innerHTML = emptyState('Nenhum conteúdo ainda', 'Os arquivos das pastas do Drive aparecerão aqui.');
    return;
  }
  container.innerHTML = `<div class="card-grid">${items.map(i => cardHTML(i)).join('')}</div>`;
  bindCardEvents(container);
}

/* ── Category pages ──────────────────────────────────────── */
function renderCategory(catId) {
  const container = document.getElementById(`content_${catId}`);
  if (!container) return;

  let items = getFilteredItems(catId);

  // Pagination
  const total   = items.length;
  const perPage = State.pagination.perPage;
  const page    = State.pagination.current;
  const start   = (page - 1) * perPage;
  const slice   = items.slice(start, start + perPage);

  // Update count
  const countEl = document.getElementById(`count_${catId}`);
  if (countEl) countEl.textContent = `${total} item${total !== 1 ? 's' : ''}`;

  if (total === 0) {
    container.innerHTML = emptyState('Nenhum resultado', 'Tente outros filtros ou aguarde novos conteúdos.');
    const pag = document.getElementById(`pag_${catId}`);
    if (pag) pag.innerHTML = '';
    return;
  }

  container.innerHTML = `<div class="card-grid">${slice.map(i => cardHTML(i)).join('')}</div>`;
  bindCardEvents(container);

  // Pagination
  const pag = document.getElementById(`pag_${catId}`);
  if (pag) pag.innerHTML = renderPagination(total, page, perPage, catId);
}

function getFilteredItems(catId) {
  if (!State.data) return [];

  let items = (State.data.conteudos || []).filter(i => i.categoria === catId);

  // Search
  if (State.search.trim()) {
    const q = State.search.toLowerCase();
    items = items.filter(i =>
      (i.titulo    || '').toLowerCase().includes(q) ||
      (i.descricao || '').toLowerCase().includes(q)
    );
  }

  // Type filter
  if (State.filter.type) {
    items = items.filter(i => i.tipo === State.filter.type);
  }

  // Destaque filter
  if (State.filter.destaque) {
    items = items.filter(i => i.destaque);
  }

  // Sort
  switch (State.filter.sort) {
    case 'recent':   items.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)); break;
    case 'oldest':   items.sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm)); break;
    case 'alpha':    items.sort((a, b) => (a.titulo||'').localeCompare(b.titulo||'')); break;
    case 'order':    items.sort((a, b) => (a.ordem||999) - (b.ordem||999)); break;
  }

  return items;
}

/* ── Favoritos ───────────────────────────────────────────── */
function renderFavoritos() {
  const container = document.getElementById('content_favoritos');
  if (!container) return;

  if (!State.data) {
    container.innerHTML = emptyState('Carregando...', '');
    return;
  }

  const favItems = (State.data.conteudos || []).filter(i => State.favorites.has(i.id));

  if (favItems.length === 0) {
    container.innerHTML = emptyState('Nenhum favorito', 'Clique na estrela nos cards para salvar conteúdos aqui.');
    return;
  }

  container.innerHTML = `<div class="card-grid">${favItems.map(i => cardHTML(i)).join('')}</div>`;
  bindCardEvents(container);
}

/* ── Card HTML ───────────────────────────────────────────── */
function cardHTML(item) {
  const cat       = CONFIG.CATEGORIES.find(c => c.id === item.categoria) || {};
  const isFav     = State.favorites.has(item.id);
  const isVideo   = item.tipo === 'video';
  const typeLabel = typeLabels[item.tipo] || item.tipo || 'Arquivo';
  const typeIcon  = typeIconSVG(item.tipo);
  const date      = item.criadoEm ? formatDate(item.criadoEm) : '';

  return `
  <article class="card" data-id="${escHTML(item.id)}" tabindex="0" role="button" aria-label="${escHTML(item.titulo)}">
    <div class="card-thumb">
      <div class="card-thumb-inner">
        <div class="card-type-icon">${typeIconSVGLarge(item.tipo)}</div>
      </div>
      ${isVideo ? `
      <div class="card-play-overlay">
        <div class="card-play-btn">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>` : ''}
    </div>
    <div class="card-body">
      <div class="card-meta">
        <span class="card-category cat-${item.categoria}">${escHTML(cat.label || item.categoria)}</span>
        <span class="card-date">${date}</span>
      </div>
      <h3 class="card-title">${escHTML(item.titulo)}</h3>
      ${item.descricao ? `<p class="card-desc">${escHTML(item.descricao)}</p>` : ''}
    </div>
    <div class="card-footer">
      <span class="card-type-badge">${typeIcon} ${typeLabel}</span>
      <button class="card-fav-btn ${isFav ? 'active' : ''}" data-fav="${escHTML(item.id)}" title="${isFav ? 'Remover favorito' : 'Favoritar'}" aria-label="Favoritar">
        <svg viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
      </button>
    </div>
  </article>`;
}

const typeLabels = {
  video:        'Vídeo',
  pdf:          'PDF',
  apresentacao: 'Apresentação',
  documento:    'Documento',
  planilha:     'Planilha',
  imagem:       'Imagem',
  arquivo:      'Arquivo',
};

function typeIconSVG(tipo) {
  const icons = {
    video:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
    pdf:          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    apresentacao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
    documento:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    planilha:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>',
    imagem:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    arquivo:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
  };
  return icons[tipo] || icons.arquivo;
}

function typeIconSVGLarge(tipo) {
  const size = 'width="40" height="40"';
  const icons = {
    video:        `<svg ${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>`,
    pdf:          `<svg ${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/></svg>`,
    apresentacao: `<svg ${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    documento:    `<svg ${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    planilha:     `<svg ${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,
    imagem:       `<svg ${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    arquivo:      `<svg ${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
  };
  return icons[tipo] || icons.arquivo;
}

/* ── Carrossel ───────────────────────────────────────────── */
function renderCarousel(items) {
  const wrapper = document.getElementById('carouselWrapper');
  if (!wrapper || items.length === 0) return;

  const slides = items.slice(0, 6);

  wrapper.innerHTML = `
    <div class="carousel-track" id="carouselTrack">
      ${slides.map(item => carouselSlideHTML(item)).join('')}
    </div>
    <div class="carousel-nav" id="carouselNav">
      <button class="carousel-arrow" id="carouselPrev" aria-label="Anterior">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      ${slides.map((_, i) => `<div class="carousel-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></div>`).join('')}
      <button class="carousel-arrow" id="carouselNext" aria-label="Próximo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>`;

  State.carousel.index = 0;
  startCarousel(slides.length);

  document.getElementById('carouselPrev')?.addEventListener('click', () => moveCarousel(-1, slides.length));
  document.getElementById('carouselNext')?.addEventListener('click', () => moveCarousel(1, slides.length));
  document.querySelectorAll('.carousel-dot').forEach(dot => {
    dot.addEventListener('click', () => goToSlide(+dot.dataset.idx, slides.length));
  });

  // Clicks em CTAs do carrossel
  wrapper.querySelectorAll('.carousel-cta').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      openModal(id);
    });
  });
}

function carouselSlideHTML(item) {
  const cat = CONFIG.CATEGORIES.find(c => c.id === item.categoria) || {};
  return `
  <div class="carousel-slide">
    <div class="carousel-slide-content">
      <div class="carousel-badge">${escHTML(cat.label || item.categoria)}</div>
      <h2 class="carousel-title">${escHTML(item.titulo)}</h2>
      ${item.descricao ? `<p class="carousel-desc">${escHTML(item.descricao)}</p>` : ''}
      <button class="carousel-cta" data-id="${escHTML(item.id)}">
        Acessar conteúdo
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  </div>`;
}

function startCarousel(total) {
  clearInterval(State.carousel.timer);
  State.carousel.timer = setInterval(() => moveCarousel(1, total), CONFIG.CAROUSEL_INTERVAL);
}

function moveCarousel(dir, total) {
  const next = ((State.carousel.index + dir) % total + total) % total;
  goToSlide(next, total);
}

function goToSlide(idx, total) {
  State.carousel.index = idx;
  const track = document.getElementById('carouselTrack');
  if (track) track.style.transform = `translateX(-${idx * 100}%)`;
  document.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
  startCarousel(total);
}

/* ── Modal ───────────────────────────────────────────────── */
function openModal(itemId) {
  if (!State.data) return;
  const item = State.data.conteudos?.find(i => i.id === itemId);
  if (!item) return;

  const cat     = CONFIG.CATEGORIES.find(c => c.id === item.categoria) || {};
  const isFav   = State.favorites.has(item.id);
  const date    = item.criadoEm ? formatDate(item.criadoEm) : '';
  const hasEmbed = !!item.linkArquivo;

  document.getElementById('modalCategoryBadge').className = `modal-category-badge cat-${item.categoria}`;
  document.getElementById('modalCategoryBadge').textContent = cat.label || item.categoria;
  document.getElementById('modalTitle').textContent = item.titulo;
  document.getElementById('modalMeta').textContent = `${typeLabels[item.tipo] || 'Arquivo'} · ${date}`;

  // Embed
  const embedArea = document.getElementById('modalEmbed');
  if (hasEmbed) {
    embedArea.src      = item.linkArquivo;
    embedArea.style.display = 'block';
  } else {
    embedArea.src            = '';
    embedArea.style.display  = 'none';
  }

  // Description
  const descEl = document.getElementById('modalDescText');
  if (descEl) descEl.textContent = item.descricao || '';
  const descSection = document.getElementById('modalDescSection');
  if (descSection) descSection.style.display = item.descricao ? 'block' : 'none';

  // Buttons
  const openBtn = document.getElementById('modalOpenBtn');
  if (openBtn) {
    openBtn.href = item.linkArquivo || '#';
    openBtn.style.display = hasEmbed ? 'inline-flex' : 'none';
  }

  const favBtn = document.getElementById('modalFavBtn');
  if (favBtn) {
    favBtn.dataset.id = item.id;
    updateFavButton(favBtn, isFav);
  }

  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  const embed = document.getElementById('modalEmbed');
  if (embed) embed.src = ''; // stop video
}

/* ── Favoritos ───────────────────────────────────────────── */
function loadFavorites() {
  try {
    const saved = JSON.parse(localStorage.getItem('dfurlan_favorites') || '[]');
    State.favorites = new Set(saved);
  } catch (e) { State.favorites = new Set(); }
}

function saveFavorites() {
  try {
    localStorage.setItem('dfurlan_favorites', JSON.stringify([...State.favorites]));
  } catch (e) {}
}

function toggleFavorite(id) {
  if (State.favorites.has(id)) {
    State.favorites.delete(id);
    showToast('Removido dos favoritos');
  } else {
    State.favorites.add(id);
    showToast('Adicionado aos favoritos ⭐');
  }
  saveFavorites();
  // Re-render fav buttons in view
  document.querySelectorAll(`[data-fav="${id}"]`).forEach(btn => {
    const isFav = State.favorites.has(id);
    updateFavButton(btn, isFav);
  });
  // Update fav modal button
  const modalFavBtn = document.getElementById('modalFavBtn');
  if (modalFavBtn?.dataset.id === id) {
    updateFavButton(modalFavBtn, State.favorites.has(id));
  }
  if (State.page === 'favoritos') renderFavoritos();
  updateNavBadges();
}

function updateFavButton(btn, isFav) {
  btn.classList.toggle('active', isFav);
  btn.title = isFav ? 'Remover favorito' : 'Favoritar';
  const svg = btn.querySelector('svg');
  if (svg) svg.setAttribute('fill', isFav ? 'currentColor' : 'none');
}

/* ── Pesquisa Global ─────────────────────────────────────── */
function handleSearch(q) {
  State.search = q;
  State.pagination.current = 1;
  document.querySelector('.search-bar')?.classList.toggle('has-value', q.length > 0);

  if (!State.data) return;

  // Se pesquisa ativa e estamos na home → vai para todos
  if (q && State.page === 'home') {
    // Renderiza resultados globais
    renderSearchResults(q);
  } else {
    renderCurrentPage();
  }
}

function renderSearchResults(q) {
  // Mostrar página home (que tem seção de resultados)
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('active', el.id === 'page-home');
  });

  const low = q.toLowerCase();
  const results = (State.data?.conteudos || []).filter(i =>
    (i.titulo    || '').toLowerCase().includes(low) ||
    (i.descricao || '').toLowerCase().includes(low) ||
    (i.categoria || '').toLowerCase().includes(low)
  );

  const homeRecentes = document.getElementById('homeRecentes');
  const homeSearchSection = document.getElementById('homeSearchSection');
  const homeDefaultSections = document.getElementById('homeDefaultSections');

  if (homeSearchSection && homeDefaultSections) {
    homeDefaultSections.style.display = 'none';
    homeSearchSection.style.display   = 'block';
    document.getElementById('searchResultCount').textContent = `${results.length} resultado${results.length !== 1 ? 's' : ''} para "${q}"`;

    const container = document.getElementById('searchResultsGrid');
    if (container) {
      if (results.length === 0) {
        container.innerHTML = emptyState('Nenhum resultado', `Não encontramos nada para "${q}". Tente outro termo.`);
      } else {
        container.innerHTML = `<div class="card-grid">${results.map(i => cardHTML(i)).join('')}</div>`;
        bindCardEvents(container);
      }
    }
  }
}

function clearSearch() {
  State.search = '';
  const searchInput = document.getElementById('globalSearch');
  if (searchInput) searchInput.value = '';
  document.querySelector('.search-bar')?.classList.remove('has-value');

  const homeSearchSection = document.getElementById('homeSearchSection');
  const homeDefaultSections = document.getElementById('homeDefaultSections');
  if (homeSearchSection) homeSearchSection.style.display = 'none';
  if (homeDefaultSections) homeDefaultSections.style.display = 'block';

  renderCurrentPage();
}

/* ── Nav badges ──────────────────────────────────────────── */
function updateNavBadges() {
  if (!State.data) return;
  const favCount = State.favorites.size;
  const favBadge = document.getElementById('favBadge');
  if (favBadge) {
    favBadge.textContent = favCount || '';
    favBadge.style.display = favCount ? 'inline' : 'none';
  }
}

/* ── Pagination ──────────────────────────────────────────── */
function renderPagination(total, current, perPage, catId) {
  const pages = Math.ceil(total / perPage);
  if (pages <= 1) return '';

  let html = '<div class="pagination">';
  html += `<button class="page-btn" onclick="changePage('${catId}', ${current - 1})" ${current === 1 ? 'disabled' : ''} aria-label="Anterior">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
  </button>`;

  const range = pagRange(current, pages);
  range.forEach(p => {
    if (p === '…') {
      html += `<span class="page-btn" style="cursor:default;color:var(--text-muted)">…</span>`;
    } else {
      html += `<button class="page-btn ${p === current ? 'active' : ''}" onclick="changePage('${catId}', ${p})">${p}</button>`;
    }
  });

  html += `<button class="page-btn" onclick="changePage('${catId}', ${current + 1})" ${current === pages ? 'disabled' : ''} aria-label="Próximo">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
  </button>`;
  html += '</div>';
  return html;
}

function pagRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', current - 1, current, current + 1, '…', total];
}

function changePage(catId, p) {
  State.pagination.current = p;
  renderCategory(catId);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Theme ───────────────────────────────────────────────── */
function getSavedTheme() {
  return localStorage.getItem('dfurlan_theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('dfurlan_theme', theme);
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.title = theme === 'dark' ? 'Modo claro' : 'Modo escuro';
    btn.querySelector('.icon-sun').style.display  = theme === 'dark' ? 'block' : 'none';
    btn.querySelector('.icon-moon').style.display = theme === 'dark' ? 'none'  : 'block';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* ── Event Bindings ──────────────────────────────────────── */
function bindGlobalEvents() {

  // Navigation
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
  });

  // Hamburger
  document.getElementById('hamburger')?.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
    document.querySelector('.sidebar-overlay').classList.toggle('open');
  });

  document.querySelector('.sidebar-overlay')?.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.remove('open');
    document.querySelector('.sidebar-overlay').classList.remove('open');
  });

  // Search
  let searchTimer;
  document.getElementById('globalSearch')?.addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => handleSearch(e.target.value.trim()), 280);
  });

  document.querySelector('.search-clear')?.addEventListener('click', clearSearch);

  // Theme toggle
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

  // Refresh
  document.getElementById('refreshBtn')?.addEventListener('click', () => fetchData(true));

  // Modal close
  document.getElementById('modalOverlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
  document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);

  // Modal fav button
  document.getElementById('modalFavBtn')?.addEventListener('click', e => {
    const id = e.currentTarget.dataset.id;
    if (id) toggleFavorite(id);
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // Category card clicks (home)
  document.querySelectorAll('.category-card[data-cat]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.cat));
  });

  // Filter chips (per-page)
  document.querySelectorAll('.filter-chip[data-type]').forEach(chip => {
    chip.addEventListener('click', () => {
      const type = chip.dataset.type;
      if (type === 'all') {
        State.filter.type = null;
      } else if (type === 'destaque') {
        State.filter.destaque = !State.filter.destaque;
        chip.classList.toggle('active', State.filter.destaque);
        State.pagination.current = 1;
        renderCurrentPage();
        return;
      } else {
        State.filter.type = State.filter.type === type ? null : type;
      }
      State.pagination.current = 1;
      document.querySelectorAll('.filter-chip[data-type]').forEach(c => {
        c.classList.toggle('active', c.dataset.type === (State.filter.type || 'all'));
      });
      renderCurrentPage();
    });
  });

  // Sort select
  document.querySelectorAll('.sort-select').forEach(sel => {
    sel.addEventListener('change', e => {
      State.filter.sort = e.target.value;
      State.pagination.current = 1;
      renderCurrentPage();
    });
  });
}

function bindCardEvents(container) {
  // Card click → open modal
  container.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.card-fav-btn')) return;
      openModal(card.dataset.id);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(card.dataset.id);
      }
    });
  });

  // Fav button
  container.querySelectorAll('.card-fav-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.fav);
    });
  });
}

/* ── Helpers ─────────────────────────────────────────────── */
function showLoading(show) {
  State.loading = show;
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.classList.toggle('hidden', !show);
}

function showError(msg) {
  const banner = document.getElementById('errorBanner');
  if (banner) {
    banner.classList.add('show');
    const text = banner.querySelector('.error-text');
    if (text) text.textContent = msg;
  }
}

function hideError() {
  document.getElementById('errorBanner')?.classList.remove('show');
}

function emptyState(title, desc) {
  return `
  <div class="empty-state">
    <div class="empty-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      </svg>
    </div>
    <p class="empty-title">${escHTML(title)}</p>
    <p class="empty-desc">${escHTML(desc)}</p>
  </div>`;
}

function showToast(msg) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> ${escHTML(msg)}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 320);
  }, 2800);
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) { return ''; }
}

function escHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Skeleton cards while loading
function renderSkeletons(containerId, count = 6) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `<div class="card-grid">${Array(count).fill(0).map(() => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-thumb"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line title medium"></div>
        <div class="skeleton skeleton-line full"></div>
        <div class="skeleton skeleton-line full"></div>
      </div>
    </div>`).join('')}</div>`;
}
