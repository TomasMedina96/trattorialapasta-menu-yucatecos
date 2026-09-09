import { menuItems, type MenuItem } from "./data/menu";

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

// A stable order shared across renders; the traditional menu is untouched.
export const discoverItems = interleaveCategories(menuItems);
