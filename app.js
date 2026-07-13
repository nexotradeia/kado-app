// =====================================================
//  Kādo — lógica de la app
// =====================================================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const STORE_KEY = 'kado.cards.v1';
const SEEDED_KEY = 'kado.seeded.v1';

function loadCards() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) || [];
    if (!localStorage.getItem(SEEDED_KEY)) {
      localStorage.setItem(SEEDED_KEY, '1');
      const seeded = MY_CARDS.map(c => ({ ...c }));
      saveCards(seeded);
      return seeded;
    }
    return [];
  } catch { return []; }
}
function saveCards(cards) { localStorage.setItem(STORE_KEY, JSON.stringify(cards)); }

let cards = loadCards();
let activeTab = 'home';
let pendingCategory = null;

function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function effectiveRate(card, categoryId) {
  if (categoryId && card.categories && card.categories[categoryId] != null) {
    return { rate: card.categories[categoryId], matched: true };
  }
  return { rate: card.base ?? 1, matched: false };
}

function unitLabel(card, rate) {
  return card.unit === '%' ? `${rate}%` : `${rate}x`;
}

// ---------- Render: tabs ----------
function setTab(tab) {
  activeTab = tab;
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + tab));
  if (tab === 'cards') renderCardsScreen();
  if (tab === 'home') renderHome();
}

// ---------- Home: buscador + categorías rápidas ----------
function renderHome() {
  const empty = $('#home-empty');
  const searchWrap = $('#home-search-wrap');
  if (!cards.length) {
    empty.classList.remove('hidden');
    searchWrap.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  searchWrap.classList.remove('hidden');
  renderResult(pendingCategory);
}

function renderCategoryChips() {
  const wrap = $('#category-chips');
  wrap.innerHTML = CATEGORIES.map(c =>
    `<button class="chip" data-cat="${c.id}"><span>${c.icon}</span>${c.label}</button>`
  ).join('');
  wrap.addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    $$('.chip', wrap).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    pendingCategory = btn.dataset.cat;
    $('#merchant-input').value = '';
    renderResult(pendingCategory);
  });
}

function renderResult(categoryId) {
  const out = $('#result-area');
  if (!cards.length) { out.innerHTML = ''; return; }
  if (!categoryId) {
    out.innerHTML = `<p class="hint">Elige una categoría arriba o escribe dónde vas a comprar ☝️</p>`;
    return;
  }
  const cat = CATEGORIES.find(c => c.id === categoryId);
  const ranked = cards.map(c => {
    const { rate, matched } = effectiveRate(c, categoryId);
    return { card: c, rate, matched };
  }).sort((a, b) => b.rate - a.rate);

  const top = ranked[0];
  const rest = ranked.slice(1);

  out.innerHTML = `
    <div class="spotlight" style="--g1:${top.card.gradient?.[0] || '#6d28d9'};--g2:${top.card.gradient?.[1] || '#a78bfa'}">
      <div class="spotlight-label">Usa esta para ${cat.icon} ${cat.label}</div>
      <div class="spotlight-card">
        <div class="spotlight-name">${top.card.name}</div>
        <div class="spotlight-rate">${unitLabel(top.card, top.rate)}</div>
      </div>
      <div class="spotlight-why">${top.matched ? `Da ${unitLabel(top.card, top.rate)} en ${cat.label.toLowerCase()}` : `Tasa base (sin categoría especial aquí)`}${top.card.rotating ? ' · revisa si la categoría rotativa está activa este trimestre ⚠️' : ''}</div>
    </div>
    ${rest.length ? `<div class="rest-list">${rest.map(r => `
      <div class="rest-row">
        <div class="rest-swatch" style="background:linear-gradient(135deg, ${r.card.gradient?.[0] || '#333'}, ${r.card.gradient?.[1] || '#666'})"></div>
        <div class="rest-name">${r.card.name}</div>
        <div class="rest-rate">${unitLabel(r.card, r.rate)}</div>
      </div>`).join('')}</div>` : ''}
  `;
}

function setupMerchantSearch() {
  const input = $('#merchant-input');
  input.addEventListener('input', () => {
    const guess = guessCategory(input.value);
    $$('.chip').forEach(b => b.classList.toggle('active', b.dataset.cat === guess));
    if (guess) { pendingCategory = guess; renderResult(guess); }
    else if (!input.value.trim()) { renderResult(pendingCategory); }
    else { $('#result-area').innerHTML = `<p class="hint">No reconozco ese comercio todavía — elige una categoría manualmente 👆</p>`; }
  });
}

// ---------- Mis tarjetas ----------
function topStats(card, n = 2) {
  return Object.entries(card.categories || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => ({ cat: CATEGORIES.find(x => x.id === k), rate: v }))
    .filter(s => s.cat);
}

function renderCardsScreen() {
  const list = $('#my-cards-list');
  if (!cards.length) {
    list.innerHTML = `<p class="hint">Aún no tienes tarjetas. Toca "Agregar tarjeta" para empezar.</p>`;
    return;
  }
  list.innerHTML = cards.map(c => {
    const stats = topStats(c, 2);
    const statsHtml = stats.length
      ? stats.map(s => `<div class="mycard-stat"><span class="mycard-stat-icon">${s.cat.icon}</span><span class="mycard-stat-rate">${unitLabel(c, s.rate)}</span></div>`).join('')
      : `<div class="mycard-stat"><span class="mycard-stat-icon">💳</span><span class="mycard-stat-rate">${unitLabel(c, c.base ?? 1)}</span></div>`;
    const allTags = Object.entries(c.categories || {}).map(([k, v]) => {
      const cat = CATEGORIES.find(x => x.id === k);
      return cat && v > 0 ? `<span class="tag">${cat.icon} ${unitLabel(c, v)}</span>` : '';
    }).join('') || `<span class="tag">Base ${unitLabel(c, c.base ?? 1)}</span>`;
    return `
    <div class="mycard-row" data-toggle="${c.id}" style="--g1:${c.gradient?.[0] || '#6d28d9'};--g2:${c.gradient?.[1] || '#a78bfa'}">
      <div class="mycard-row-name">${c.name}</div>
      <div class="mycard-row-right">${statsHtml}<span class="chevron">›</span></div>
    </div>
    <div class="mycard-detail hidden" id="detail-${c.id}">
      <div class="mycard-detail-issuer">${c.issuer || ''}${c.opened ? ' · desde ' + c.opened : ''}</div>
      <div class="mycard-cats">${allTags}</div>
      <button class="btn-secondary danger" data-del="${c.id}">Eliminar tarjeta</button>
    </div>`;
  }).join('');

  $$('[data-toggle]', list).forEach(row => row.addEventListener('click', () => {
    $(`#detail-${row.dataset.toggle}`).classList.toggle('hidden');
    row.classList.toggle('open');
  }));
  $$('[data-del]', list).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    cards = cards.filter(c => c.id !== b.dataset.del);
    saveCards(cards);
    renderCardsScreen();
  }));
}

// ---------- Modal: agregar tarjeta ----------
function openAddModal() {
  $('#modal-backdrop').classList.remove('hidden');
  renderTemplatePicker('');
  $('#template-search').value = '';
  $('#template-search').focus();
}
function closeAddModal() { $('#modal-backdrop').classList.add('hidden'); }

function renderTemplatePicker(query) {
  const q = (query || '').toLowerCase();
  const already = new Set(cards.map(c => c.templateId).filter(Boolean));
  const filtered = CARD_TEMPLATES.filter(t => t.name.toLowerCase().includes(q) || t.issuer.toLowerCase().includes(q));
  const wrap = $('#template-list');
  wrap.innerHTML = filtered.map(t => `
    <button class="tpl-row" data-tpl="${t.id}" ${already.has(t.id) ? 'disabled' : ''}>
      <span class="tpl-swatch" style="background:linear-gradient(135deg, ${t.gradient[0]}, ${t.gradient[1]})"></span>
      <span class="tpl-info"><b>${t.name}</b><small>${t.issuer}</small></span>
      <span class="tpl-add">${already.has(t.id) ? 'Agregada' : '+'}</span>
    </button>
  `).join('') || `<p class="hint">Ninguna coincide — puedes crear una tarjeta personalizada abajo.</p>`;

  $$('[data-tpl]', wrap).forEach(b => b.addEventListener('click', () => {
    if (b.disabled) return;
    const t = CARD_TEMPLATES.find(x => x.id === b.dataset.tpl);
    cards.push({ id: uid(), templateId: t.id, name: t.name, issuer: t.issuer, unit: t.unit,
      gradient: t.gradient, categories: { ...t.categories }, base: t.base, rotating: !!t.rotating });
    saveCards(cards);
    closeAddModal();
    renderCardsScreen();
    renderHome();
  }));
}

function openCustomForm() {
  $('#custom-form').classList.remove('hidden');
  $('#template-picker').classList.add('hidden');
}

function setupCustomForm() {
  const catWrap = $('#custom-cats');
  catWrap.innerHTML = CATEGORIES.filter(c => c.id !== 'other').map(c => `
    <label class="cat-input-row">
      <span>${c.icon} ${c.label}</span>
      <input type="number" min="0" step="0.5" data-cat="${c.id}" placeholder="0">
    </label>
  `).join('');

  $('#custom-save').addEventListener('click', () => {
    const name = $('#custom-name').value.trim();
    if (!name) { $('#custom-name').focus(); return; }
    const unit = $('#custom-unit').value;
    const base = parseFloat($('#custom-base').value) || 1;
    const categories = {};
    $$('[data-cat]', catWrap).forEach(inp => {
      const v = parseFloat(inp.value);
      if (v > 0) categories[inp.dataset.cat] = v;
    });
    const palette = [['#6d28d9', '#a78bfa'], ['#0369a1', '#38bdf8'], ['#b45309', '#fbbf24'], ['#991b1b', '#f87171'], ['#166534', '#4ade80']];
    const gradient = palette[cards.length % palette.length];
    cards.push({ id: uid(), name, issuer: $('#custom-issuer').value.trim(), unit, gradient, categories, base });
    saveCards(cards);
    closeAddModal();
    resetCustomForm();
    renderCardsScreen();
    renderHome();
  });
}

function resetCustomForm() {
  $('#custom-form').classList.add('hidden');
  $('#template-picker').classList.remove('hidden');
  $('#custom-name').value = ''; $('#custom-issuer').value = ''; $('#custom-base').value = '1';
  $$('[data-cat]', $('#custom-cats')).forEach(i => i.value = '');
}

// ---------- Init ----------
function init() {
  renderCategoryChips();
  setupMerchantSearch();
  setupCustomForm();

  $$('.tab-btn').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('#add-card-btn').addEventListener('click', openAddModal);
  $('#add-card-btn-2').addEventListener('click', openAddModal);
  $('#add-card-btn-3').addEventListener('click', openAddModal);
  $('#modal-close').addEventListener('click', () => { closeAddModal(); resetCustomForm(); });
  $('#modal-backdrop').addEventListener('click', e => { if (e.target === e.currentTarget) { closeAddModal(); resetCustomForm(); } });
  $('#template-search').addEventListener('input', e => renderTemplatePicker(e.target.value));
  $('#show-custom-btn').addEventListener('click', openCustomForm);
  $('#custom-cancel').addEventListener('click', resetCustomForm);

  renderHome();
  renderCardsScreen();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
document.addEventListener('DOMContentLoaded', init);
