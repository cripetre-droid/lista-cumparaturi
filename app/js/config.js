/* Unde se afla API-ul (PHP-ul de pe gazduirea Romarg).

   Pe vireo.ro (subdomeniul lista.vireo.ro) API-ul sta in folderul "api/" de langa
   aplicatie, deci se afla singur, oricum ar fi asezate fisierele. De pe GitHub Pages,
   unde nu exista PHP, se apeleaza direct lista.vireo.ro.
   Se poate suprascrie din Meniu > Server (util la testare). */

const IMPLICIT = 'https://lista.vireo.ro/api/';

/** Folderul in care se afla aplicatia, terminat cu "/". */
function folderulAplicatiei() {
  return location.origin + location.pathname.replace(/[^/]*$/, '');
}

function detect() {
  const h = location.hostname;

  // pe gazduirea proprie, API-ul e mereu in "api/" langa aplicatie
  if (h === 'vireo.ro' || h.endsWith('.vireo.ro')) {
    return folderulAplicatiei() + 'api/';
  }

  // test local: serverul de dezvoltare raspunde tot la /api/
  if (h === 'localhost' || h === '127.0.0.1') {
    return localStorage.getItem('lc.api.local') || (location.origin + '/api/');
  }

  // GitHub Pages sau orice alta gazduire fara PHP
  return IMPLICIT;
}

export const API_BASE = localStorage.getItem('lc.api') || detect();

export function setApiBase(url) {
  url = (url || '').trim();
  if (url && !url.endsWith('/')) url += '/';
  if (url) localStorage.setItem('lc.api', url);
  else localStorage.removeItem('lc.api');
}

export const APP_VERSION = '1.2.0';
