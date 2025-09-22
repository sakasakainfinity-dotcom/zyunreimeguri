import type { Mission } from './types';

const FALLBACK_COLORS = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#6366F1',
  '#8B5CF6',
  '#EC4899',
  '#F43F5E'
];

function hashSlugToHue(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

export function getMissionColor(mission: Mission, index: number): string {
  if (mission.color && mission.color.trim().length > 0) {
    return mission.color;
  }
  const fallback = FALLBACK_COLORS[index % FALLBACK_COLORS.length];
  return fallback ?? `hsl(${hashSlugToHue(mission.slug)} 70% 55%)`;
}

export function sortMissions(missions: Mission[]): Mission[] {
  return [...missions].sort((a, b) => a.slug.localeCompare(b.slug));
}

export function getPrimaryMissionSlug(
  missionSlugs: string[],
  selected: string[]
): string | null {
  if (selected.length === 0) {
    return missionSlugs[0] ?? null;
  }
  for (const slug of selected) {
    if (missionSlugs.includes(slug)) {
      return slug;
    }
  }
  return missionSlugs[0] ?? null;
}
