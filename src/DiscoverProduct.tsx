import { memo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ShareProduct } from "./ShareProduct";
import { useTemporaryZoom } from "./useTemporaryZoom";
import { type MenuItem } from "./data/menu";
import { formatPrice, smallImage } from "./menuPresentation";

export const DiscoverProduct = memo(function DiscoverProduct({ item, prepared, active, onDetails, image, title }: {
  item: MenuItem;
  image?: string;
  title?: string;
  prepared: boolean;
  active: boolean;
  onDetails: (item: MenuItem) => void;
}) {
  const zoom = useTemporaryZoom(active);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <article className="discover-product" aria-label={item.name} aria-hidden={!active} inert={!active}>
      <button type="button" className="discover-image" ref={zoom.surfaceRef} aria-haspopup="dialog"
        aria-label={`Abrir ${item.name}`} onClick={event => { if (event.detail === 0 || !zoom.suppressClick.current) onDetails(item); }}>
        {prepared && !loaded && !failed && <span className="discover-placeholder" aria-hidden="true" />}
        {prepared && !failed ? (
          <img ref={zoom.imageRef} draggable={false} src={image || smallImage(item.image)}
            srcSet={image ? undefined : `${smallImage(item.image)} 480w, ${item.image} 1000w`}
            sizes="(max-width: 760px) 100vw, 700px"
            alt={item.name} width="1000" height="1000" decoding="async"
            // Only the current item and its neighbors mount an image: eagerly
            // prepare those two neighbors without fetching the rest of the feed.
            loading="eager" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
        ) : failed ? <span>Imagen no disponible</span> : null}
      </button>
      <div className="discover-copy">
        {item.featured && <span className="discover-featured">Recomendado de la casa</span>}
        <div className="discover-title-line"><h2>{title || item.name}</h2>
          <ShareProduct active={active} name={item.name} path={`#producto-${item.id}`} /></div>
        <div className="discover-price-line">
          <strong className="discover-price">{formatPrice(item.basePrice)}</strong>
          <button type="button" className="discover-description-link" aria-haspopup="dialog" onClick={() => onDetails(item)}>
            <span aria-hidden="true">—</span> Ver más <ChevronDown size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
});
