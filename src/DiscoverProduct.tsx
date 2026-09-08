import { memo, useState } from "react";
import { priceOverrides, type MenuItem } from "./data/menu";
import { formatPrice, smallImage } from "./menuPresentation";

export const DiscoverProduct = memo(function DiscoverProduct({ item, prepared, active, onDetails }: {
  item: MenuItem;
  prepared: boolean;
  active: boolean;
  onDetails: (item: MenuItem) => void;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <article className="discover-product" aria-label={item.name} aria-hidden={!active} inert={!active}>
      <div className="discover-image">
        {prepared && !failed ? (
          <img src={smallImage(item.image)}
            srcSet={`${smallImage(item.image)} 480w, ${item.image} 1000w`}
            sizes="(max-width: 760px) 100vw, 700px"
            alt={item.name} width="1000" height="1000" decoding="async"
            // Only the current item and its neighbors mount an image: eagerly
            // prepare those two neighbors without fetching the rest of the feed.
            loading="eager" onError={() => setFailed(true)} />
        ) : failed ? <span>Imagen no disponible</span> : null}
      </div>
      <div className="discover-copy">
        {item.featured && <span className="discover-featured">Recomendado de la casa</span>}
        <h2>{item.name}</h2>
        <strong className="discover-price">{formatPrice(priceOverrides[item.id] ?? item.basePrice)}</strong>
        {item.description && <p>{item.description}</p>}
        <button type="button" className="discover-details" aria-haspopup="dialog"
          aria-label={`Ver detalles de ${item.name}`} onClick={() => onDetails(item)}>Ver detalles →</button>
      </div>
    </article>
  );
});
