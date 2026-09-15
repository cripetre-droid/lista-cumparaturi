/* =========================================================
   Scanarea codului de bare cu camera.

   Camera o pornim noi; din fluxul ei luam cate un cadru la ~0,2 s si il dam:
   - detectorului nativ BarcodeDetector, unde exista (Chrome pe Android);
   - altfel (Firefox, iPhone) librariei ZXing, pe o panza (canvas).
   Rezultatul are forma { numar, format }, cu formatul in stilul 'EAN_13'.
   ========================================================= */

import { incarcaScript } from './barcode.js';

const NATIV_LA_NOI = {
  ean_13: 'EAN_13', ean_8: 'EAN_8', upc_a: 'UPC_A', upc_e: 'UPC_E',
  code_128: 'CODE_128', code_39: 'CODE_39', code_93: 'CODE_93', itf: 'ITF',
  codabar: 'CODABAR', qr_code: 'QR_CODE', data_matrix: 'DATA_MATRIX',
  pdf417: 'PDF_417', aztec: 'AZTEC',
};

const PAUZA = 200;   // ms intre doua incercari

export function areCamera() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

async function detectorNativ() {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const suportate = await window.BarcodeDetector.getSupportedFormats();
    if (!suportate || !suportate.length) return null;
    const d = new window.BarcodeDetector({ formats: suportate });
    return async (video) => {
      const coduri = await d.detect(video);
      if (!coduri || !coduri.length) return null;
      return { numar: coduri[0].rawValue, format: NATIV_LA_NOI[coduri[0].format] || 'CODE_128' };
    };
  } catch (e) {
    return null;
  }
}

async function detectorZxing() {
  await incarcaScript('js/vendor/zxing.min.js');
  const Z = window.ZXing;
  const indicii = new Map();
  indicii.set(Z.DecodeHintType.POSSIBLE_FORMATS, [
    Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E,
    Z.BarcodeFormat.CODE_128, Z.BarcodeFormat.CODE_39, Z.BarcodeFormat.CODE_93, Z.BarcodeFormat.ITF,
    Z.BarcodeFormat.CODABAR, Z.BarcodeFormat.QR_CODE, Z.BarcodeFormat.DATA_MATRIX, Z.BarcodeFormat.PDF_417,
    Z.BarcodeFormat.AZTEC,
  ]);
  indicii.set(Z.DecodeHintType.TRY_HARDER, true);
  const cititor = new Z.MultiFormatReader();
  cititor.setHints(indicii);

  const panza = document.createElement('canvas');
  const c2 = panza.getContext('2d', { willReadFrequently: true });
  // imaginile mari incetinesc decodarea pe telefon; o micsoram la cel mult 1280 px
  const MAX = 1280;

  return async (video) => {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return null;
    const k = Math.min(1, MAX / Math.max(w, h));
    const pw = Math.round(w * k), ph = Math.round(h * k);
    if (panza.width !== pw || panza.height !== ph) { panza.width = pw; panza.height = ph; }
    c2.drawImage(video, 0, 0, pw, ph);
    try {
      const bmp = new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(panza)));
      const r = cititor.decodeWithState(bmp);
      return { numar: r.getText(), format: Z.BarcodeFormat[r.getBarcodeFormat()] || 'CODE_128' };
    } catch (e) {
      return null;   // niciun cod in cadrul asta
    } finally {
      cititor.reset();
    }
  };
}

/**
 * Porneste scanarea in elementul <video>. Intoarce un obiect cu opreste().
 * laGasire({numar, format}) se cheama o singura data.
 * laEroare(mesaj) se cheama daca nu se poate porni camera.
 */
export async function pornesteScanarea(video, { laGasire, laEroare }) {
  let oprit = false;
  let stream = null;
  let bucla = null;

  const opreste = () => {
    oprit = true;
    if (bucla) clearTimeout(bucla);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    if (oprit) { opreste(); return { opreste }; }

    video.setAttribute('playsinline', '');
    video.muted = true;
    video.srcObject = stream;
    await video.play().catch(() => {});

    // unele camere accepta focalizare continua; ajuta mult la codurile mici
    const pista = stream.getVideoTracks()[0];
    if (pista && pista.applyConstraints) {
      pista.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
    }

    const detecteaza = (await detectorNativ()) || (await detectorZxing());
    if (oprit) return { opreste };

    const incearca = async () => {
      if (oprit) return;
      if (video.readyState >= 2) {
        let gasit = null;
        try { gasit = await detecteaza(video); } catch (e) { gasit = null; }
        if (gasit && gasit.numar && !oprit) {
          opreste();
          if (navigator.vibrate) navigator.vibrate(60);
          laGasire({ numar: String(gasit.numar), format: gasit.format });
          return;
        }
      }
      bucla = setTimeout(incearca, PAUZA);
    };
    incearca();
    return { opreste };
  } catch (e) {
    opreste();
    const nume = e && e.name;
    let mesaj = 'Nu am putut porni camera.';
    if (nume === 'NotAllowedError' || nume === 'SecurityError') {
      mesaj = 'Aplicația nu are voie să folosească camera. Permite accesul din setările browserului, sau introdu numărul manual.';
    } else if (nume === 'NotFoundError' || nume === 'OverconstrainedError') {
      mesaj = 'Nu am găsit nicio cameră pe acest dispozitiv.';
    } else if (nume === 'NotReadableError') {
      mesaj = 'Camera e folosită de altă aplicație. Închide-o și încearcă din nou.';
    }
    laEroare(mesaj);
    return { opreste };
  }
}
