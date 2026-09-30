import { useEffect, useState } from 'react';
import App from './App';
import { Admin } from './admin/Admin';
import { api, type Catalog } from './catalog';
import { Announcement } from './admin/Announcement';

export default function Site() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState('');
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const kind = path === '/yucatecos' ? 'yucatecos' : 'normal';
  const admin = path === '/admin';
  useEffect(() => {
    let disposed = false;
    const refresh = () => api<Catalog>('catalog').then(value => { if (!disposed) { setCatalog(value); setError(''); } }).catch(() => { if (!disposed) setError('No se pudo cargar el menú. Intenta de nuevo.'); });
    void refresh();
    const timer = admin ? undefined : window.setInterval(refresh, 30000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [admin]);
  useEffect(() => { document.title = `Trattoria La Pasta · ${admin ? 'Administración' : kind === 'normal' ? 'Menú' : 'Menú Yucatecos'}`; }, [kind, admin]);
  if (!['/', '/menu', '/yucatecos', '/admin'].includes(path)) return <main className="site-status"><h1>Página no encontrada</h1><a href="/">Ir al menú</a></main>;
  if (!catalog) return <main className="site-status" aria-live="polite"><h1>Trattoria La Pasta</h1><p>{error || 'Preparando el menú…'}</p>{error && <button onClick={() => window.location.reload()}>Reintentar</button>}</main>;
  if (admin) return <Admin initial={catalog} />;
  if (kind === 'yucatecos' && !catalog.settings.yucatecosEnabled) return <main className="site-status"><img src="/trattoria-logo.webp" width="150" alt="Trattoria La Pasta" /><h1>Menú Yucatecos no disponible</h1><p>Por ahora puedes consultar nuestro menú completo.</p><a href="/">Ver menú normal</a><p><a className="admin-entry" href="/admin">Administración</a></p></main>;
  const popup = catalog.settings.popups.find(p => !p.deleted && p.enabled && (p.target === 'both' || p.target === kind));
  return <><App key={`${kind}-${catalog.revision}`} catalog={catalog} kind={kind} />{popup && <Announcement popup={popup} />}</>;
}
