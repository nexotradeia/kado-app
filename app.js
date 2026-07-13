// =====================================================
//  Kādo — lógica de la app
// =====================================================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const STORE_KEY = 'kado.cards.v1';
const SEEDED_KEY = 'kado.seeded.v1';

// IDs cuyo nombre/issuer/categorías se corrigieron en data.js después de la carga inicial —
// se re-aplican desde la plantilla semilla aunque ya existan en localStorage.
const RENAME_ON_MIGRATE = ['my-freedom2023', 'my-amex2020', 'my-mastercard'];

// Rellena campos nuevos (fecha, anualidad, créditos) en tarjetas guardadas antes de que existieran.
function migrateCard(c) {
  const seedMatch = MY_CARDS.find(m => m.id === c.id);
  const renamed = (seedMatch && RENAME_ON_MIGRATE.includes(c.id))
    ? { name: seedMatch.name, issuer: seedMatch.issuer, categories: seedMatch.categories, base: seedMatch.base, gradient: seedMatch.gradient, unit: seedMatch.unit }
    : {};
  // Los créditos reales investigados solo se aplican si nunca agregaste ninguno tú misma (array vacío).
  const creditsBackfill = (!c.credits || !c.credits.length) && seedMatch?.credits?.length ? seedMatch.credits : c.credits;
  return {
    ...c,
    ...renamed,
    openedDate: c.openedDate ?? seedMatch?.openedDate ?? null,
    annualFee: c.annualFee ?? seedMatch?.annualFee ?? 0,
    credits: creditsBackfill ?? [],
    business: c.business ?? seedMatch?.business ?? false,
    network: c.network ?? seedMatch?.network ?? null,
    rewardsPoints: c.rewardsPoints ?? seedMatch?.rewardsPoints ?? null,
    rewardsUpdated: c.rewardsUpdated ?? seedMatch?.rewardsUpdated ?? null,
    perks: c.perks ?? seedMatch?.perks ?? []
  };
}

// Logo de la red de pago (Visa/Mastercard/Amex/Discover), dibujado en HTML/CSS — no requiere descargar imágenes.
function networkBadgeHTML(network) {
  if (network === 'visa') return `<span class="net-badge net-visa">VISA</span>`;
  if (network === 'mastercard') return `<span class="net-badge net-mastercard"><span class="mc-c mc-red"></span><span class="mc-c mc-yellow"></span></span>`;
  if (network === 'amex') return `<span class="net-badge net-amex">AMEX</span>`;
  if (network === 'discover') return `<span class="net-badge net-discover">DISCOVER</span>`;
  return '';
}

function loadCards() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = (JSON.parse(raw) || []).map(migrateCard);
      saveCards(parsed);
      return parsed;
    }
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

const PINS_KEY = 'kado.pins.v1';
function loadPins() { try { return JSON.parse(localStorage.getItem(PINS_KEY)) || {}; } catch { return {}; } }
function savePins(pins) { localStorage.setItem(PINS_KEY, JSON.stringify(pins)); }

const PROMOS_KEY = 'kado.promos.v1';
function loadPromos() { try { return JSON.parse(localStorage.getItem(PROMOS_KEY)) || []; } catch { return []; } }
function savePromos(list) { localStorage.setItem(PROMOS_KEY, JSON.stringify(list)); }

let cards = loadCards();
let pins = loadPins();
let promos = loadPromos();
let activeTab = 'home';
let pendingCategory = null;

// ---------- Promociones (agregadas manualmente, ej. Amex Offers / Chase Offers activadas) ----------
function daysUntil(iso) {
  if (!iso) return null;
  return Math.ceil((new Date(iso) - new Date(todayISO())) / 86400000);
}
function activePromos() {
  const today = todayISO();
  return promos.filter(p => !p.expires || p.expires >= today);
}
function promosForCategory(categoryId) {
  return activePromos().filter(p => (!p.categoryId || p.categoryId === categoryId) && cards.some(c => c.id === p.cardId));
}

function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// Últimos 4 dígitos "falsos" pero estables para el número enmascarado de la tarjeta visual (derivados del id).
function fakeLast4(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return String(h % 10000).padStart(4, '0');
}

function effectiveRate(card, categoryId) {
  if (categoryId && card.categories && card.categories[categoryId] != null) {
    return { rate: card.categories[categoryId], matched: true };
  }
  return { rate: card.base ?? 1, matched: false };
}

function unitLabel(card, rate) {
  return card.unit === '%' ? `${rate}%` : `${rate}x`;
}

// ---------- Fechas: 5/24, renovaciones, créditos ----------
function todayISO() { return new Date().toISOString().slice(0, 10); }
function monthsBetween(isoFrom, isoTo) {
  const a = new Date(isoFrom), b = new Date(isoTo);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}
function formatDateEs(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d} ${meses[m - 1]} ${y}`;
}
function get524Status() {
  const today = todayISO();
  const counted = cards.filter(c => c.openedDate && !c.business && monthsBetween(c.openedDate, today) < 24 && monthsBetween(c.openedDate, today) >= 0);
  counted.sort((a, b) => new Date(b.openedDate) - new Date(a.openedDate));
  return { count: counted.length, cards: counted, atLimit: counted.length >= 5 };
}
// próxima fecha de aniversario (mismo mes/día) desde hoy
function nextAnniversary(openedDate) {
  if (!openedDate) return null;
  const [, m, d] = openedDate.split('-').map(Number);
  const today = new Date();
  let year = today.getFullYear();
  let next = new Date(Date.UTC(year, m - 1, d));
  if (next < new Date(today.toISOString().slice(0, 10))) next = new Date(Date.UTC(year + 1, m - 1, d));
  return next.toISOString().slice(0, 10);
}
function getUpcomingRenewals() {
  return cards
    .filter(c => c.openedDate)
    .map(c => ({ card: c, next: nextAnniversary(c.openedDate) }))
    .sort((a, b) => new Date(a.next) - new Date(b.next));
}
function creditPeriodKey(period) {
  const d = new Date();
  if (period === 'monthly') return `${d.getFullYear()}-${d.getMonth() + 1}`;
  if (period === 'quarterly') return `${d.getFullYear()}-Q${Math.floor(d.getMonth() / 3) + 1}`;
  return `${d.getFullYear()}`;
}
function isCreditUsed(credit) { return credit.usedPeriodKey === creditPeriodKey(credit.period); }

// ---------- Render: tabs ----------
function setTab(tab) {
  activeTab = tab;
  $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + tab));
  if (tab === 'cards') renderCardsScreen();
  if (tab === 'home') renderHome();
  if (tab === 'summary') renderSummaryScreen();
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
  renderPromoBanner();
  renderPointerList();
  renderResult(pendingCategory);
}

// Banner de promos que vencen pronto (7 días o menos), sin importar la categoría elegida.
function renderPromoBanner() {
  const banner = $('#promo-banner');
  if (!banner) return;
  const soon = activePromos().filter(p => cards.some(c => c.id === p.cardId) && daysUntil(p.expires) !== null && daysUntil(p.expires) <= 7);
  if (!soon.length) { banner.innerHTML = ''; return; }
  banner.innerHTML = `<div class="promo-alert">${soon.map(p => {
    const card = cards.find(c => c.id === p.cardId);
    const d = daysUntil(p.expires);
    return `<div class="promo-alert-row">🔥 <b>${p.description}</b>${card ? ' · ' + card.name : ''} — ${d <= 0 ? 'vence hoy' : `vence en ${d} día${d === 1 ? '' : 's'}`}</div>`;
  }).join('')}</div>`;
}

// Devuelve la mejor tarjeta (respetando fijadas) para una categoría, ya rankeada.
function rankForCategory(categoryId) {
  const ranked = cards.map(c => {
    const { rate, matched } = effectiveRate(c, categoryId);
    return { card: c, rate, matched };
  }).sort((a, b) => b.rate - a.rate);
  const pinnedId = pins[categoryId];
  let top = ranked.find(r => r.card.id === pinnedId);
  const isPinned = !!top;
  if (!top) top = ranked[0];
  return { ranked, top, isPinned };
}

// Paso 1 estilo "Pointers": lista de categorías, cada una ya muestra su mejor tarjeta y tasa.
function renderPointerList() {
  const wrap = $('#category-list');
  if (!wrap || !cards.length) { if (wrap) wrap.innerHTML = ''; return; }
  wrap.innerHTML = CATEGORIES.map(cat => {
    const { top } = rankForCategory(cat.id);
    const g = issuerGradient(top.card.issuer, top.card.gradient);
    const thumbStyle = top.card.photo
      ? `background-image:url(${top.card.photo})`
      : `background:linear-gradient(135deg, ${g[0]}, ${g[1]})`;
    return `
    <button class="pointer-row${pendingCategory === cat.id ? ' active' : ''}" data-pointer-cat="${cat.id}">
      <span class="pointer-icon">${cat.icon}</span>
      <span class="pointer-thumb" style="${thumbStyle}"></span>
      <span class="pointer-info">
        <span class="pointer-cat-name">${cat.label}</span>
        <span class="pointer-card-name">${top.card.name}</span>
      </span>
      <span class="pointer-rate">${unitLabel(top.card, top.rate)}</span>
      <span class="chevron">›</span>
    </button>`;
  }).join('');
  $$('[data-pointer-cat]', wrap).forEach(row => row.addEventListener('click', () => {
    const catId = row.dataset.pointerCat;
    pendingCategory = catId;
    $('#merchant-input').value = '';
    renderPointerList();
    renderResult(catId);
    $('#result-area').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }));
}

function renderResult(categoryId) {
  const out = $('#result-area');
  if (!cards.length) { out.innerHTML = ''; return; }
  if (!categoryId) {
    out.innerHTML = `<p class="hint">Elige una categoría arriba o escribe dónde vas a comprar ☝️</p>`;
    return;
  }
  const cat = CATEGORIES.find(c => c.id === categoryId);
  const { ranked, top, isPinned } = rankForCategory(categoryId);
  const rest = ranked.filter(r => r.card.id !== top.card.id);

  const catPromos = promosForCategory(categoryId);
  const promoHtml = catPromos.length ? `<div class="promo-callout">${catPromos.map(p => {
    const card = cards.find(c => c.id === p.cardId);
    const d = daysUntil(p.expires);
    return `<div class="promo-callout-row">🔥 <b>${card.name}</b>: ${p.description}${p.expires ? ` <span class="promo-expiry">(vence ${d <= 0 ? 'hoy' : 'en ' + d + 'd'})</span>` : ''}</div>`;
  }).join('')}</div>` : '';

  const topG = issuerGradient(top.card.issuer, top.card.gradient);
  out.innerHTML = `
    ${promoHtml}
    <div class="spotlight" style="--g1:${topG[0]};--g2:${topG[1]}">
      <div class="spotlight-label">${isPinned ? `📌 Tu tarjeta fija para ${cat.icon} ${cat.label}` : `Usa esta para ${cat.icon} ${cat.label}`}</div>
      <div class="spotlight-card" data-carddetail="${top.card.id}">
        <div class="spotlight-name">${top.card.name} ${networkBadgeHTML(top.card.network)}</div>
        <div class="spotlight-rate">${unitLabel(top.card, top.rate)}</div>
      </div>
      <div class="spotlight-why">${top.matched ? `Da ${unitLabel(top.card, top.rate)} en ${cat.label.toLowerCase()}` : `Tasa base (sin categoría especial aquí)`}${top.card.rotating ? ' · revisa si la categoría rotativa está activa este trimestre ⚠️' : ''}</div>
      <button class="pin-toggle" data-pincat="${categoryId}" data-pincard="${top.card.id}">${isPinned ? '📌 Quitar tarjeta fija' : '📌 Fijar esta tarjeta para ' + cat.label.toLowerCase()}</button>
    </div>
    ${rest.length ? `<div class="rest-list">${rest.map(r => {
      const g = issuerGradient(r.card.issuer, r.card.gradient);
      return `
      <div class="rest-row" data-carddetail="${r.card.id}">
        <div class="rest-swatch" style="background:linear-gradient(135deg, ${g[0]}, ${g[1]})"></div>
        <div class="rest-name">${r.card.name}</div>
        <div class="rest-rate">${unitLabel(r.card, r.rate)}</div>
      </div>`;
    }).join('')}</div>` : ''}
  `;
  const pinBtn = $('.pin-toggle', out);
  if (pinBtn) pinBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (isPinned) delete pins[categoryId];
    else pins[categoryId] = top.card.id;
    savePins(pins);
    renderResult(categoryId);
  });
  $$('[data-carddetail]', out).forEach(el => el.addEventListener('click', () => openCardDetailModal(el.dataset.carddetail)));
}

// Paso 3 estilo "Pointers": detalle completo de una tarjeta, en modal.
function openCardDetailModal(cardId) {
  const c = cards.find(x => x.id === cardId);
  if (!c) return;
  const g = issuerGradient(c.issuer, c.gradient);
  const allTags = Object.entries(c.categories || {}).map(([k, v]) => {
    const cat = CATEGORIES.find(x => x.id === k);
    return cat && v > 0 ? `<span class="tag">${cat.icon} ${unitLabel(c, v)}</span>` : '';
  }).join('') || `<span class="tag">Base ${unitLabel(c, c.base ?? 1)}</span>`;
  const credits = c.credits || [];
  const creditsHtml = credits.length
    ? credits.map(cr => `<div class="credit-row"><span class="credit-label">${cr.label}</span><span class="credit-amount">$${cr.amount}/${cr.period === 'monthly' ? 'mes' : cr.period === 'quarterly' ? 'trim' : 'año'}${isCreditUsed(cr) ? ' · usado' : ''}</span></div>`).join('')
    : `<p class="hint" style="padding:0">Sin créditos agregados.</p>`;
  const visualStyle = c.photo
    ? `background-image:url(${c.photo});background-size:cover;background-position:center`
    : `background:linear-gradient(135deg, ${g[0]}, ${g[1]})`;
  $('#carddetail-body').innerHTML = `
    <div class="card-visual${c.photo ? ' has-photo' : ''}" style="${visualStyle}">
      <div class="card-visual-top">
        <div class="card-chip"></div>
        <div class="card-visual-network">${networkBadgeHTML(c.network) || '<span class="net-badge net-generic">💳</span>'}</div>
      </div>
      <div class="card-visual-number">•••• •••• •••• ${fakeLast4(c.id)}</div>
      <div class="card-visual-bottom">
        <div class="card-visual-name">${c.name}</div>
        <div class="card-visual-issuer">${c.issuer || ''}${c.openedDate ? ' · desde ' + formatDateEs(c.openedDate) : ''}${c.business ? ' · negocio' : ''}</div>
      </div>
    </div>
    <div class="photo-actions">
      <label class="btn-secondary tiny" for="carddetail-photo-input">📷 ${c.photo ? 'Cambiar foto' : 'Subir foto real'}</label>
      <input type="file" accept="image/*" id="carddetail-photo-input" class="hidden">
      ${c.photo ? `<button class="btn-secondary tiny" id="carddetail-photo-remove">Quitar foto</button>` : ''}
    </div>
    <div class="mycard-cats" style="margin-top:14px">${allTags}</div>
    <div class="detail-subhead">Red de pago</div>
    <select class="text-input tiny" id="carddetail-network" data-network="${c.id}">
      <option value="" ${!c.network ? 'selected' : ''}>Sin logo / no sé</option>
      <option value="visa" ${c.network === 'visa' ? 'selected' : ''}>Visa</option>
      <option value="mastercard" ${c.network === 'mastercard' ? 'selected' : ''}>Mastercard</option>
      <option value="amex" ${c.network === 'amex' ? 'selected' : ''}>American Express</option>
      <option value="discover" ${c.network === 'discover' ? 'selected' : ''}>Discover</option>
      <option value="store" ${c.network === 'store' ? 'selected' : ''}>Tarjeta de tienda (sin red)</option>
    </select>
    <div class="detail-subhead">Anualidad</div>
    <p class="hint" style="padding:0 0 6px">$${c.annualFee ?? 0}${c.openedDate ? ' · próxima renovación: ' + formatDateEs(nextAnniversary(c.openedDate)) : ''}</p>
    <div class="detail-subhead">Créditos recurrentes</div>
    <div class="credits-list">${creditsHtml}</div>
    ${(c.perks || []).length ? `
    <div class="detail-subhead">Beneficios</div>
    <ul class="perks-list">${c.perks.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
  `;
  $('#carddetail-network').addEventListener('change', e => {
    c.network = e.target.value || null;
    saveCards(cards);
    renderCardsScreen();
    renderResult(pendingCategory);
    openCardDetailModal(cardId);
  });
  $('#carddetail-photo-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    resizeImageToDataURL(file, 640, 0.85).then(dataUrl => {
      c.photo = dataUrl;
      saveCards(cards);
      renderCardsScreen();
      renderResult(pendingCategory);
      openCardDetailModal(cardId);
    });
  });
  const removeBtn = $('#carddetail-photo-remove');
  if (removeBtn) removeBtn.addEventListener('click', () => {
    delete c.photo;
    saveCards(cards);
    renderCardsScreen();
    renderResult(pendingCategory);
    openCardDetailModal(cardId);
  });
  $('#carddetail-modal-backdrop').classList.remove('hidden');
}

// Comprime y redimensiona la foto subida antes de guardarla en localStorage (que tiene límite de tamaño).
function resizeImageToDataURL(file, maxWidth, quality) {
  return new Promise(resolve => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function closeCardDetailModal() { $('#carddetail-modal-backdrop').classList.add('hidden'); }

function setupMerchantSearch() {
  const input = $('#merchant-input');
  input.addEventListener('input', () => {
    const guess = guessCategory(input.value);
    if (guess) { pendingCategory = guess; renderPointerList(); renderResult(guess); }
    else if (!input.value.trim()) { renderPointerList(); renderResult(pendingCategory); }
    else { $('#result-area').innerHTML = `<p class="hint">No reconozco ese comercio todavía — elige una categoría de la lista 👆</p>`; }
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
    const g = issuerGradient(c.issuer, c.gradient);
    const credits = c.credits || [];
    const creditsHtml = credits.map(cr => `
      <label class="credit-row">
        <input type="checkbox" data-credit-toggle="${c.id}|${cr.id}" ${isCreditUsed(cr) ? 'checked' : ''}>
        <span class="credit-label">${cr.label}</span>
        <span class="credit-amount">$${cr.amount}/${cr.period === 'monthly' ? 'mes' : cr.period === 'quarterly' ? 'trim' : 'año'}</span>
        <button class="icon-btn tiny" data-credit-del="${c.id}|${cr.id}">✕</button>
      </label>
    `).join('');
    const thumbStyle = c.photo
      ? `background-image:url(${c.photo})`
      : `background:linear-gradient(135deg, ${g[0]}, ${g[1]})`;
    return `
    <div class="mycard-row" data-toggle="${c.id}" style="--g1:${g[0]};--g2:${g[1]}">
      <div class="mycard-thumb" style="${thumbStyle}"></div>
      <div class="mycard-row-name">${c.name} ${networkBadgeHTML(c.network)}${c.rewardsPoints ? `<div class="mycard-row-rewards">${c.rewardsPoints.toLocaleString('es')} pts</div>` : ''}</div>
      <div class="mycard-row-right">${statsHtml}<span class="chevron">›</span></div>
    </div>
    <div class="mycard-detail hidden" id="detail-${c.id}">
      <div class="mycard-detail-issuer">${c.issuer || ''}${c.openedDate ? ' · desde ' + formatDateEs(c.openedDate) : ''}${c.business ? ' · negocio (no cuenta 5/24)' : ''}</div>
      <div class="mycard-cats">${allTags}</div>

      <div class="detail-subhead">Rewards / puntos actuales</div>
      <div class="fee-row">
        <input type="number" min="0" class="fee-input" data-rewards="${c.id}" placeholder="0" value="${c.rewardsPoints ?? ''}">
        ${c.rewardsUpdated ? `<span class="fee-next">actualizado: ${formatDateEs(c.rewardsUpdated)}</span>` : `<span class="fee-next">actualízalo tú desde el app del banco</span>`}
      </div>

      <div class="detail-subhead">Anualidad</div>
      <div class="fee-row">
        <span>$</span><input type="number" min="0" class="fee-input" data-fee="${c.id}" value="${c.annualFee ?? 0}">
        ${c.openedDate ? `<span class="fee-next">próxima renovación: ${formatDateEs(nextAnniversary(c.openedDate))}</span>` : ''}
      </div>

      <div class="detail-subhead">Créditos recurrentes</div>
      <div class="credits-list">${creditsHtml || '<p class="hint" style="padding:0">Sin créditos agregados.</p>'}</div>
      <div class="credit-add-row">
        <input type="text" class="text-input tiny" placeholder="ej. Uber" data-newcredit-label="${c.id}">
        <input type="number" min="0" class="text-input tiny" placeholder="$" data-newcredit-amount="${c.id}">
        <select class="text-input tiny" data-newcredit-period="${c.id}">
          <option value="monthly">Mensual</option>
          <option value="quarterly">Trimestral</option>
          <option value="yearly">Anual</option>
        </select>
        <button class="btn-secondary tiny" data-newcredit-add="${c.id}">+</button>
      </div>

      ${(c.perks || []).length ? `
      <div class="detail-subhead">Beneficios</div>
      <ul class="perks-list">${c.perks.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}

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
  $$('[data-fee]', list).forEach(inp => inp.addEventListener('change', () => {
    const card = cards.find(c => c.id === inp.dataset.fee);
    if (card) { card.annualFee = parseFloat(inp.value) || 0; saveCards(cards); }
  }));
  $$('[data-rewards]', list).forEach(inp => inp.addEventListener('change', () => {
    const card = cards.find(c => c.id === inp.dataset.rewards);
    if (card) {
      const v = parseFloat(inp.value);
      card.rewardsPoints = v > 0 ? v : null;
      card.rewardsUpdated = card.rewardsPoints ? todayISO() : null;
      saveCards(cards);
      renderCardsScreen();
    }
  }));
  $$('[data-credit-toggle]', list).forEach(cb => cb.addEventListener('change', () => {
    const [cardId, creditId] = cb.dataset.creditToggle.split('|');
    const card = cards.find(c => c.id === cardId);
    const credit = card?.credits?.find(cr => cr.id === creditId);
    if (credit) {
      credit.usedPeriodKey = cb.checked ? creditPeriodKey(credit.period) : null;
      saveCards(cards);
    }
  }));
  $$('[data-credit-del]', list).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const [cardId, creditId] = b.dataset.creditDel.split('|');
    const card = cards.find(c => c.id === cardId);
    if (card) { card.credits = (card.credits || []).filter(cr => cr.id !== creditId); saveCards(cards); renderCardsScreen(); }
  }));
  $$('[data-newcredit-add]', list).forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const cardId = b.dataset.newcreditAdd;
    const card = cards.find(c => c.id === cardId);
    const label = $(`[data-newcredit-label="${cardId}"]`, list).value.trim();
    const amount = parseFloat($(`[data-newcredit-amount="${cardId}"]`, list).value) || 0;
    const period = $(`[data-newcredit-period="${cardId}"]`, list).value;
    if (card && label && amount > 0) {
      card.credits = card.credits || [];
      card.credits.push({ id: uid(), label, amount, period, usedPeriodKey: null });
      saveCards(cards);
      renderCardsScreen();
      $(`[data-toggle="${cardId}"]`, list)?.classList.add('open');
      $(`#detail-${cardId}`, list)?.classList.remove('hidden');
    }
  }));

  renderPromoList();
}

// ---------- Promociones: lista y gestión ----------
function renderPromoList() {
  const list = $('#promo-list');
  if (!list) return;
  if (!promos.length) { list.innerHTML = `<p class="hint">Sin promociones agregadas todavía.</p>`; return; }
  list.innerHTML = promos.map(p => {
    const card = cards.find(c => c.id === p.cardId);
    const cat = CATEGORIES.find(c => c.id === p.categoryId);
    const expired = p.expires && p.expires < todayISO();
    return `
    <div class="promo-row${expired ? ' expired' : ''}">
      <div class="promo-row-info">
        <div class="promo-row-desc">${p.description}</div>
        <div class="promo-row-meta">${card ? card.name : 'Tarjeta eliminada'}${cat ? ' · ' + cat.icon + ' ' + cat.label : ''}${p.expires ? ' · vence ' + formatDateEs(p.expires) : ''}${expired ? ' · vencida' : ''}</div>
      </div>
      <button class="icon-btn tiny" data-promo-del="${p.id}">✕</button>
    </div>`;
  }).join('');
  $$('[data-promo-del]', list).forEach(b => b.addEventListener('click', () => {
    promos = promos.filter(p => p.id !== b.dataset.promoDel);
    savePromos(promos);
    renderPromoList();
    renderPromoBanner();
    renderResult(pendingCategory);
  }));
}

function openPromoModal() {
  if (!cards.length) return;
  $('#promo-card').innerHTML = cards.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  $('#promo-cat').innerHTML = `<option value="">Cualquier categoría</option>` + CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.label}</option>`).join('');
  $('#promo-desc').value = '';
  $('#promo-expires').value = '';
  $('#promo-modal-backdrop').classList.remove('hidden');
}
function closePromoModal() { $('#promo-modal-backdrop').classList.add('hidden'); }

function setupPromoForm() {
  $('#promo-save').addEventListener('click', () => {
    const cardId = $('#promo-card').value;
    const categoryId = $('#promo-cat').value;
    const description = $('#promo-desc').value.trim();
    const expires = $('#promo-expires').value || null;
    if (!cardId || !description) { $('#promo-desc').focus(); return; }
    promos.push({ id: uid(), cardId, categoryId, description, expires });
    savePromos(promos);
    closePromoModal();
    renderPromoList();
    renderPromoBanner();
    renderResult(pendingCategory);
  });
}

// ---------- Resumen ----------
function renderSummaryScreen() {
  if (!cards.length) {
    $('#summary-tiles').innerHTML = '';
    $('#summary-rewards').innerHTML = '';
    $('#summary-524').innerHTML = '';
    $('#summary-renewals').innerHTML = '';
    $('#summary-credits').innerHTML = `<p class="hint">Agrega tarjetas para ver tu resumen.</p>`;
    return;
  }
  const totalFees = cards.reduce((s, c) => s + (c.annualFee || 0), 0);
  const status524 = get524Status();
  const renewals = getUpcomingRenewals();
  const nextRenewal = renewals[0];
  const allCredits = cards.flatMap(c => (c.credits || []).map(cr => ({ ...cr, cardName: c.name, cardId: c.id })));
  const availableValue = allCredits.filter(cr => !isCreditUsed(cr))
    .reduce((s, cr) => s + (cr.period === 'monthly' ? cr.amount : cr.period === 'quarterly' ? cr.amount / 3 : cr.amount / 12), 0);

  $('#summary-tiles').innerHTML = `
    <div class="stat-tile"><div class="stat-num">${cards.length}</div><div class="stat-label">Tarjetas activas</div></div>
    <div class="stat-tile"><div class="stat-num">$${totalFees}</div><div class="stat-label">Anualidades/año</div></div>
    <div class="stat-tile"><div class="stat-num">${status524.count}/5</div><div class="stat-label">Regla 5/24</div></div>
    <div class="stat-tile"><div class="stat-num">$${Math.round(availableValue)}</div><div class="stat-label">Créditos/mes disp.</div></div>
  `;

  const rewardCards = cards.filter(c => c.rewardsPoints);
  $('#summary-rewards').innerHTML = `
    <div class="detail-subhead">Rewards / puntos (actualizados a mano)</div>
    ${rewardCards.length ? `<div class="rest-list">${rewardCards.map(c => `
      <div class="rest-row">
        <div class="rest-name">${c.name}${c.rewardsUpdated ? ` <span style="color:var(--text-dim);font-weight:500">· ${formatDateEs(c.rewardsUpdated)}</span>` : ''}</div>
        <div class="rest-rate">${c.rewardsPoints.toLocaleString('es')} pts</div>
      </div>
    `).join('')}</div>` : '<p class="hint">Anota tus puntos desde "Mis tarjetas" → abre una tarjeta → Rewards.</p>'}
  `;

  $('#summary-524').innerHTML = `
    <div class="detail-subhead">Regla 5/24 de Chase</div>
    <p class="hint" style="padding:4px 0 10px">
      ${status524.atLimit
        ? '⚠️ Estás en 5/24 o por encima — Chase probablemente te niegue tarjetas nuevas.'
        : `✅ Vas ${status524.count} de 5 — te quedan ${5 - status524.count} espacio(s) antes de tocar el límite.`}
    </p>
    ${status524.cards.length ? `<div class="rest-list">${status524.cards.map(c => `
      <div class="rest-row"><div class="rest-name">${c.name}</div><div class="rest-rate" style="color:var(--text-dim);font-weight:600;font-size:13px">${formatDateEs(c.openedDate)}</div></div>
    `).join('')}</div>` : ''}
  `;

  $('#summary-renewals').innerHTML = `
    <div class="detail-subhead">Próximas renovaciones</div>
    <div class="rest-list">${renewals.slice(0, 6).map(r => `
      <div class="rest-row"><div class="rest-name">${r.card.name}${r.card.annualFee ? ' · $' + r.card.annualFee : ''}</div><div class="rest-rate" style="color:var(--text-dim);font-weight:600;font-size:13px">${formatDateEs(r.next)}</div></div>
    `).join('') || '<p class="hint">Sin fechas registradas.</p>'}</div>
  `;

  $('#summary-credits').innerHTML = `
    <div class="detail-subhead">Créditos recurrentes</div>
    <div class="rest-list">${allCredits.length ? allCredits.map(cr => `
      <div class="rest-row">
        <div class="rest-name">${cr.label} <span style="color:var(--text-dim);font-weight:500">· ${cr.cardName}</span></div>
        <div class="rest-rate" style="${isCreditUsed(cr) ? 'color:var(--text-dim)' : ''}">${isCreditUsed(cr) ? '✓ usado' : '$' + cr.amount}</div>
      </div>
    `).join('') : '<p class="hint">Agrega créditos desde "Mis tarjetas" → abre una tarjeta.</p>'}</div>
  `;
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
  wrap.innerHTML = filtered.map(t => {
    const g = issuerGradient(t.issuer, t.gradient);
    return `
    <button class="tpl-row" data-tpl="${t.id}" ${already.has(t.id) ? 'disabled' : ''}>
      <span class="tpl-swatch" style="background:linear-gradient(135deg, ${g[0]}, ${g[1]})"></span>
      <span class="tpl-info"><b>${t.name}</b><small>${t.issuer}</small></span>
      <span class="tpl-add">${already.has(t.id) ? 'Agregada' : '+'}</span>
    </button>
  `;
  }).join('') || `<p class="hint">Ninguna coincide — puedes crear una tarjeta personalizada abajo.</p>`;

  $$('[data-tpl]', wrap).forEach(b => b.addEventListener('click', () => {
    if (b.disabled) return;
    const t = CARD_TEMPLATES.find(x => x.id === b.dataset.tpl);
    cards.push({ id: uid(), templateId: t.id, name: t.name, issuer: t.issuer, unit: t.unit, network: t.network || null,
      gradient: t.gradient, categories: { ...t.categories }, base: t.base, rotating: !!t.rotating,
      openedDate: todayISO(), annualFee: 0, credits: [] });
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
    const issuer = $('#custom-issuer').value.trim();
    const gradient = matchIssuerColor(issuer) || palette[cards.length % palette.length];
    const openedDate = $('#custom-opened').value || todayISO();
    const annualFee = parseFloat($('#custom-fee').value) || 0;
    cards.push({ id: uid(), name, issuer, unit, gradient, categories, base, openedDate, annualFee, credits: [] });
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
  $('#custom-opened').value = ''; $('#custom-fee').value = '0';
  $$('[data-cat]', $('#custom-cats')).forEach(i => i.value = '');
}

// ---------- Init ----------
function init() {
  setupMerchantSearch();
  setupCustomForm();
  setupPromoForm();

  $$('.tab-btn').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $('#add-card-btn').addEventListener('click', openAddModal);
  $('#add-card-btn-2').addEventListener('click', openAddModal);
  $('#add-card-btn-3').addEventListener('click', openAddModal);
  $('#modal-close').addEventListener('click', () => { closeAddModal(); resetCustomForm(); });
  $('#modal-backdrop').addEventListener('click', e => { if (e.target === e.currentTarget) { closeAddModal(); resetCustomForm(); } });
  $('#template-search').addEventListener('input', e => renderTemplatePicker(e.target.value));
  $('#show-custom-btn').addEventListener('click', openCustomForm);
  $('#custom-cancel').addEventListener('click', resetCustomForm);

  $('#add-promo-btn').addEventListener('click', openPromoModal);
  $('#promo-modal-close').addEventListener('click', closePromoModal);
  $('#promo-modal-backdrop').addEventListener('click', e => { if (e.target === e.currentTarget) closePromoModal(); });
  $('#promo-cancel').addEventListener('click', closePromoModal);

  $('#carddetail-close').addEventListener('click', closeCardDetailModal);
  $('#carddetail-modal-backdrop').addEventListener('click', e => { if (e.target === e.currentTarget) closeCardDetailModal(); });

  renderHome();
  renderCardsScreen();
  applyCategoryFromURL();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// Soporte para atajos de Apple Shortcuts (automatización "Al llegar" por categoría de lugar):
// abrir kado-app.onrender.com/?cat=groceries salta directo al resultado de esa categoría.
function applyCategoryFromURL() {
  const cat = new URLSearchParams(location.search).get('cat');
  if (!cat || !CATEGORIES.find(c => c.id === cat)) return;
  pendingCategory = cat;
  setTab('home');
}
document.addEventListener('DOMContentLoaded', init);
