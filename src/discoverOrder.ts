import { type MenuItem } from "./data/menu";
import type { NewsEntry } from './catalog';

export type DiscoverSlide = {
  id: string;
  type: 'image' | 'video';
  src: string;
  title: string;
  item?: MenuItem;
  custom: boolean;
};

export function buildDiscoverSlides(available: MenuItem[], automatic: MenuItem[], entries: NewsEntry[]): DiscoverSlide[] {
  const items = new Map(available.map(item => [item.id, item]));
  const custom: DiscoverSlide[] = entries.filter(entry => !entry.deleted && entry.enabled && entry.src && (!entry.productId || items.has(entry.productId)))
    .map(entry => ({ id: entry.id, type: entry.type, src: entry.src, title: entry.title, item: items.get(entry.productId), custom: true }));
  const represented = new Set(custom.flatMap(slide => slide.item ? [slide.item.id] : []));
  return [...custom, ...interleaveCategories(automatic.filter(item => !represented.has(item.id))).map(item => ({
    id: 'product-' + item.id, type: 'image' as const, src: item.image, title: item.name, item, custom: false,
  }))];
}

// Use the largest remaining category first so smaller categories can separate
// its dishes throughout the feed, instead of running out near the beginning.
export function interleaveCategories(items: readonly MenuItem[]): MenuItem[] {
  const groups = new Map<string, MenuItem[]>();
  for (const item of items) {
    const group = groups.get(item.category) ?? [];
    group.push(item);
    groups.set(item.category, group);
  }

  const queues = Array.from(groups, ([category, products]) => ({ category, products, next: 0 }));
  const ordered: MenuItem[] = [];
  let previousCategory: string | undefined;

  while (ordered.length < items.length) {
    const remaining = queues.filter(queue => queue.next < queue.products.length)
      .sort((a, b) => (b.products.length - b.next) - (a.products.length - a.next));
    const next = remaining.find(queue => queue.category !== previousCategory) ?? remaining[0];
    ordered.push(next.products[next.next++]);
    previousCategory = next.category;
  }
  return ordered;
}
