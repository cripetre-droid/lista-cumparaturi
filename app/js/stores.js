/* Magazine predefinite pentru cardurile de fidelitate.
   Nu folosim siglele oficiale: fiecare card apare in culoarea magazinului,
   cu numele scris stilizat.

   bg    - culoarea cardului
   fg    - culoarea textului
   label - cum apare numele pe card (poate diferi de "name")
   st    - stil: 'b' ingrosat, 'i' cursiv, 'u' majuscule, 's' litere distantate
   cat   - categoria, pentru gruparea din lista de alegere
   kw    - cuvinte dupa care se potriveste automat cu numele unei liste */

export const MAGAZINE = [
  // supermarketuri
  { id: 'mega',      name: 'Mega Image',     bg: '#E2001A', fg: '#FFFFFF', label: 'MEGA IMAGE', st: 'bu',  cat: 'Supermarket', kw: ['mega'] },
  { id: 'carrefour', name: 'Carrefour',      bg: '#0A4C9A', fg: '#FFFFFF', label: 'Carrefour',  st: 'b',   cat: 'Supermarket', kw: ['carrefour', 'market'] },
  { id: 'lidl',      name: 'Lidl',           bg: '#0050AA', fg: '#FFF000', label: 'LIDL',       st: 'bu',  cat: 'Supermarket', kw: ['lidl'] },
  { id: 'kaufland',  name: 'Kaufland',       bg: '#E10915', fg: '#FFFFFF', label: 'Kaufland',   st: 'b',   cat: 'Supermarket', kw: ['kaufland'] },
  { id: 'penny',     name: 'Penny',          bg: '#CD1719', fg: '#FFFFFF', label: 'PENNY',      st: 'biu', cat: 'Supermarket', kw: ['penny'] },
  { id: 'profi',     name: 'Profi',          bg: '#E4032E', fg: '#FFFFFF', label: 'PROFI',      st: 'bu',  cat: 'Supermarket', kw: ['profi'] },
  { id: 'auchan',    name: 'Auchan',         bg: '#E1001A', fg: '#FFFFFF', label: 'Auchan',     st: 'b',   cat: 'Supermarket', kw: ['auchan'] },
  { id: 'cora',      name: 'Cora',           bg: '#D5001C', fg: '#FFFFFF', label: 'cora',       st: 'b',   cat: 'Supermarket', kw: ['cora'] },
  { id: 'selgros',   name: 'Selgros',        bg: '#D9001B', fg: '#FFD500', label: 'SELGROS',    st: 'bu',  cat: 'Supermarket', kw: ['selgros'] },
  { id: 'metro',     name: 'Metro',          bg: '#003D7C', fg: '#FFE500', label: 'METRO',      st: 'bus', cat: 'Supermarket', kw: ['metro'] },
  { id: 'annabella', name: 'Annabella',      bg: '#E30613', fg: '#FFFFFF', label: 'Annabella',  st: 'bi',  cat: 'Supermarket', kw: ['annabella'] },
  { id: 'lacocos',   name: 'La Cocoș',       bg: '#F28C00', fg: '#FFFFFF', label: 'La Cocoș',   st: 'b',   cat: 'Supermarket', kw: ['cocos'] },

  // farmacii
  { id: 'drmax',     name: 'Dr.Max',         bg: '#3DB54A', fg: '#FFFFFF', label: 'Dr.Max',     st: 'b',   cat: 'Farmacie', kw: ['dr max', 'drmax', 'farmacie'] },
  { id: 'catena',    name: 'Catena',         bg: '#3AAA35', fg: '#FFFFFF', label: 'CATENA',     st: 'us',  cat: 'Farmacie', kw: ['catena', 'farmacie'] },
  { id: 'sensiblu',  name: 'Sensiblu',       bg: '#0082C8', fg: '#FFFFFF', label: 'sensiblu',   st: 'b',   cat: 'Farmacie', kw: ['sensiblu', 'farmacie'] },
  { id: 'helpnet',   name: 'HelpNet',        bg: '#00A3E0', fg: '#FFFFFF', label: 'HelpNet',    st: 'b',   cat: 'Farmacie', kw: ['helpnet', 'farmacie'] },
  { id: 'tei',       name: 'Farmacia Tei',   bg: '#00A651', fg: '#FFFFFF', label: 'Farmacia Tei', st: 'b', cat: 'Farmacie', kw: ['tei', 'farmacie'] },
  { id: 'dona',      name: 'Farmaciile Dona', bg: '#E30613', fg: '#FFFFFF', label: 'DONA',      st: 'bu',  cat: 'Farmacie', kw: ['dona', 'farmacie'] },
  { id: 'benu',      name: 'Benu',           bg: '#00A19A', fg: '#FFFFFF', label: 'BENU',       st: 'bu',  cat: 'Farmacie', kw: ['benu', 'farmacie'] },

  // casa si bricolaj
  { id: 'dedeman',   name: 'Dedeman',        bg: '#004A99', fg: '#FFFFFF', label: 'DEDEMAN',    st: 'bu',  cat: 'Casă', kw: ['dedeman'] },
  { id: 'leroy',     name: 'Leroy Merlin',   bg: '#78BE20', fg: '#FFFFFF', label: 'LEROY MERLIN', st: 'bu', cat: 'Casă', kw: ['leroy'] },
  { id: 'hornbach',  name: 'Hornbach',       bg: '#F7A600', fg: '#1B1B1B', label: 'HORNBACH',   st: 'bu',  cat: 'Casă', kw: ['hornbach'] },
  { id: 'brico',     name: 'Brico Dépôt',    bg: '#F58220', fg: '#FFFFFF', label: 'Brico Dépôt', st: 'b',  cat: 'Casă', kw: ['brico'] },
  { id: 'ikea',      name: 'IKEA',           bg: '#0058A3', fg: '#FFDB00', label: 'IKEA',       st: 'bu',  cat: 'Casă', kw: ['ikea'] },
  { id: 'jysk',      name: 'Jysk',           bg: '#143C8A', fg: '#FFFFFF', label: 'JYSK',       st: 'bu',  cat: 'Casă', kw: ['jysk'] },
  { id: 'mobexpert', name: 'Mobexpert',      bg: '#E30613', fg: '#FFFFFF', label: 'mobexpert',  st: 'b',   cat: 'Casă', kw: ['mobexpert'] },

  // electronice
  { id: 'altex',     name: 'Altex',          bg: '#E30613', fg: '#FFFFFF', label: 'ALTEX',      st: 'bu',  cat: 'Electronice', kw: ['altex'] },
  { id: 'flanco',    name: 'Flanco',         bg: '#FFD200', fg: '#1B1B1B', label: 'flanco',     st: 'b',   cat: 'Electronice', kw: ['flanco'] },
  { id: 'emag',      name: 'eMAG',           bg: '#005EB8', fg: '#FFFFFF', label: 'eMAG',       st: 'b',   cat: 'Electronice', kw: ['emag'] },

  // frumusete si drogerie
  { id: 'dm',        name: 'dm drogerie',    bg: '#002878', fg: '#FFD500', label: 'dm',         st: 'b',   cat: 'Frumusețe', kw: ['dm', 'drogerie'] },
  { id: 'douglas',   name: 'Douglas',        bg: '#9BDCD2', fg: '#1B1B1B', label: 'DOUGLAS',    st: 'us',  cat: 'Frumusețe', kw: ['douglas'] },
  { id: 'sephora',   name: 'Sephora',        bg: '#111111', fg: '#FFFFFF', label: 'SEPHORA',    st: 'us',  cat: 'Frumusețe', kw: ['sephora'] },
  { id: 'yves',      name: 'Yves Rocher',    bg: '#006B3F', fg: '#FFFFFF', label: 'Yves Rocher', st: 'i',  cat: 'Frumusețe', kw: ['yves'] },

  // haine, incaltaminte, sport
  { id: 'decathlon', name: 'Decathlon',      bg: '#0082C3', fg: '#FFFFFF', label: 'DECATHLON',  st: 'biu', cat: 'Haine și sport', kw: ['decathlon'] },
  { id: 'hm',        name: 'H&M',            bg: '#E50010', fg: '#FFFFFF', label: 'H&M',        st: 'bi',  cat: 'Haine și sport', kw: ['h&m', 'hm'] },
  { id: 'pepco',     name: 'Pepco',          bg: '#002F6C', fg: '#FFFFFF', label: 'PEPCO',      st: 'bu',  cat: 'Haine și sport', kw: ['pepco'] },
  { id: 'kik',       name: 'KiK',            bg: '#FFFFFF', fg: '#E30613', label: 'kik',        st: 'bi',  cat: 'Haine și sport', kw: ['kik'] },
  { id: 'deichmann', name: 'Deichmann',      bg: '#00843D', fg: '#FFFFFF', label: 'DEICHMANN',  st: 'bu',  cat: 'Haine și sport', kw: ['deichmann'] },
  { id: 'ccc',       name: 'CCC',            bg: '#D2001F', fg: '#FFFFFF', label: 'CCC',        st: 'bus', cat: 'Haine și sport', kw: ['ccc'] },
  { id: 'intersport', name: 'Intersport',    bg: '#003B7D', fg: '#FFFFFF', label: 'INTERSPORT', st: 'biu', cat: 'Haine și sport', kw: ['intersport'] },
  { id: 'smyk',      name: 'Smyk',           bg: '#00A3E0', fg: '#FFFFFF', label: 'SMYK',       st: 'bu',  cat: 'Haine și sport', kw: ['smyk', 'jucarii'] },
  { id: 'noriel',    name: 'Noriel',         bg: '#E4032E', fg: '#FFFFFF', label: 'Noriel',     st: 'b',   cat: 'Haine și sport', kw: ['noriel', 'jucarii'] },

  // carburant
  { id: 'omv',       name: 'OMV',            bg: '#0B3B8C', fg: '#FFFFFF', label: 'OMV',        st: 'bus', cat: 'Carburant', kw: ['omv', 'benzina'] },
  { id: 'petrom',    name: 'Petrom',         bg: '#00754A', fg: '#FFFFFF', label: 'PETROM',     st: 'bu',  cat: 'Carburant', kw: ['petrom', 'benzina'] },
  { id: 'mol',       name: 'MOL',            bg: '#E30613', fg: '#FFFFFF', label: 'MOL',        st: 'bus', cat: 'Carburant', kw: ['mol', 'benzina'] },
  { id: 'rompetrol', name: 'Rompetrol',      bg: '#E2001A', fg: '#FFFFFF', label: 'Rompetrol',  st: 'b',   cat: 'Carburant', kw: ['rompetrol', 'benzina'] },
  { id: 'lukoil',    name: 'Lukoil',         bg: '#D71920', fg: '#FFFFFF', label: 'LUKOIL',     st: 'bu',  cat: 'Carburant', kw: ['lukoil', 'benzina'] },

  // altele
  { id: 'carturesti', name: 'Cărturești',    bg: '#1B1B1B', fg: '#FFFFFF', label: 'Cărturești', st: 'b',   cat: 'Altele', kw: ['carturesti', 'carti'] },
  { id: 'starbucks', name: 'Starbucks',      bg: '#00704A', fg: '#FFFFFF', label: 'STARBUCKS',  st: 'bus', cat: 'Altele', kw: ['starbucks'] },
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
  };
}
