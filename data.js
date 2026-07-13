// =====================================================
//  Kādo — datos: categorías, comercios conocidos y plantillas de tarjetas
// =====================================================

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
  { id: 'csp', name: 'Chase Sapphire Preferred', issuer: 'Chase', unit: 'x', gradient: ['#1e3a8a', '#3b82f6'],
    categories: { dining: 3, streaming: 3, travel: 2, online: 3 }, base: 1 },
  { id: 'csr', name: 'Chase Sapphire Reserve', issuer: 'Chase', unit: 'x', gradient: ['#0f172a', '#334155'],
    categories: { dining: 3, travel: 3 }, base: 1 },
  { id: 'cfu', name: 'Chase Freedom Unlimited', issuer: 'Chase', unit: '%', gradient: ['#2563eb', '#60a5fa'],
    categories: { dining: 3, drugstore: 3, travel: 1.5 }, base: 1.5 },
  { id: 'cff', name: 'Chase Freedom Flex', issuer: 'Chase', unit: '%', gradient: ['#1d4ed8', '#38bdf8'],
    categories: { dining: 3, drugstore: 3 }, base: 1, rotating: true },
  { id: 'amexgold', name: 'Amex Gold', issuer: 'American Express', unit: 'x', gradient: ['#b45309', '#fbbf24'],
    categories: { dining: 4, groceries: 4, travel: 3 }, base: 1 },
  { id: 'amexplat', name: 'Amex Platinum', issuer: 'American Express', unit: 'x', gradient: ['#64748b', '#e2e8f0'],
    categories: { travel: 5 }, base: 1 },
  { id: 'bcp', name: 'Amex Blue Cash Preferred', issuer: 'American Express', unit: '%', gradient: ['#0ea5e9', '#38bdf8'],
    categories: { groceries: 6, streaming: 6, gas: 3 }, base: 1 },
  { id: 'bce', name: 'Amex Blue Cash Everyday', issuer: 'American Express', unit: '%', gradient: ['#0284c7', '#7dd3fc'],
    categories: { groceries: 3, gas: 3, online: 3 }, base: 1 },
  { id: 'citidc', name: 'Citi Double Cash', issuer: 'Citi', unit: '%', gradient: ['#1e293b', '#475569'],
    categories: {}, base: 2 },
  { id: 'citicc', name: 'Citi Custom Cash', issuer: 'Citi', unit: '%', gradient: ['#334155', '#94a3b8'],
    categories: {}, base: 1, rotating: true },
  { id: 'savor', name: 'Capital One Savor', issuer: 'Capital One', unit: '%', gradient: ['#7c2d12', '#f97316'],
    categories: { dining: 4, entertainment: 4, streaming: 4, groceries: 3 }, base: 1 },
  { id: 'savorone', name: 'Capital One SavorOne', issuer: 'Capital One', unit: '%', gradient: ['#9a3412', '#fb923c'],
    categories: { dining: 3, entertainment: 3, streaming: 3, groceries: 3 }, base: 1 },
  { id: 'venture', name: 'Capital One Venture', issuer: 'Capital One', unit: 'x', gradient: ['#4c1d95', '#a78bfa'],
    categories: {}, base: 2 },
  { id: 'venturex', name: 'Capital One Venture X', issuer: 'Capital One', unit: 'x', gradient: ['#5b21b6', '#c4b5fd'],
    categories: { travel: 5 }, base: 2 },
  { id: 'wfac', name: 'Wells Fargo Active Cash', issuer: 'Wells Fargo', unit: '%', gradient: ['#facc15', '#fde68a'],
    categories: {}, base: 2 },
  { id: 'bocc', name: 'BofA Customized Cash Rewards', issuer: 'Bank of America', unit: '%', gradient: ['#991b1b', '#f87171'],
    categories: { groceries: 2 }, base: 1, rotating: true },
  { id: 'applecard', name: 'Apple Card', issuer: 'Goldman Sachs', unit: '%', gradient: ['#374151', '#9ca3af'],
    categories: { tech: 3, transit: 2 }, base: 1 },
  { id: 'target', name: 'Target RedCard', issuer: 'Target', unit: '%', gradient: ['#b91c1c', '#ef4444'],
    categories: {}, base: 0 },
  { id: 'discoverit', name: 'Discover it Cash Back', issuer: 'Discover', unit: '%', gradient: ['#ea580c', '#fb923c'],
    categories: {}, base: 1, rotating: true }
];
