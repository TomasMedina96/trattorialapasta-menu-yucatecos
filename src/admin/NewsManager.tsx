import { useState } from 'react';
import type { MenuKind, NewsEntry, Product } from '../catalog';

export function NewsManager({ kind, entries, products, onChange, onSave, upload }: {
  kind: MenuKind;
  entries: NewsEntry[];
  products: Product[];
  onChange: (entries: NewsEntry[]) => void;
  onSave: () => void;
  upload: (file: File | undefined, apply: (url: string) => void, video?: boolean) => Promise<void>;
}) {
  const visibleEntries = entries.filter(e => !e.deleted);
  const [selected, setSelected] = useState(visibleEntries[0]?.id ?? '');
  const entry = visibleEntries.find(e => e.id === selected);
  const product = products.find(p => p.id === entry?.productId);
  const patch = (update: Partial<NewsEntry>) => onChange(entries.map(e => e.id === selected ? { ...e, ...update } : e));
  return <section className="admin-panel" aria-labelledby="news-heading">
    <div className="admin-tools"><div><h2 id="news-heading">Novedades estilo TikTok · {kind === 'normal' ? 'Normal' : 'Yucatecos'}</h2>
      <p>Agrega videos o imágenes y vincúlalos a un producto. Se muestran primero, en el orden de esta lista. Puedes guardar novedades inactivas y reactivarlas después.</p></div>
      <button type="button" onClick={() => {
        const id = 'novedad-' + crypto.randomUUID();
        onChange([...entries, { id, title: 'Nueva novedad', type: 'image', src: '', productId: '', enabled: false, deleted: false }]); setSelected(id);
      }}>+ Agregar novedad</button></div>
    <div className="admin-records" aria-label="Novedades guardadas">
      {visibleEntries.map(e => <button type="button" key={e.id} className={e.id === selected ? 'selected' : ''} aria-pressed={e.id === selected} onClick={() => setSelected(e.id)}>
        <strong>{e.title || 'Sin título'}</strong><small>{e.enabled ? 'Activa' : 'Inactiva'} · {e.type === 'video' ? 'Video' : 'Imagen'}</small>
      </button>)}
      {!visibleEntries.length && <p>No hay novedades personalizadas guardadas.</p>}
    </div>
    {entry && <div className="admin-record-editor" key={entry.id}>
      <label>Título de la novedad<input value={entry.title} maxLength={200} onChange={e => patch({ title: e.target.value })} /></label>
      <label>Tipo de contenido<select value={entry.type} onChange={e => patch({ type: e.target.value as NewsEntry['type'], src: '', enabled: false })}><option value="image">Imagen</option><option value="video">Video MP4</option></select></label>
      <label>Ruta o URL HTTPS del video / imagen<input value={entry.src} onChange={e => patch({ src: e.target.value })} placeholder={entry.type === 'video' ? '/videos/novedad.mp4' : '/menu/platillo.webp'} /></label>
      <label>{entry.type === 'video' ? 'Subir video MP4 (máximo 50 MB)' : 'Subir imagen de la novedad (máximo 6 MB)'}<input type="file" accept={entry.type === 'video' ? 'video/mp4' : 'image/jpeg,image/png,image/webp'} onChange={e => { void upload(e.target.files?.[0], url => patch({ src: url }), entry.type === 'video'); e.target.value = ''; }} /></label>
      <label>Producto del video / imagen<select value={entry.productId} onChange={e => patch({ productId: e.target.value })}>
        <option value="">Contenido general, sin producto</option>{products.filter(p => !p.deleted[kind] || p.id === entry.productId).map(p => <option key={p.id} value={p.id} disabled={p.deleted[kind]}>{p.name}{p.deleted[kind] ? ' (eliminado en este menú)' : p.enabled[kind] ? '' : ' (inactivo en este menú)'}</option>)}
      </select></label>
      {product && (product.deleted[kind] || !product.enabled[kind] || product.prices[kind] === null) && <p className="admin-notice">Esta novedad no aparecerá si el producto está eliminado, inactivo o sin precio en este menú.</p>}
      <label className="admin-check"><input type="checkbox" checked={entry.enabled} onChange={e => patch({ enabled: e.target.checked })} />Novedad activa</label>
      {entry.src && (entry.type === 'image' ? <img className="admin-preview" src={entry.src} alt="Vista previa de la novedad" /> : <video className="admin-media-preview" src={entry.src} controls preload="metadata" />)}
      <button type="button" onClick={onSave}>Guardar novedades y publicar cambios</button>
      <div className="admin-delete"><p>Eliminar retira esta novedad solo de este menú. Se conserva su archivo.</p>
        <button type="button" className="admin-danger" onClick={() => { patch({ deleted: true }); setSelected(''); }}>Eliminar novedad de este menú</button>
        <p>Publica los cambios para aplicar la eliminación.</p>
      </div>
    </div>}
    <p>Después aparecen las fotos habituales de los productos marcados en “Mostrar en novedades”, salvo que ya tengan una novedad personalizada activa. Desactivar una novedad conserva el archivo y no desmarca esa opción del producto.</p>
  </section>;
}
