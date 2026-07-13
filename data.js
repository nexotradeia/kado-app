// =====================================================
//  Kādo — datos: categorías, comercios conocidos y plantillas de tarjetas
// =====================================================

// Color fijo por banco — todas las tarjetas del mismo emisor comparten gradiente.
const ISSUER_COLORS = {
  'chase': ['#1d4ed8', '#3b82f6'],
  'american express': ['#b45309', '#fbbf24'],
  'amex': ['#b45309', '#fbbf24'],
  'capital one': ['#7c2d12', '#f97316'],
  'bank of america': ['#991b1b', '#f87171'],
  'bofa': ['#991b1b', '#f87171'],
  'citi': ['#0f766e', '#2dd4bf'],
  'wells fargo': ['#a16207', '#facc15'],
  'discover': ['#ea580c', '#fb923c'],
  'barclays': ['#1e3a8a', '#64748b'],
  'barclay': ['#1e3a8a', '#64748b'],
  'goldman sachs': ['#374151', '#9ca3af'],
  'synchrony': ['#4b5563', '#9ca3af'],
  'gap': ['#4b5563', '#9ca3af'],
  'target': ['#b91c1c', '#ef4444'],
  "victoria's secret": ['#831843', '#ec4899'],
  'us bank': ['#075985', '#38bdf8'],
  'marriott': ['#78350f', '#d97706'],
  'delta': ['#7f1d1d', '#dc2626'],
  'united': ['#1e3a8a', '#93c5fd']
};

// Busca el color del banco; null si no lo reconoce.
function matchIssuerColor(issuer) {
  const key = (issuer || '').trim().toLowerCase();
  if (!key) return null;
  for (const k in ISSUER_COLORS) {
    if (key.includes(k)) return ISSUER_COLORS[k];
  }
  return null;
}

// Devuelve el gradiente del banco si lo reconoce; si no, usa el guardado en la tarjeta o gris por defecto.
function issuerGradient(issuer, fallback) {
  return matchIssuerColor(issuer) || fallback || ['#4b5563', '#9ca3af'];
}

const CATEGORIES = [
  { id: 'dining',     label: 'Restaurantes',      icon: '🍽️' },
  { id: 'groceries',  label: 'Supermercado',      icon: '🛒' },
  { id: 'gas',        label: 'Gasolina',          icon: '⛽' },
  { id: 'travel',     label: 'Viajes',            icon: '✈️' },
  { id: 'drugstore',  label: 'Farmacia',          icon: '💊' },
  { id: 'streaming',  label: 'Streaming',         icon: '🎬' },
  { id: 'online',     label: 'Compras online',    icon: '🛍️' },
  { id: 'tech',       label: 'Electrónica/Tech',  icon: '📱' },
  { id: 'transit',    label: 'Transporte',        icon: '🚕' },
  { id: 'entertainment', label: 'Entretenimiento', icon: '🎟️' },
  { id: 'other',      label: 'Todo lo demás',     icon: '💳' }
];

// Diccionario de comercios -> categoría, para autocompletar al escribir dónde vas a comprar
const MERCHANTS = {
  'apple': 'tech', 'apple store': 'tech', 'best buy': 'tech', 'bestbuy': 'tech',
  'samsung': 'tech', 'microsoft': 'tech', 'b&h': 'tech',
  'whole foods': 'groceries', 'wholefoods': 'groceries', 'publix': 'groceries',
  'walmart': 'groceries', 'target': 'groceries', 'costco': 'groceries', 'trader joe': 'groceries',
  'aldi': 'groceries', 'kroger': 'groceries', 'winn-dixie': 'groceries', 'sedanos': 'groceries',
  'starbucks': 'dining', 'mcdonalds': 'dining', "mcdonald's": 'dining', 'chipotle': 'dining',
  'restaurant': 'dining', 'burger king': 'dining', 'subway': 'dining', 'dominos': 'dining',
  'uber eats': 'dining', 'doordash': 'dining', 'grubhub': 'dining',
  'uber': 'transit', 'lyft': 'transit', 'metro': 'transit', 'parking': 'transit',
  'amazon': 'online', 'ebay': 'online', 'etsy': 'online', 'shein': 'online', 'aliexpress': 'online',
  'netflix': 'streaming', 'spotify': 'streaming', 'disney': 'streaming', 'hbo': 'streaming',
  'hulu': 'streaming', 'youtube': 'streaming', 'apple music': 'streaming',
  'shell': 'gas', 'chevron': 'gas', 'exxon': 'gas', 'mobil': 'gas', 'bp': 'gas', 'wawa': 'gas',
  'cvs': 'drugstore', 'walgreens': 'drugstore', 'rite aid': 'drugstore', 'farmacia': 'drugstore',
  'delta': 'travel', 'american airlines': 'travel', 'united': 'travel', 'marriott': 'travel',
  'hilton': 'travel', 'hotel': 'travel', 'airbnb': 'travel', 'expedia': 'travel', 'aeropuerto': 'travel',
  'vuelo': 'travel', 'avianca': 'travel', 'jetblue': 'travel', 'southwest': 'travel',
  'cine': 'entertainment', 'cinema': 'entertainment', 'amc': 'entertainment', 'concierto': 'entertainment'
};

function guessCategory(text) {
  const q = (text || '').trim().toLowerCase();
  if (!q) return null;
  if (MERCHANTS[q]) return MERCHANTS[q];
  for (const key in MERCHANTS) {
    if (q.includes(key) || key.includes(q)) return MERCHANTS[key];
  }
  const cat = CATEGORIES.find(c => c.label.toLowerCase().includes(q) || q.includes(c.label.toLowerCase()));
  return cat ? cat.id : null;
}

// Plantillas de tarjetas populares en EE.UU. — multiplicador por categoría.
// unit: 'x' (puntos/millas por dólar) o '%' (cashback). rotating: la categoría top cambia (revisar activación).
const CARD_TEMPLATES = [
  { id: 'csp', name: 'Chase Sapphire Preferred', issuer: 'Chase', unit: 'x', gradient: ['#1e3a8a', '#3b82f6'], network: 'visa',
    categories: { dining: 3, streaming: 3, travel: 2, online: 3 }, base: 1 },
  { id: 'csr', name: 'Chase Sapphire Reserve', issuer: 'Chase', unit: 'x', gradient: ['#0f172a', '#334155'], network: 'visa',
    categories: { dining: 3, travel: 3 }, base: 1 },
  { id: 'cfu', name: 'Chase Freedom Unlimited', issuer: 'Chase', unit: '%', gradient: ['#2563eb', '#60a5fa'], network: 'mastercard',
    categories: { dining: 3, drugstore: 3, travel: 1.5 }, base: 1.5 },
  { id: 'cff', name: 'Chase Freedom Flex', issuer: 'Chase', unit: '%', gradient: ['#1d4ed8', '#38bdf8'], network: 'mastercard',
    categories: { dining: 3, drugstore: 3 }, base: 1, rotating: true },
  { id: 'amexgold', name: 'Amex Gold', issuer: 'American Express', unit: 'x', gradient: ['#b45309', '#fbbf24'], network: 'amex',
    categories: { dining: 4, groceries: 4, travel: 3 }, base: 1 },
  { id: 'amexplat', name: 'Amex Platinum', issuer: 'American Express', unit: 'x', gradient: ['#64748b', '#e2e8f0'], network: 'amex',
    categories: { travel: 5 }, base: 1 },
  { id: 'bcp', name: 'Amex Blue Cash Preferred', issuer: 'American Express', unit: '%', gradient: ['#0ea5e9', '#38bdf8'], network: 'amex',
    categories: { groceries: 6, streaming: 6, gas: 3 }, base: 1 },
  { id: 'bce', name: 'Amex Blue Cash Everyday', issuer: 'American Express', unit: '%', gradient: ['#0284c7', '#7dd3fc'], network: 'amex',
    categories: { groceries: 3, gas: 3, online: 3 }, base: 1 },
  { id: 'citidc', name: 'Citi Double Cash', issuer: 'Citi', unit: '%', gradient: ['#1e293b', '#475569'], network: 'mastercard',
    categories: {}, base: 2 },
  { id: 'citicc', name: 'Citi Custom Cash', issuer: 'Citi', unit: '%', gradient: ['#334155', '#94a3b8'], network: 'mastercard',
    categories: {}, base: 1, rotating: true },
  { id: 'savor', name: 'Capital One Savor', issuer: 'Capital One', unit: '%', gradient: ['#7c2d12', '#f97316'], network: 'mastercard',
    categories: { dining: 4, entertainment: 4, streaming: 4, groceries: 3 }, base: 1 },
  { id: 'savorone', name: 'Capital One SavorOne', issuer: 'Capital One', unit: '%', gradient: ['#9a3412', '#fb923c'], network: 'mastercard',
    categories: { dining: 3, entertainment: 3, streaming: 3, groceries: 3 }, base: 1 },
  { id: 'venture', name: 'Capital One Venture', issuer: 'Capital One', unit: 'x', gradient: ['#4c1d95', '#a78bfa'], network: 'visa',
    categories: {}, base: 2 },
  { id: 'venturex', name: 'Capital One Venture X', issuer: 'Capital One', unit: 'x', gradient: ['#5b21b6', '#c4b5fd'], network: 'visa',
    categories: { travel: 5 }, base: 2 },
  { id: 'wfac', name: 'Wells Fargo Active Cash', issuer: 'Wells Fargo', unit: '%', gradient: ['#facc15', '#fde68a'], network: 'visa',
    categories: {}, base: 2 },
  { id: 'bocc', name: 'BofA Customized Cash Rewards', issuer: 'Bank of America', unit: '%', gradient: ['#991b1b', '#f87171'], network: 'visa',
    categories: { groceries: 2 }, base: 1, rotating: true },
  { id: 'applecard', name: 'Apple Card', issuer: 'Goldman Sachs', unit: '%', gradient: ['#374151', '#9ca3af'], network: 'mastercard',
    categories: { tech: 3, transit: 2 }, base: 1 },
  { id: 'target', name: 'Target RedCard', issuer: 'Target', unit: '%', gradient: ['#b91c1c', '#ef4444'], network: 'mastercard',
    categories: {}, base: 0 },
  { id: 'discoverit', name: 'Discover it Cash Back', issuer: 'Discover', unit: '%', gradient: ['#ea580c', '#fb923c'], network: 'discover',
    categories: {}, base: 1, rotating: true }
];

// Tus tarjetas reales (de tu tracker de la regla 5/24). Se cargan solo la primera vez que abres la app
// (si borras alguna, no vuelve a aparecer). Ajusta cualquiera desde "Mis tarjetas" si el nombre, la tasa,
// la anualidad o la fecha no es exacta. business:true = no cuenta para el 5/24 (Ink Business no reporta a Chase 5/24).
const MY_CARDS = [
  { id: 'my-boa1', name: 'Bank of America #1', issuer: 'Bank of America', openedDate: '2019-10-28', network: 'visa',
    unit: '%', gradient: ['#991b1b', '#f87171'], categories: {}, base: 1, annualFee: 0, credits: [],
    perks: ['Producto exacto sin identificar — revisa la app de BofA para tus beneficios reales (protección de compra, seguro de auto de renta varían por producto)'] },
  { id: 'my-csp', name: 'Chase Sapphire Preferred', issuer: 'Chase', openedDate: '2022-05-01', network: 'visa',
    unit: 'x', gradient: ['#1e3a8a', '#3b82f6'], categories: { dining: 3, streaming: 3, travel: 2, online: 3, gas: 3 }, base: 1, annualFee: 95,
    credits: [{ id: 'seed-csp-hotel', label: 'Crédito hotel (Chase Travel)', amount: 100, period: 'yearly', usedPeriodKey: null }],
    perks: ['Seguro primario de auto de renta', 'Protección de compra y garantía extendida', 'Seguro de cancelación/interrupción de viaje', 'Evacuación de emergencia y transporte médico', 'Crédito Global Entry/TSA PreCheck hasta $120 (cada 4 años)', 'Apple TV gratis 1 año (activar antes del 31 dic 2026)', 'Sin cargos por transacciones extranjeras'] },
  { id: 'my-inkunlimited', name: 'Chase Ink Business Unlimited', issuer: 'Chase', openedDate: '2023-02-01', business: true, network: 'visa',
    unit: '%', gradient: ['#0f172a', '#334155'], categories: {}, base: 1.5, annualFee: 0, credits: [],
    perks: ['Protección de compra hasta $10,000/artículo (120 días)', 'Garantía extendida +1 año (hasta $10,000)', 'Seguro de auto de renta (uso de negocio)', 'Asistencia en carretera (roadside dispatch)'] },
  { id: 'my-freedom2023', name: 'Chase Freedom Unlimited', issuer: 'Chase', openedDate: '2023-04-01', network: 'mastercard',
    unit: '%', gradient: ['#2563eb', '#60a5fa'], categories: { dining: 3, drugstore: 3, travel: 1.5 }, base: 1.5, annualFee: 0, credits: [],
    perks: ['Protección de compra hasta $500/artículo (120 días)', 'Garantía extendida +1 año', 'Sin anualidad', 'Nota: NO incluye protección de celular (eso es solo Freedom Flex)'] },
  { id: 'my-amex2020', name: 'Amex EveryDay', issuer: 'American Express', openedDate: '2020-05-21', network: 'amex',
    unit: 'x', gradient: ['#b45309', '#fbbf24'], categories: {}, base: 1, annualFee: 0, credits: [],
    perks: ['Protección de compra 90 días, hasta $1,000/compra', 'Acceso a Amex Offers (descuentos personalizados)', 'Sin anualidad'] },
  { id: 'my-boa2', name: 'Bank of America #2', issuer: 'Bank of America', openedDate: '2020-05-07', network: 'visa',
    unit: '%', gradient: ['#b91c1c', '#ef4444'], categories: {}, base: 1, annualFee: 0, credits: [],
    perks: ['Producto exacto sin identificar — revisa la app de BofA para tus beneficios reales'] },
  { id: 'my-barclay', name: 'Barclay', issuer: 'Barclays', openedDate: '2017-09-14', network: 'visa',
    unit: '%', gradient: ['#334155', '#64748b'], categories: {}, base: 1, annualFee: 0, credits: [],
    perks: ['Producto exacto sin identificar (Barclays tiene varias líneas: Uber, JetBlue, AAdvantage, etc.) — revisa tu estado de cuenta para saber cuál es'] },
  { id: 'my-gap', name: 'GAP Visa', issuer: 'GAP / Synchrony', openedDate: '2017-06-11', network: 'visa',
    unit: '%', gradient: ['#1f2937', '#4b5563'], categories: {}, base: 1, annualFee: 0, credits: [],
    perks: ['Descuentos exclusivos en Gap, Old Navy, Banana Republic y Athleta', 'Puntos extra por compras en tiendas de la familia GAP', 'Regalo de cumpleaños (varía por año)'] },
  { id: 'my-victoria', name: "Victoria's Secret Angel Card", issuer: "Victoria's Secret / Comenity", openedDate: '2017-01-05', network: 'store',
    unit: '%', gradient: ['#831843', '#ec4899'], categories: {}, base: 0, annualFee: 0, credits: [],
    perks: ['Tarjeta de tienda — solo funciona en Victoria\'s Secret y PINK', 'Ofertas y descuentos exclusivos "Angel"', 'Regalo de cumpleaños'] },
  { id: 'my-chase2014', name: 'Chase (2014)', issuer: 'Chase', openedDate: '2014-06-09', network: 'visa',
    unit: 'x', gradient: ['#1e40af', '#60a5fa'], categories: {}, base: 1, annualFee: 0, credits: [],
    perks: ['Producto exacto sin identificar (tarjeta antigua de 2014) — revisa tu estado de cuenta Chase para confirmar cuál es'] },
  { id: 'my-amexgold', name: 'Amex Gold', issuer: 'American Express', openedDate: '2023-11-06', network: 'amex',
    unit: 'x', gradient: ['#b45309', '#fbbf24'], categories: { dining: 4, groceries: 4, travel: 3 }, base: 1, annualFee: 325,
    credits: [
      { id: 'seed-gold-uber', label: 'Uber Cash', amount: 10, period: 'monthly', usedPeriodKey: null },
      { id: 'seed-gold-dining', label: 'Crédito cena (Grubhub/Cheesecake Factory/etc)', amount: 10, period: 'monthly', usedPeriodKey: null },
      { id: 'seed-gold-resy', label: 'Crédito Resy (se reparte $50 ene-jun + $50 jul-dic)', amount: 100, period: 'yearly', usedPeriodKey: null }
    ],
    perks: ['Sin cargos por transacciones extranjeras', 'Protección de compra y seguro de equipaje', 'Acceso a eventos Amex/Resy'] },
  { id: 'my-venture', name: 'Capital One Venture', issuer: 'Capital One', openedDate: '2024-05-11', network: 'visa',
    unit: 'x', gradient: ['#4c1d95', '#a78bfa'], categories: {}, base: 2, annualFee: 95, credits: [],
    perks: ['Crédito Global Entry/TSA PreCheck hasta $120 (cada 4 años, no es anual)', 'Seguro de accidente de viaje hasta $1M', 'Cobertura de auto de renta (CDW)', 'Sin cargos por transacciones extranjeras'] },
  { id: 'my-inkpreferred', name: 'Chase Ink Business Preferred', issuer: 'Chase', openedDate: '2024-07-01', business: true, network: 'visa',
    unit: 'x', gradient: ['#0369a1', '#38bdf8'], categories: { travel: 3, online: 3 }, base: 1, annualFee: 95, credits: [],
    perks: ['Protección de celular hasta $1,000/reclamo (paga tu bill con esta tarjeta)', 'Seguro primario de auto de renta (uso de negocio)', 'Seguro de cancelación/interrupción de viaje', 'Protección de compra y garantía extendida'] },
  { id: 'my-united', name: 'United MileagePlus Card', issuer: 'Chase', openedDate: '2025-01-01', network: 'visa',
    unit: 'x', gradient: ['#1e3a8a', '#93c5fd'], categories: { travel: 2, dining: 2 }, base: 1, annualFee: 0, credits: [],
    rewardsPoints: 192416, rewardsUpdated: '2026-07-13',
    perks: ['Asumiendo que es United Gateway ($0 anualidad) — revisa si en realidad es el Explorer ($150/año, con maleta gratis automática)', '25% de reembolso en compras a bordo de United (comida/bebida/wifi)', '2 maletas facturadas gratis si gastas $10,000/año', 'Sin cargos por transacciones extranjeras'] },
  { id: 'my-applecard', name: 'Apple Card', issuer: 'Goldman Sachs', openedDate: '2025-01-01', network: 'mastercard',
    unit: '%', gradient: ['#374151', '#9ca3af'], categories: { tech: 3, transit: 2 }, base: 1, annualFee: 0, credits: [],
    perks: ['Hasta 3% Daily Cash (3% Apple/Uber, 2% Apple Pay, 1% tarjeta física)', 'Sin anualidad, sin cargos por mora ni transacción extranjera', 'Daily Cash puede generar 3.40% APY en Apple Savings', 'Beneficios Hertz: 5% desc. Pay Later, asistencia en carretera', 'NO incluye protección de compra ni AppleCare'] },
  { id: 'my-mastercard', name: 'Capital One Mastercard', issuer: 'Capital One', openedDate: '2022-07-01', network: 'mastercard',
    unit: '%', gradient: ['#7c2d12', '#f97316'], categories: {}, base: 1, annualFee: 0, credits: [],
    perks: ['Producto exacto sin identificar (Cap One tiene varias líneas Mastercard) — revisa tu estado de cuenta para confirmar cuál es'] },
  { id: 'my-deltagold', name: 'Delta SkyMiles Gold Amex', issuer: 'American Express', openedDate: '2026-02-01', network: 'amex',
    unit: 'x', gradient: ['#7f1d1d', '#dc2626'], categories: { dining: 2, groceries: 2, travel: 2 }, base: 1, annualFee: 0,
    credits: [{ id: 'seed-delta-stays', label: 'Crédito Delta Stays (hoteles prepagados)', amount: 100, period: 'yearly', usedPeriodKey: null }],
    rewardsPoints: 97230, rewardsUpdated: '2026-07-13',
    perks: ['1ra maleta facturada gratis (+ hasta 8 acompañantes en la misma reserva)', '2da maleta gratis en vuelos domésticos', 'Abordaje prioritario Zona 5', '15% descuento en vuelos pagados con millas', '20% de reembolso en compras a bordo (comida/bebida)', 'Crédito de $200 en vuelo tras gastar $10,000/año', '⚠️ Anualidad $0 el primer año, luego $150 — verifica tu próxima renovación'] }
];
