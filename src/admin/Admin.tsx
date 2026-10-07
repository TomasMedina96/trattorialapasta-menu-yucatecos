import { useEffect, useState, type FormEvent } from 'react';
import { api, type Catalog, type MenuKind, type Product } from '../catalog';
import { PopupManager } from './PopupManager';
import { NewsManager } from './NewsManager';
import { ReservationsManager } from './ReservationsManager';
import './admin.css';

export function Admin({ initial }: { initial: Catalog }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [catalog, setCatalog] = useState(initial);
  const [kind, setKind] = useState<MenuKind | null>(null);
  const [selected, setSelected] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [reservationsOpen, setReservationsOpen] = useState(() => new URLSearchParams(window.location.search).get('reservas') === '1');
  useEffect(() => { api<{ authenticated: boolean }>('session').then(s => setAuthenticated(s.authenticated)).catch(e => setError(e.message)).finally(() => setChecking(false)); }, []);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  const change = (next: Catalog) => { setCatalog(next); setDirty(true); setMessage(''); setError(''); };
  const product = catalog.products.find(p => p.id === selected && kind && !p.deleted[kind]);
  const patchProduct = (patch: Partial<Product>) => change({ ...catalog, products: catalog.products.map(p => p.id === selected ? { ...p, ...patch } : p) });
  async function save(next = catalog) {
    setBusy(true); setMessage(''); setError('');
    try { const saved = await api<Catalog>('catalog', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) }); setCatalog(saved); setDirty(false); setMessage('Cambios publicados en ambos menús.'); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function upload(file: File | undefined, apply: (url: string) => void, video = false) {
    if (!file) return;
    const max = video ? 50 : 6;
    if (file.size > max * 1024 * 1024) { setError(`El archivo debe pesar menos de ${max} MB.`); return; }
    setBusy(true); setError('');
    try {
      const result = await api<{ url: string }>(video ? 'upload?type=video' : 'upload', { method: 'POST', body: file });
      apply(result.url);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const values = new FormData(event.currentTarget); setBusy(true); setError('');
    try { await api('login', { method: 'POST', body: JSON.stringify(Object.fromEntries(values)) }); setAuthenticated(true); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const filteredProducts = kind ? catalog.products.filter(p => !p.deleted[kind] && p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())
    && (status === 'all' || p.enabled[kind] === (status === 'active'))) : [];
  if (checking) return <main className="admin-shell"><p>Verificando acceso…</p></main>;
  if (!authenticated) return <main className="admin-shell admin-login"><a href="/">← Volver al menú</a><img src="/trattoria-logo.webp" width="110" alt="Trattoria La Pasta" /><h1>Administración</h1><p>Acceso a los dos menús del restaurante.</p><form onSubmit={login}>
    <label>Usuario<input name="username" autoComplete="username" required autoFocus /></label>
    <label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>
    <button disabled={busy}>Entrar</button>{error && <p role="alert">{error}</p>}
  </form></main>;
  return <main className="admin-shell">
    <header className="admin-heading"><div><a href="/">← Ver sitio</a><h1>Administración</h1><p>Trattoria La Pasta</p></div><button disabled={busy} onClick={async () => {
      if (dirty && !window.confirm('Hay cambios sin publicar. ¿Salir y descartarlos?')) return;
      try { await api('logout', { method: 'POST' }); window.location.reload(); } catch (e) { setError((e as Error).message); }
    }}>Cerrar sesión</button></header>
    <a className="admin-guide" href="/docs/explicativo.html" target="_blank" rel="noopener noreferrer">Ver guía de funcionalidades ↗</a>
    <div className="reservation-toolbar"><button aria-pressed={!reservationsOpen} onClick={() => setReservationsOpen(false)}>Administrar menús</button><button aria-pressed={reservationsOpen} onClick={() => setReservationsOpen(true)}>Administrar reservas</button></div>
    {reservationsOpen ? <ReservationsManager /> : <>
    <div className="admin-save"><span>{dirty ? 'Cambios pendientes de publicar' : 'Catálogo actualizado'}</span><button disabled={busy || !dirty} onClick={() => void save()}>{busy ? 'Guardando…' : 'Publicar cambios'}</button></div>
    {message && <p className="admin-success" role="status">{message}</p>}{error && <p className="admin-error" role="alert">{error}</p>}
    <fieldset disabled={busy} className="admin-fieldset">
    <section className="admin-access" aria-label="Seleccionar menú">
      {(['normal', 'yucatecos'] as const).map(k => <button key={k} className={kind === k ? 'selected' : ''} aria-pressed={kind === k} onClick={() => { setKind(k); setSelected(''); setSearch(''); setStatus('all'); }}><strong>{k === 'normal' ? 'Menú normal' : 'Menú Yucatecos'}</strong><span>{k === 'normal' ? '/' : '/yucatecos'} · {catalog.products.filter(p => !p.deleted[k] && p.enabled[k]).length} productos activos</span></button>)}
    </section>
    <section className="admin-panel admin-toggle"><div><h2>Página Yucatecos</h2><p>{catalog.settings.yucatecosEnabled ? 'Disponible para los visitantes' : 'Desactivada; muestra un enlace al menú normal'}</p></div><button onClick={() => {
      if (dirty) { setError('Publica los cambios pendientes antes de cambiar la disponibilidad de la página.'); return; }
      void save({ ...catalog, settings: { ...catalog.settings, yucatecosEnabled: !catalog.settings.yucatecosEnabled } });
    }}>{catalog.settings.yucatecosEnabled ? 'Desactivar página Yucatecos' : 'Activar página Yucatecos'}</button></section>
    {kind && <>
      <section className="admin-panel"><h2>{kind === 'normal' ? 'Menú normal' : 'Menú Yucatecos'} · Productos</h2><p>Nombre, descripción, categoría y foto se comparten. Precio, disponibilidad, novedades y recomendación se ajustan por menú.</p>
        <div className="admin-tools"><label>Buscar producto<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Pizza, pasta, vino…" /></label>
          <label>Filtrar productos por estado<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">Todos</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select></label>
          <button onClick={() => {
          const id = 'producto-' + crypto.randomUUID();
          change({ ...catalog, products: [...catalog.products, { id, category: catalog.categories[0].id, name: 'Nuevo producto', description: '', image: '/trattoria-logo.webp', deleted: { normal: false, yucatecos: false }, featured: { normal: false, yucatecos: false }, prices: { normal: null, yucatecos: null }, enabled: { normal: false, yucatecos: false }, news: { normal: false, yucatecos: false } }] }); setSelected(id); setSearch(''); setStatus('all');
        }}>+ Agregar producto</button></div>
        <p>{filteredProducts.length} productos encontrados</p>
        <div className="admin-products"><div className="admin-product-list" aria-label="Productos">
          {filteredProducts.map(p => <button key={p.id} className={selected === p.id ? 'selected' : ''} onClick={() => setSelected(p.id)}><span>{p.name}</span><small>{p.enabled[kind] ? 'Activo' : 'Inactivo'} · {p.prices[kind] === null ? 'Sin precio' : `$${p.prices[kind]}`}</small></button>)}
          {!filteredProducts.length && <p>No hay productos con estos filtros.</p>}
        </div>
        {product ? <div className="admin-editor" key={product.id}>
          <label>Nombre compartido<input value={product.name} maxLength={200} onChange={e => patchProduct({ name: e.target.value })} /></label>
          <label>Categoría<select value={product.category} onChange={e => patchProduct({ category: e.target.value })}>{catalog.categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
          <label>Descripción compartida<textarea rows={4} value={product.description} maxLength={5000} onChange={e => patchProduct({ description: e.target.value })} /></label>
          <label>Precio en {kind === 'normal' ? 'menú normal' : 'Yucatecos'} (MXN)<input type="number" min="0" max="1000000" step="0.01" value={product.prices[kind] ?? ''} onChange={e => patchProduct({ prices: { ...product.prices, [kind]: e.target.value === '' ? null : Number(e.target.value) } })} /></label>
          <label className="admin-check"><input type="checkbox" checked={product.enabled[kind]} onChange={e => patchProduct({ enabled: { ...product.enabled, [kind]: e.target.checked } })} />Activo en este menú</label>
          <label className="admin-check"><input type="checkbox" checked={product.news[kind]} onChange={e => patchProduct({ news: { ...product.news, [kind]: e.target.checked } })} />Mostrar en novedades de este menú</label>
          <label className="admin-check"><input type="checkbox" checked={product.featured[kind]} onChange={e => patchProduct({ featured: { ...product.featured, [kind]: e.target.checked } })} />Recomendado de la casa en este menú</label>
          <p>Las tres opciones son independientes y solo cambian en el menú que estás editando.</p>
          <label>Foto compartida · URL o ruta<input value={product.image} onChange={e => patchProduct({ image: e.target.value })} /></label>
          <label>Subir foto (JPG, PNG o WebP, máximo 6 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { void upload(e.target.files?.[0], url => patchProduct({ image: url })); e.target.value = ''; }} /></label>
          {product.image && <img className="admin-preview" src={product.image} alt={product.name} />}
          <div className="admin-delete"><p>Eliminar lo retira de este menú y de sus novedades. El producto y sus archivos se conservan en el otro menú.</p>
            <button type="button" className="admin-danger" onClick={() => {
              patchProduct({ deleted: { ...product.deleted, [kind]: true } }); setSelected('');
            }}>Eliminar producto de este menú</button><p>Publica los cambios para aplicar la eliminación.</p>
          </div>
        </div> : <p>Selecciona un producto para editarlo o agrega uno nuevo.</p>}
        </div>
      </section>
      <NewsManager key={kind} kind={kind} entries={catalog.settings.feeds[kind]} products={catalog.products} upload={upload} onSave={() => void save()}
        onChange={entries => change({ ...catalog, settings: { ...catalog.settings, feeds: { ...catalog.settings.feeds, [kind]: entries } } })} />
    </>}
    <PopupManager popups={catalog.settings.popups} upload={upload} onSave={() => void save()}
      onChange={popups => change({ ...catalog, settings: { ...catalog.settings, popups } })} />
    </fieldset>
    </>}
  </main>;
}
