import { useEffect, useState } from 'react';

/**
 * Router berbasis hash (#/...) — bekerja di hosting statis mana pun (GitHub Pages, Vercel,
 * laptop trainer) tanpa konfigurasi server, dan link latihan bisa dibagikan:
 *   #/                     beranda
 *   #/latihan/da-05-group-by
 *   #/progres
 *   #/cek-kesiapan
 */
export type Route =
  | { name: 'home' }
  | { name: 'exercise'; id: string }
  | { name: 'progress' }
  | { name: 'preflight' }
  | { name: 'track'; track: string };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const [a, b] = path.split('/').map(decodeURIComponent);
  if (a === 'latihan' && b) return { name: 'exercise', id: b };
  if (a === 'track' && b) return { name: 'track', track: b };
  if (a === 'progres') return { name: 'progress' };
  if (a === 'cek-kesiapan') return { name: 'preflight' };
  return { name: 'home' };
}

export function routeToHash(r: Route): string {
  switch (r.name) {
    case 'exercise':
      return `#/latihan/${encodeURIComponent(r.id)}`;
    case 'track':
      return `#/track/${encodeURIComponent(r.track)}`;
    case 'progress':
      return '#/progres';
    case 'preflight':
      return '#/cek-kesiapan';
    default:
      return '#/';
  }
}

export function navigate(r: Route) {
  const h = routeToHash(r);
  if (location.hash !== h) location.hash = h;
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
