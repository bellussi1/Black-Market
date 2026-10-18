import { calculateActivity } from '@bdo/calculators';

import type { Workspace } from '../../core/workspace-models';

export interface ObservedComparison {
  key: string;
  name: string;
  skill?: Workspace['sessions'][number]['input']['skill'];
  mastery?: number;
  mode?: 'active' | 'afk';
  count: number;
  minutes: number;
  profit: string;
  perHour: string;
  firstAt: string;
  lastAt: string;
}

export function compareObservedSessions(
  sessions: Workspace['sessions'],
  region: Workspace['region'],
): ObservedComparison[] {
  const groups = new Map<string, ObservedComparison & { durationMillis: number }>();
  for (const session of sessions) {
    if (session.region !== region) continue;
    const { input, createdAt } = session;
    const key = JSON.stringify([
      input.name.trim().toLocaleLowerCase('pt-BR'),
      input.skill ?? null,
      input.mastery ?? null,
      input.mode ?? null,
    ]);
    const group = groups.get(key) ?? {
      key,
      name: input.name.trim(),
      skill: input.skill,
      mastery: input.mastery,
      mode: input.mode,
      count: 0,
      minutes: 0,
      durationMillis: 0,
      profit: '0',
      perHour: '0',
      firstAt: createdAt,
      lastAt: createdAt,
    };
    group.count++;
    group.durationMillis += Math.round(input.minutes * 1000);
    group.minutes = group.durationMillis / 1000;
    group.profit = String(BigInt(group.profit) + BigInt(calculateActivity(input).profit));
    group.perHour = String((BigInt(group.profit) * 60_000n) / BigInt(group.durationMillis));
    if (Date.parse(createdAt) < Date.parse(group.firstAt)) group.firstAt = createdAt;
    if (Date.parse(createdAt) > Date.parse(group.lastAt)) group.lastAt = createdAt;
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort((a, b) => {
      const difference =
        BigInt(b.profit) * BigInt(a.durationMillis) - BigInt(a.profit) * BigInt(b.durationMillis);
      return difference > 0n ? 1 : difference < 0n ? -1 : a.key.localeCompare(b.key, 'pt-BR');
    })
    .map(({ durationMillis: _, ...group }) => group);
}
