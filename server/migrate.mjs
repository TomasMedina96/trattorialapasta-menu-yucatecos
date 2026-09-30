// Upgrade saved catalogs in memory; the next successful save persists the new shape.
// Stable IDs make repeated restarts safe even before the first save.
export function migrateCatalog(input) {
  const data = structuredClone(input);
  for (const product of data?.products ?? []) {
    if (product && product.deleted === undefined) product.deleted = { normal: false, yucatecos: false };
    if (product && typeof product.featured === 'boolean') {
      product.featured = { normal: product.featured, yucatecos: product.featured };
    }
  }
  const settings = data?.settings;
  if (!settings) return data;
  if (settings.popups === undefined) {
    const popup = settings.popup;
    settings.popups = popup && (popup.title || popup.message || popup.image || popup.enabled)
      ? [{ ...popup, title: popup.title?.trim() ? popup.title : 'Aviso guardado', id: 'aviso-original', target: 'normal' }] : [];
  }
  delete settings.popup;
  for (const popup of settings.popups ?? []) {
    if (popup && popup.deleted === undefined) popup.deleted = false;
  }
  for (const kind of ['normal', 'yucatecos']) {
    const feed = settings.feeds?.[kind];
    if (feed && !Array.isArray(feed)) {
      settings.feeds[kind] = feed.video ? [{
        id: `novedad-original-${kind}`, title: 'Video de portada',
        enabled: true, type: 'video', src: feed.video, productId: feed.productId,
      }] : [];
    }
    for (const entry of settings.feeds?.[kind] ?? []) {
      if (entry && entry.deleted === undefined) entry.deleted = false;
    }
  }
  return data;
}
