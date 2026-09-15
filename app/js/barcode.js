/* =========================================================
   Coduri de bare: recunoasterea formatului, verificarea
   si desenarea (JsBarcode pentru liniare, qrcode pentru QR).
   Librariile se incarca doar cand e nevoie de ele.
   ========================================================= */

const incarcate = new Map();

/** Incarca o singura data un script clasic (librarie cu variabila globala). */
export function incarcaScript(src) {
  if (!incarcate.has(src)) {
    incarcate.set(src, new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { incarcate.delete(src); reject(new Error('nu am putut incarca ' + src)); };
      document.head.append(s);
    }));
  }
  return incarcate.get(src);
}

/* Formatele acceptate, in ordinea din lista de alegere.
   js: numele formatului in JsBarcode (null = nu se poate desena liniar) */
export const FORMATE = [
  { id: 'EAN_13',   nume: 'EAN-13 (13 cifre)', js: 'EAN13' },
  { id: 'EAN_8',    nume: 'EAN-8 (8 cifre)',   js: 'EAN8' },
  { id: 'UPC_A',    nume: 'UPC-A (12 cifre)',  js: 'UPC' },
  { id: 'UPC_E',    nume: 'UPC-E',             js: 'UPCE' },
  { id: 'CODE_128', nume: 'Code 128',          js: 'CODE128' },
  { id: 'CODE_39',  nume: 'Code 39',           js: 'CODE39' },
  { id: 'CODE_93',  nume: 'Code 93',           js: 'CODE93' },
  { id: 'ITF',      nume: 'ITF (Interleaved 2 of 5)', js: 'ITF' },
  { id: 'CODABAR',  nume: 'Codabar',           js: 'codabar' },
  { id: 'QR_CODE',  nume: 'Cod QR',            js: null },
  { id: 'NUMAI_TEXT', nume: 'Doar numărul (fără cod de bare)', js: null },
];

/* Formate pe care scannerul le poate intoarce dar pe care nu le putem redesena:
   le afisam ca numar mare, cu o explicatie. */
const NEDESENABILE = ['DATA_MATRIX', 'PDF_417', 'AZTEC', 'MAXICODE', 'RSS_14', 'RSS_EXPANDED'];

export function numeFormat(id) {
  const f = FORMATE.find((x) => x.id === id);
  if (f) return f.nume;
  if (NEDESENABILE.includes(id)) return id.replace('_', ' ');
  return id || 'Code 128';
}

function cifreControlEanValide(cifre) {
  // EAN-8, EAN-13, UPC-A folosesc aceeasi regula: ponderi 3/1 de la dreapta
  const d = cifre.split('').map(Number);
  const control = d.pop();
  let suma = 0;
  d.reverse().forEach((x, i) => { suma += x * (i % 2 === 0 ? 3 : 1); });
  return (10 - (suma % 10)) % 10 === control;
}

/** Ghiceste formatul dupa numarul tastat de mana. */
export function detecteazaFormat(numar) {
  const n = String(numar || '').replace(/\s+/g, '');
  if (/^\d{13}$/.test(n) && cifreControlEanValide(n)) return 'EAN_13';
  if (/^\d{8}$/.test(n) && cifreControlEanValide(n)) return 'EAN_8';
  if (/^\d{12}$/.test(n) && cifreControlEanValide(n)) return 'UPC_A';
  if (n.length > 48 || /[^\x20-\x7E]/.test(n)) return 'QR_CODE';
  return 'CODE_128';
}

/** Numarul asa cum se trimite in cod (fara spatii la codurile numerice). */
export function numarPentruCod(numar, format) {
  const n = String(numar || '');
  if (['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'ITF'].includes(format)) return n.replace(/\s+/g, '');
  return n.trim();
}

/** Verifica daca numarul se potriveste formatului. Intoarce '' daca e in regula, altfel mesajul. */
export function verificaNumar(numar, format) {
  const n = numarPentruCod(numar, format);
  if (!n) return 'Scrie numărul cardului.';
  switch (format) {
    case 'EAN_13':
      if (!/^\d{12,13}$/.test(n)) return 'EAN-13 are 13 cifre.';
      if (n.length === 13 && !cifreControlEanValide(n)) return 'Ultima cifră (de control) nu se potrivește — verifică numărul.';
      return '';
    case 'EAN_8':
      if (!/^\d{7,8}$/.test(n)) return 'EAN-8 are 8 cifre.';
      if (n.length === 8 && !cifreControlEanValide(n)) return 'Ultima cifră (de control) nu se potrivește — verifică numărul.';
      return '';
    case 'UPC_A':
      if (!/^\d{11,12}$/.test(n)) return 'UPC-A are 12 cifre.';
      return '';
    case 'ITF':
      if (!/^\d+$/.test(n) || n.length % 2) return 'ITF cere un număr par de cifre.';
      return '';
    case 'CODE_39':
      if (!/^[0-9A-Z\-. $/+%]+$/.test(n.toUpperCase())) return 'Code 39 acceptă doar cifre, litere mari și - . $ / + %';
      return '';
    case 'CODABAR':
      if (!/^[A-Da-d]?[0-9\-$:/.+]+[A-Da-d]?$/.test(n)) return 'Codabar acceptă cifre și - $ : / . +';
      return '';
    default:
      return '';
  }
}

/**
 * Deseneaza codul in element. Intoarce true daca a putut desena,
 * false daca s-a afisat doar numarul.
 */
export async function deseneazaCod(el, numar, format, { mare = false } = {}) {
  el.innerHTML = '';
  const n = numarPentruCod(numar, format);
  if (!n) return false;

  if (format === 'QR_CODE') {
    await incarcaScript('js/vendor/qrcode.js');
    const qr = window.qrcode(0, 'M');
    qr.addData(n);
    qr.make();
    el.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
    const svg = el.querySelector('svg');
    if (svg) { svg.setAttribute('class', 'cod-qr'); svg.removeAttribute('width'); svg.removeAttribute('height'); }
    return true;
  }

  const f = FORMATE.find((x) => x.id === format);
  if (!f || !f.js) return false;

  await incarcaScript('js/vendor/jsbarcode.min.js');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'cod-liniar');
  try {
    window.JsBarcode(svg, format === 'CODE_39' ? n.toUpperCase() : n, {
      format: f.js,
      width: mare ? 4 : 2.6,
      height: mare ? 150 : 110,
      margin: 12,
      displayValue: false,
      background: '#FFFFFF',
      lineColor: '#000000',
      flat: true,
    });
  } catch (e) {
    return false;   // numar incompatibil cu formatul
  }
  // se scaleaza cu latimea containerului, pastrand proportiile
  const w = svg.getAttribute('width'), h = svg.getAttribute('height');
  if (w && h) {
    svg.setAttribute('viewBox', '0 0 ' + parseFloat(w) + ' ' + parseFloat(h));
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }
  el.append(svg);
  return true;
}

/** Numarul formatat pentru citit de om (grupe de cifre, ca pe card). */
export function numarAfisat(numar, format) {
  const n = numarPentruCod(numar, format);
  if (format === 'EAN_13' && n.length === 13) return n[0] + ' ' + n.slice(1, 7) + ' ' + n.slice(7);
  if (format === 'EAN_8' && n.length === 8) return n.slice(0, 4) + ' ' + n.slice(4);
  if (/^\d{10,}$/.test(n)) return n.replace(/(\d{4})(?=\d)/g, '$1 ');
  return n;
}
