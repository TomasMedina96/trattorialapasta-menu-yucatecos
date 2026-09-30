import type { MenuItem, MenuCategory } from './data/menu';
export type MenuKind = 'normal' | 'yucatecos';
export type Popup = {
  id: string;
  deleted: boolean;
  enabled: boolean;
  target: MenuKind | 'both';
  title: string;
  message: string;
  image: string;
};
export type NewsEntry = {
  id: string;
  deleted: boolean;
  enabled: boolean;
  title: string;
  type: 'image' | 'video';
  src: string;
  productId: string;
};
export type Product = Omit<MenuItem, 'basePrice' | 'featured'> & {
  deleted: Record<MenuKind, boolean>;
  featured: Record<MenuKind, boolean>;
  prices: Record<MenuKind, number | null>;
  enabled: Record<MenuKind, boolean>;
  news: Record<MenuKind, boolean>;
};
export type Catalog = {
  revision: number;
  categories: MenuCategory[];
  products: Product[];
  settings: {
    yucatecosEnabled: boolean;
    feeds: Record<MenuKind, NewsEntry[]>;
    popups: Popup[];
  };
};
export function itemsFor(catalog: Catalog, kind: MenuKind): MenuItem[] {
  return catalog.products.filter(p => !p.deleted[kind] && p.enabled[kind] && p.prices[kind] !== null)
    .map(p => ({ ...p, featured: p.featured[kind], basePrice: p.prices[kind]! }));
}
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch('/api/' + path, { ...init, headers: { 'X-Requested-With': 'TrattoriaAdmin', ...init?.headers } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'No se pudo guardar');
  return result;
}
