import { describe, expect, it } from 'vitest';

import { defaultTax } from './models';
import { connectionRoute, type WorldNode } from './node-routing';
import { calculateWorkerEmpire, workerEmpireSchema } from './worker-empire';
import { emptyWorkspace, workspaceSchema } from './workspace';

const node = (id: string, contribution: number, links: string[]): WorldNode => ({
  id,
  name: id,
  contribution,
  links,
  enabled: true,
  main: id === 'town',
  x: 0,
  z: 0,
});
const nodes = [
  node('town', 0, ['shared']),
  node('shared', 2, ['a', 'b']),
  node('a', 1, []),
  node('b', 1, []),
];
const plan = () =>
  workerEmpireSchema.parse({
    id: 'empire',
    region: 'sa',
    ...defaultTax,
    hoursPerDay: 8,
    contributionBudget: 10,
    workers: [
      { id: 'w1', name: 'Um', cityNodeId: 'town' },
      { id: 'w2', name: 'Dois', cityNodeId: 'town' },
    ],
    cities: [{ nodeId: 'town', contribution: 3, lodgingSlots: 2 }],
    tasks: ['a', 'b'].map((id, index) => ({
      id,
      name: id,
      nodeId: id,
      workerId: 'w' + (index + 1),
      cycleMinutes: 60,
      costPerCycle: '100',
      extraContribution: 2,
      outputs: [{ itemId: index + 1, name: 'Material', quantity: 10, price: '1000' }],
    })),
  });
describe('Worker empire', () => {
  it('deduplicates shared connections and charges city costs once', () => {
    const result = calculateWorkerEmpire(plan(), nodes);
    expect(result.connectionContribution).toBe(4);
    expect(result.cityContribution).toBe(3);
    expect(result.extraContribution).toBe(4);
    expect(result.contribution).toBe(11);
    expect(result.sharedSavings).toBe(2);
    expect(result.remainingContribution).toBe(-1);
    expect(result.warnings).toContain('O plano ultrapassa o orçamento de contribuição.');
    expect(result.net).toBe('102400');
  });
  it('does not replace missing prices or routes with a zero profit', () => {
    const input = plan();
    input.tasks[0].outputs[0].price = null;
    expect(calculateWorkerEmpire(input, nodes).net).toBeNull();
    input.tasks[0].nodeId = 'missing';
    expect(calculateWorkerEmpire(input, nodes).contributionKnown).toBe(false);
  });
  it('rejects simultaneous jobs for one worker but allows paused alternatives', () => {
    const input = plan();
    input.tasks[1].workerId = 'w1';
    expect(workerEmpireSchema.safeParse(input).success).toBe(false);
    input.tasks[1].enabled = false;
    expect(workerEmpireSchema.safeParse(input).success).toBe(true);
    expect(calculateWorkerEmpire(input, nodes).net).toBe('51200');
  });
  it('counts full cycles and keeps exact money beyond the number safe range', () => {
    const input = plan();
    input.tasks = [input.tasks[0]];
    input.hoursPerDay = 1;
    input.tasks[0].cycleMinutes = 40;
    input.tasks[0].outputs[0].quantity = 0.5;
    input.tasks[0].outputs[0].price = '999999999999999999';
    input.exempt = true;
    const result = calculateWorkerEmpire(input, nodes);
    expect(result.rows[0].cycles).toBe(1);
    expect(result.net).toBe('499999999999999899');
  });
  it('keeps losses visible and warns about lodging shortage', () => {
    const input = plan();
    input.tasks[0].costPerCycle = '100000';
    input.cities[0].lodgingSlots = 1;
    const result = calculateWorkerEmpire(input, nodes);
    expect(BigInt(result.net!)).toBeLessThan(0n);
    expect(result.warnings.some((warning) => warning.includes('vagas de alojamento'))).toBe(true);
  });
  it('uses existing investments for routing without removing them from total CP', () => {
    const alternatives = [
      node('town', 0, ['cheap', 'owned']),
      node('cheap', 1, ['end']),
      node('owned', 3, ['end']),
      node('end', 1, []),
    ];
    expect(connectionRoute(alternatives, 'town', 'end')!.contribution).toBe(2);
    expect(connectionRoute(alternatives, 'town', 'end', new Set(['owned']))!.contribution).toBe(4);
    const input = plan();
    input.investedNodeIds = ['shared'];
    expect(calculateWorkerEmpire(input, nodes).newConnectionContribution).toBe(2);
    expect(calculateWorkerEmpire(input, nodes).contribution).toBe(11);
  });
  it('preserves old backups and validates empire references and limits', () => {
    const old: Record<string, unknown> = { ...emptyWorkspace() };
    delete old['workerEmpires'];
    expect(workspaceSchema.parse(old).workerEmpires).toEqual([]);
    const input = plan();
    input.tasks[0].workerId = 'missing';
    expect(workerEmpireSchema.safeParse(input).success).toBe(false);
    expect(workerEmpireSchema.safeParse({ ...plan(), hoursPerDay: 25 }).success).toBe(false);
    expect(
      workspaceSchema.safeParse({ ...emptyWorkspace(), workerEmpires: [plan(), plan()] }).success,
    ).toBe(false);
  });
});
