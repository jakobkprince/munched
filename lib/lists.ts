import { Photo } from '../types';

/** How many items carry each tag (used for the tag filter's Quantity view). */
export function countTags(items: { tags: string[] }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    for (const tag of item.tags) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return counts;
}

/** Items with at least one of the selected tags (all items when none are selected). */
export function filterByTags<T extends { tags: string[] }>(items: T[], selected: string[]): T[] {
  if (selected.length === 0) return items;
  return items.filter((item) => selected.some((tag) => item.tags.includes(tag)));
}

/** Groups photos by the log they belong to, keeping their order. */
export function photosByLog(photos: Photo[]): Map<string, Photo[]> {
  const byLog = new Map<string, Photo[]>();
  for (const photo of photos) {
    const list = byLog.get(photo.log_id);
    if (list) list.push(photo);
    else byLog.set(photo.log_id, [photo]);
  }
  return byLog;
}
