/* Genereaza un fisier video .y4m care arata un cod de bare EAN-13.
   Chromium il poate folosi drept camera falsa, ca sa testam scanarea
   exact ca pe telefon:  --use-file-for-fake-video-capture=cod.y4m */

import fs from 'node:fs';

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const PARITATE = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

export function cifraControl(primele12) {
  let suma = 0;
  primele12.split('').map(Number).reverse().forEach((d, i) => { suma += d * (i % 2 === 0 ? 3 : 1); });
  return String((10 - (suma % 10)) % 10);
}

function modulatieEan13(cod) {
  const d = cod.split('').map(Number);
  let biti = '101';
  const par = PARITATE[d[0]];
  for (let i = 1; i <= 6; i++) biti += (par[i - 1] === 'L' ? L : G)[d[i]];
  biti += '01010';
  for (let i = 7; i <= 12; i++) biti += R[d[i]];
  biti += '101';
  return biti;
}

export function scrieVideoEan13(cale, cod12, { latime = 640, inaltime = 480, modul = 5, cadre = 12 } = {}) {
  const cod = cod12 + cifraControl(cod12);
  const biti = modulatieEan13(cod);
  const latimeCod = biti.length * modul;
  const x0 = Math.floor((latime - latimeCod) / 2);
  const hCod = 220;
  const y0 = Math.floor((inaltime - hCod) / 2);

  const Y = Buffer.alloc(latime * inaltime, 235);          // alb (in YUV, 235 = alb video)
  for (let b = 0; b < biti.length; b++) {
    if (biti[b] !== '1') continue;
    for (let x = x0 + b * modul; x < x0 + (b + 1) * modul; x++) {
      for (let y = y0; y < y0 + hCod; y++) Y[y * latime + x] = 16;   // negru
    }
  }
  const U = Buffer.alloc((latime / 2) * (inaltime / 2), 128);
  const V = Buffer.alloc((latime / 2) * (inaltime / 2), 128);

  const parti = [Buffer.from(`YUV4MPEG2 W${latime} H${inaltime} F10:1 Ip A1:1 C420jpeg\n`)];
  for (let i = 0; i < cadre; i++) parti.push(Buffer.from('FRAME\n'), Y, U, V);
  fs.writeFileSync(cale, Buffer.concat(parti));
  return cod;
}
