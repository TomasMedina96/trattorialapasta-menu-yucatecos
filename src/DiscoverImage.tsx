import { useState } from 'react';
import { ShareProduct } from './ShareProduct';
import { useTemporaryZoom } from './useTemporaryZoom';

export function DiscoverImage({ src, title, active, prepared }: { src: string; title: string; active: boolean; prepared: boolean }) {
  const zoom = useTemporaryZoom(active);
  const [failed, setFailed] = useState(false);
  return <article className="discover-product" aria-label={title} aria-hidden={!active} inert={!active}>
    <button type="button" className="discover-image" ref={zoom.surfaceRef} aria-label={title}>
      {prepared && !failed && <img ref={zoom.imageRef} draggable={false} src={src} alt={title} width="1000" height="1000" decoding="async" onError={() => setFailed(true)} />}
      {failed && <span>Imagen no disponible</span>}
    </button>
    <div className="discover-copy"><div className="discover-title-line"><h2>{title}</h2><ShareProduct active={active} name={title} path="?novedades=1" /></div></div>
  </article>;
}
