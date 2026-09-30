import { useState } from 'react';
import type { Popup } from '../catalog';

export function PopupManager({ popups, onChange, onSave, upload }: {
  popups: Popup[];
  onChange: (popups: Popup[]) => void;
  onSave: () => void;
  upload: (file: File | undefined, apply: (url: string) => void, video?: boolean) => Promise<void>;
}) {
  const visiblePopups = popups.filter(p => !p.deleted);
  const [selected, setSelected] = useState(visiblePopups[0]?.id ?? '');
  const popup = visiblePopups.find(p => p.id === selected);
  const patch = (update: Partial<Popup>) => onChange(popups.map(p => p.id === selected
    ? { ...p, ...update } : update.enabled ? { ...p, enabled: false } : p));
  return <section className="admin-panel" aria-labelledby="popups-heading">
    <div className="admin-tools"><div><h2 id="popups-heading">Avisos emergentes</h2><p>Guarda avisos para reutilizarlos. Solo uno puede estar activo; activar otro desactiva el anterior.</p></div>
      <button type="button" onClick={() => {
        const id = 'aviso-' + crypto.randomUUID();
        onChange([...popups, { id, title: 'Nuevo aviso', message: '', image: '', target: 'normal', enabled: false, deleted: false }]);
        setSelected(id);
      }}>+ Agregar aviso</button></div>
    <div className="admin-records" aria-label="Avisos guardados">
      {visiblePopups.map(p => <button type="button" key={p.id} className={p.id === selected ? 'selected' : ''} aria-pressed={p.id === selected} onClick={() => setSelected(p.id)}>
        <strong>{p.title || 'Sin título'}</strong><small>{p.enabled ? 'Activo' : 'Inactivo'} · {p.target === 'both' ? 'Ambos menús' : p.target === 'normal' ? 'Menú normal' : 'Menú Yucatecos'}</small>
      </button>)}
      {!visiblePopups.length && <p>No hay avisos guardados. Agrega el primero.</p>}
    </div>
    {popup && <div className="admin-record-editor" key={popup.id}>
      <label>Título del aviso<input value={popup.title} maxLength={200} onChange={e => patch({ title: e.target.value })} /></label>
      <label>Mensaje del aviso<textarea rows={3} value={popup.message} maxLength={5000} onChange={e => patch({ message: e.target.value })} /></label>
      <label>Mostrar aviso en<select value={popup.target} onChange={e => patch({ target: e.target.value as Popup['target'] })}>
        <option value="normal">Menú normal</option><option value="yucatecos">Menú Yucatecos</option><option value="both">Ambos menús</option>
      </select></label>
      <label>Imagen del aviso · URL HTTPS o ruta<input value={popup.image} onChange={e => patch({ image: e.target.value })} /></label>
      <label>Subir imagen del aviso<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { void upload(e.target.files?.[0], url => patch({ image: url })); e.target.value = ''; }} /></label>
      {popup.image && <img className="admin-preview" src={popup.image} alt="Vista previa del aviso" />}
      <label className="admin-check"><input type="checkbox" checked={popup.enabled} onChange={e => patch({ enabled: e.target.checked })} />Aviso activo</label>
      <p>Al desactivarlo se conserva para volver a usarlo. Guarda los cambios para aplicarlos en el sitio.</p>
      <button type="button" onClick={onSave}>Guardar avisos y publicar cambios</button>
      <div className="admin-delete"><p>La eliminación de este aviso es global: dejará de aparecer en ambos menús.</p>
        <button type="button" className="admin-danger" onClick={() => { patch({ deleted: true }); setSelected(''); }}>Eliminar aviso de ambos menús</button>
        <p>Publica los cambios para aplicar la eliminación.</p>
      </div>
    </div>}
  </section>;
}
