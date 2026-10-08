import { TrackedObject } from '../types/vision';

function pluralizeClass(name: string, count: number): string {
  if (count === 1) {
    if (name === 'person') return '1 person';
    return `1 ${name}`;
  }

  // Irregular plurals
  if (name === 'person') return `${count} people`;
  if (name === 'mouse') return `${count} mice`;
  if (name === 'knife') return `${count} knives`;
  if (name.endsWith('s') || name.endsWith('ch') || name.endsWith('sh') || name.endsWith('x')) {
    return `${count} ${name}es`;
  }
  if (name.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(name[name.length - 2])) {
    return `${count} ${name.slice(0, -1)}ies`;
  }

  return `${count} ${name}s`;
}

export function generateSceneSummary(objects: TrackedObject[]): string {
  if (!objects || objects.length === 0) {
    return 'No objects detected in the current view.';
  }

  // Count by class
  const counts: Record<string, number> = {};
  for (const obj of objects) {
    counts[obj.class] = (counts[obj.class] || 0) + 1;
  }

  // Sort by highest count
  const sortedClasses = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  const items: string[] = sortedClasses.map((cls) => pluralizeClass(cls, counts[cls]));

  if (items.length === 1) {
    return `Current scene contains ${items[0]}.`;
  }
  if (items.length === 2) {
    return `Current scene contains ${items[0]} and ${items[1]}.`;
  }

  const allExceptLast = items.slice(0, -1).join(', ');
  const last = items[items.length - 1];
  return `Current scene contains ${allExceptLast} and ${last}.`;
}
