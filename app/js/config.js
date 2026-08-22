/* Unde se afla API-ul (PHP-ul de pe vireo.ro).
   Pe vireo.ro se foloseste automat acelasi domeniu; de pe GitHub Pages
   sau de pe localhost se apeleaza vireo.ro. Se poate suprascrie din
   Setari > Server (util la testare). */

const IMPLICIT = 'https://vireo.ro/lista/api/';

function detect() {
  const h = location.hostname;
  if (h.endsWith('vireo.ro')) {
    return location.origin + '/lista/api/';
  }
  if (h === 'localhost' || h === '127.0.0.1') {
    // test local: api/ langa aplicatie (serverul de dezvoltare)
    return localStorage.getItem('lc.api.local') || (location.origin + '/api/');
  }
  return IMPLICIT;
}

export const API_BASE = localStorage.getItem('lc.api') || detect();

export function setApiBase(url) {
  url = (url || '').trim();
  if (url && !url.endsWith('/')) url += '/';
  if (url) localStorage.setItem('lc.api', url);
  else localStorage.removeItem('lc.api');
}

export const APP_VERSION = '1.0.0';
