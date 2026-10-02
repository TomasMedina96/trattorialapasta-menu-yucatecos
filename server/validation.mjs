export const safeMedia = value => typeof value === 'string' && value.length <= 2048 && (value === '' || /^\/(?!\/)[\w./% -]+$/.test(value) || /^https:\/\/[^\s]+$/.test(value));
export function validateCatalog(data) {
  const str = (v, max = 5000) => typeof v === 'string' && v.length <= max;
  const flag = v => typeof v === 'boolean';
  const id = v => typeof v === 'string' && /^[\p{L}\d_-]{1,100}$/u.test(v);
  if (!data || !Number.isInteger(data.revision) || !Array.isArray(data.categories) || !data.categories.length || !Array.isArray(data.products) || data.products.length > 2000) return false;
  if (!data.categories.every(c => c && id(c.id) && str(c.label, 100) && c.label.trim())) return false;
  const categories = new Set(data.categories.map(c => c.id));
  if (categories.size !== data.categories.length || new Set(data.products.map(p => p?.id)).size !== data.products.length) return false;
  if (!data.products.every(p => p && id(p.id) && categories.has(p.category) && str(p.name, 200) && p.name.trim() && str(p.description) && safeMedia(p.image) && ['normal', 'yucatecos'].every(k => {
    const price = p.prices?.[k];
    return (price === null || (Number.isFinite(price) && price >= 0 && price <= 1000000)) && flag(p.deleted?.[k]) && flag(p.featured?.[k]) && flag(p.enabled?.[k]) && flag(p.news?.[k]) && (!p.enabled[k] || price !== null);
  }))) return false;
  const s = data.settings;
  const list = (value, check) => Array.isArray(value) && value.length <= 500 && value.every(entry => entry && id(entry.id) && check(entry)) && new Set(value.map(entry => entry.id)).size === value.length;
  return !!s && flag(s.yucatecosEnabled)
    && list(s.popups, p => flag(p.deleted) && flag(p.enabled) && ['normal', 'yucatecos', 'both'].includes(p.target) && str(p.title, 200) && str(p.message) && safeMedia(p.image))
    && s.popups.filter(p => !p.deleted && p.enabled).length <= 1
    && ['normal', 'yucatecos'].every(k => list(s.feeds?.[k], entry =>
      flag(entry.deleted) && flag(entry.enabled) && ['video', 'image'].includes(entry.type) && str(entry.title, 200) && (!!entry.title.trim() || entry.deleted)
      && safeMedia(entry.src) && (entry.deleted || !entry.enabled || !!entry.src)
      && str(entry.productId, 100) && (!entry.productId || data.products.some(p => p.id === entry.productId))));
}
