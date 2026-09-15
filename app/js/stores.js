/* Magazine predefinite pentru cardurile de fidelitate.
   Fiecare card apare cu sigla originala a magazinului, pe culoarea lui
   (siglele sunt luate de pe site-urile magazinelor si de pe Wikimedia Commons).

   bg    - culoarea cardului
   fg    - culoarea textului
   label - cum apare numele pe card (poate diferi de "name")
   st    - stil: 'b' ingrosat, 'i' cursiv, 'u' majuscule, 's' litere distantate
   cat   - categoria, pentru gruparea din lista de alegere
   kw    - cuvinte dupa care se potriveste automat cu numele unei liste
   logo  - sigla originala (in app/icons/magazine/); fara ea se scrie numele stilizat
   alb   - sigla se afiseaza in alb pe culoarea magazinului (ex. Carrefour pe albastru) */

export const MAGAZINE = [
  // supermarketuri
  { id: 'mega',      name: 'Mega Image',     bg: '#E2001A', fg: '#FFFFFF', label: 'MEGA IMAGE', st: 'bu',  cat: 'Supermarket', kw: ['mega'], logo: 'icons/magazine/mega.svg' },
  { id: 'carrefour', name: 'Carrefour',      bg: '#0A4C9A', fg: '#FFFFFF', label: 'Carrefour',  st: 'b',   cat: 'Supermarket', kw: ['carrefour', 'market'], logo: 'icons/magazine/carrefour.svg', alb: 1 },
  { id: 'lidl',      name: 'Lidl',           bg: '#0050AA', fg: '#FFF000', label: 'LIDL',       st: 'bu',  cat: 'Supermarket', kw: ['lidl'], logo: 'icons/magazine/lidl.svg' },
  { id: 'kaufland',  name: 'Kaufland',       bg: '#E10915', fg: '#FFFFFF', label: 'Kaufland',   st: 'b',   cat: 'Supermarket', kw: ['kaufland'], logo: 'icons/magazine/kaufland.svg' },
  { id: 'penny',     name: 'Penny',          bg: '#CD1719', fg: '#FFFFFF', label: 'PENNY',      st: 'biu', cat: 'Supermarket', kw: ['penny'], logo: 'icons/magazine/penny.svg' },
  { id: 'profi',     name: 'Profi',          bg: '#E4032E', fg: '#FFFFFF', label: 'PROFI',      st: 'bu',  cat: 'Supermarket', kw: ['profi'], logo: 'icons/magazine/profi.png', alb: 1 },
  { id: 'auchan',    name: 'Auchan',         bg: '#E1001A', fg: '#FFFFFF', label: 'Auchan',     st: 'b',   cat: 'Supermarket', kw: ['auchan'], logo: 'icons/magazine/auchan.svg', alb: 1 },
  { id: 'cora',      name: 'Cora',           bg: '#D5001C', fg: '#FFFFFF', label: 'cora',       st: 'b',   cat: 'Supermarket', kw: ['cora'], logo: 'icons/magazine/cora.svg' },
  { id: 'selgros',   name: 'Selgros',        bg: '#FFFFFF', fg: '#D9001B', label: 'SELGROS',    st: 'bu',  cat: 'Supermarket', kw: ['selgros'], logo: 'icons/magazine/selgros.svg' },
  { id: 'metro',     name: 'Metro',          bg: '#003D7C', fg: '#FFE500', label: 'METRO',      st: 'bus', cat: 'Supermarket', kw: ['metro'], logo: 'icons/magazine/metro.svg' },
  { id: 'annabella', name: 'Annabella',      bg: '#FFFFFF', fg: '#FFFFFF', label: 'Annabella',  st: 'bi',  cat: 'Supermarket', kw: ['annabella'], logo: 'icons/magazine/annabella.png' },
  { id: 'lacocos',   name: 'La Cocoș',       bg: '#F28C00', fg: '#FFFFFF', label: 'La Cocoș',   st: 'b',   cat: 'Supermarket', kw: ['cocos'] },

  // farmacii
  { id: 'drmax',     name: 'Dr.Max',         bg: '#3DB54A', fg: '#FFFFFF', label: 'Dr.Max',     st: 'b',   cat: 'Farmacie', kw: ['dr max', 'drmax', 'sensiblu', 'farmacie'], logo: 'icons/magazine/drmax.svg' },
  { id: 'catena',    name: 'Catena',         bg: '#3AAA35', fg: '#FFFFFF', label: 'CATENA',     st: 'us',  cat: 'Farmacie', kw: ['catena', 'farmacie'], logo: 'icons/magazine/catena.png' },
  { id: 'helpnet',   name: 'HelpNet',        bg: '#F47B20', fg: '#FFFFFF', label: 'HelpNet',    st: 'b',   cat: 'Farmacie', kw: ['helpnet', 'farmacie'], logo: 'icons/magazine/helpnet.svg', alb: 1 },
  { id: 'tei',       name: 'Farmacia Tei',   bg: '#FFFFFF', fg: '#FFFFFF', label: 'Farmacia Tei', st: 'b', cat: 'Farmacie', kw: ['tei', 'farmacie'], logo: 'icons/magazine/tei.png' },
  { id: 'dona',      name: 'Farmaciile Dona', bg: '#FFFFFF', fg: '#FFFFFF', label: 'DONA',      st: 'bu',  cat: 'Farmacie', kw: ['dona', 'farmacie'], logo: 'icons/magazine/dona.webp' },

  // casa si bricolaj
  { id: 'dedeman',   name: 'Dedeman',        bg: '#FFFFFF', fg: '#FFFFFF', label: 'DEDEMAN',    st: 'bu',  cat: 'Casă', kw: ['dedeman'], logo: 'icons/magazine/dedeman.svg' },
  { id: 'leroy',     name: 'Leroy Merlin',   bg: '#FFFFFF', fg: '#FFFFFF', label: 'LEROY MERLIN', st: 'bu', cat: 'Casă', kw: ['leroy'], logo: 'icons/magazine/leroy.svg' },
  { id: 'hornbach',  name: 'Hornbach',       bg: '#F7A600', fg: '#1B1B1B', label: 'HORNBACH',   st: 'bu',  cat: 'Casă', kw: ['hornbach'], logo: 'icons/magazine/hornbach.svg' },
  { id: 'brico',     name: 'Brico Dépôt',    bg: '#E30613', fg: '#FFFFFF', label: 'BRICO', st: 'bu',  cat: 'Casă', kw: ['brico', 'depot'], logo: 'icons/magazine/brico.svg' },
  { id: 'ikea',      name: 'IKEA',           bg: '#0058A3', fg: '#FFDB00', label: 'IKEA',       st: 'bu',  cat: 'Casă', kw: ['ikea'], logo: 'icons/magazine/ikea.svg' },
  { id: 'jysk',      name: 'Jysk',           bg: '#143C8A', fg: '#FFFFFF', label: 'JYSK',       st: 'bu',  cat: 'Casă', kw: ['jysk'], logo: 'icons/magazine/jysk.svg' },
  { id: 'mobexpert', name: 'Mobexpert',      bg: '#FFFFFF', fg: '#FFFFFF', label: 'mobexpert',  st: 'b',   cat: 'Casă', kw: ['mobexpert'], logo: 'icons/magazine/mobexpert.svg' },

  // electronice
  { id: 'altex',     name: 'Altex',          bg: '#FFFFFF', fg: '#FFFFFF', label: 'ALTEX',      st: 'bu',  cat: 'Electronice', kw: ['altex'], logo: 'icons/magazine/altex.svg' },
  { id: 'flanco',    name: 'Flanco',         bg: '#FFD200', fg: '#1B1B1B', label: 'flanco',     st: 'b',   cat: 'Electronice', kw: ['flanco'], logo: 'icons/magazine/flanco.svg' },
  { id: 'emag',      name: 'eMAG',           bg: '#FFFFFF', fg: '#FFFFFF', label: 'eMAG',       st: 'b',   cat: 'Electronice', kw: ['emag'], logo: 'icons/magazine/emag.svg' },

  // frumusete si drogerie
  { id: 'dm',        name: 'dm drogerie',    bg: '#FFFFFF', fg: '#FFD500', label: 'dm',         st: 'b',   cat: 'Frumusețe', kw: ['dm', 'drogerie'], logo: 'icons/magazine/dm.png' },
  { id: 'douglas',   name: 'Douglas',        bg: '#9BDCD2', fg: '#1B1B1B', label: 'DOUGLAS',    st: 'us',  cat: 'Frumusețe', kw: ['douglas'], logo: 'icons/magazine/douglas.svg' },
  { id: 'sephora',   name: 'Sephora',        bg: '#111111', fg: '#FFFFFF', label: 'SEPHORA',    st: 'us',  cat: 'Frumusețe', kw: ['sephora'], logo: 'icons/magazine/sephora.svg', alb: 1 },
  { id: 'yves',      name: 'Yves Rocher',    bg: '#FFFFFF', fg: '#FFFFFF', label: 'Yves Rocher', st: 'i',  cat: 'Frumusețe', kw: ['yves'], logo: 'icons/magazine/yves.svg' },

  // haine, incaltaminte, sport
  { id: 'decathlon', name: 'Decathlon',      bg: '#3643BA', fg: '#FFFFFF', label: 'DECATHLON',  st: 'biu', cat: 'Haine și sport', kw: ['decathlon'], logo: 'icons/magazine/decathlon.svg', alb: 1 },
  { id: 'hm',        name: 'H&M',            bg: '#FFFFFF', fg: '#FFFFFF', label: 'H&M',        st: 'bi',  cat: 'Haine și sport', kw: ['h&m', 'hm'], logo: 'icons/magazine/hm.svg' },
  { id: 'pepco',     name: 'Pepco',          bg: '#FFFFFF', fg: '#FFFFFF', label: 'PEPCO',      st: 'bu',  cat: 'Haine și sport', kw: ['pepco'], logo: 'icons/magazine/pepco.svg' },
  { id: 'kik',       name: 'KiK',            bg: '#FFFFFF', fg: '#E30613', label: 'kik',        st: 'bi',  cat: 'Haine și sport', kw: ['kik'], logo: 'icons/magazine/kik.svg' },
  { id: 'deichmann', name: 'Deichmann',      bg: '#FFFFFF', fg: '#FFFFFF', label: 'DEICHMANN',  st: 'bu',  cat: 'Haine și sport', kw: ['deichmann'], logo: 'icons/magazine/deichmann.png' },
  { id: 'ccc',       name: 'CCC',            bg: '#FFFFFF', fg: '#FFFFFF', label: 'CCC',        st: 'bus', cat: 'Haine și sport', kw: ['ccc'], logo: 'icons/magazine/ccc.svg' },
  { id: 'intersport', name: 'Intersport',    bg: '#FFFFFF', fg: '#FFFFFF', label: 'INTERSPORT', st: 'biu', cat: 'Haine și sport', kw: ['intersport'], logo: 'icons/magazine/intersport.svg' },
  { id: 'smyk',      name: 'Smyk',           bg: '#FFFFFF', fg: '#FFFFFF', label: 'SMYK',       st: 'bu',  cat: 'Haine și sport', kw: ['smyk', 'jucarii'], logo: 'icons/magazine/smyk.png' },
  { id: 'noriel',    name: 'Noriel',         bg: '#FFFFFF', fg: '#FFFFFF', label: 'Noriel',     st: 'b',   cat: 'Haine și sport', kw: ['noriel', 'jucarii'], logo: 'icons/magazine/noriel.png' },

  // carburant
  { id: 'omv',       name: 'OMV',            bg: '#0B2340', fg: '#FFFFFF', label: 'OMV',        st: 'bus', cat: 'Carburant', kw: ['omv', 'benzina'], logo: 'icons/magazine/omv.svg' },
  { id: 'petrom',    name: 'Petrom',         bg: '#FFFFFF', fg: '#FFFFFF', label: 'PETROM',     st: 'bu',  cat: 'Carburant', kw: ['petrom', 'benzina'], logo: 'icons/magazine/petrom.svg' },
  { id: 'mol',       name: 'MOL',            bg: '#FFFFFF', fg: '#FFFFFF', label: 'MOL',        st: 'bus', cat: 'Carburant', kw: ['mol', 'benzina'], logo: 'icons/magazine/mol.svg' },
  { id: 'rompetrol', name: 'Rompetrol',      bg: '#FFFFFF', fg: '#FFFFFF', label: 'Rompetrol',  st: 'b',   cat: 'Carburant', kw: ['rompetrol', 'benzina'], logo: 'icons/magazine/rompetrol.png' },
  { id: 'lukoil',    name: 'Lukoil',         bg: '#FFFFFF', fg: '#FFFFFF', label: 'LUKOIL',     st: 'bu',  cat: 'Carburant', kw: ['lukoil', 'benzina'], logo: 'icons/magazine/lukoil.svg' },

  // altele
  { id: 'carturesti', name: 'Cărturești',    bg: '#1B1B1B', fg: '#FFFFFF', label: 'Cărturești', st: 'b',   cat: 'Altele', kw: ['carturesti', 'carti'] },
  { id: 'starbucks', name: 'Starbucks',      bg: '#FFFFFF', fg: '#FFFFFF', label: 'STARBUCKS',  st: 'bus', cat: 'Altele', kw: ['starbucks'], logo: 'icons/magazine/starbucks.svg' },
];

export const MAGAZIN_ALT = { id: '', name: 'Alt magazin', bg: '#5A6B80', fg: '#FFFFFF', label: '', st: 'b', cat: '' };

/* Culori pentru "Alt magazin" */
export const CULORI_CARD = [
  '#1B65C0', '#0E8CA8', '#2E9E7A', '#3DB54A', '#8BC34A', '#F2B705',
  '#F28C00', '#E4572E', '#C8384A', '#D81B60', '#8A4FBF', '#5C6BC0',
  '#37474F', '#111111',
];

export function magazin(id) {
  return MAGAZINE.find((m) => m.id === id) || null;
}

/** Culoare de text lizibila pe un fundal dat. */
export function textPe(bg) {
  const h = (bg || '#000000').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#1B1B1B' : '#FFFFFF';
}

/** Cum se deseneaza un card: culori, eticheta si stil, pentru magazin predefinit sau propriu. */
export function aspectCard(card) {
  const m = card.store ? magazin(card.store) : null;
  const bg = card.color || (m ? m.bg : MAGAZIN_ALT.bg);
  return {
    bg,
    fg: (m && !card.color) ? m.fg : textPe(bg),
    label: (m && (!card.name || card.name === m.name)) ? m.label : (card.name || (m ? m.label : 'Card')),
    st: m ? m.st : 'b',
    logo: m && m.logo ? m.logo : '',
    alb: !!(m && m.alb),
  };
}
