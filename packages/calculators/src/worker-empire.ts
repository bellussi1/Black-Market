import { REGION_CODES } from '@bdo/shared';
import { z } from 'zod';

import { labelSchema, moneySchema, taxShape } from './models';
import { connectionRoute, type WorldNode } from './node-routing';
import { retention } from './tools';

const id = z.string().min(1).max(120);
const cp = z.number().int().min(0).max(10000);
const measured = z
  .number()
  .min(0.001)
  .max(1000000)
  .refine(
    (value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 0.00001,
    'Use até três casas decimais.',
  );
export const empireWorkerSchema = z.object({
  id,
  name: labelSchema,
  cityNodeId: id,
  species: z.enum(['goblin', 'human', 'giant', 'other']).default('other'),
  level: z.number().int().min(1).max(40).default(1),
});
export const empireTaskSchema = z.object({
  id,
  name: labelSchema,
  workerId: id,
  nodeId: id,
  enabled: z.boolean().default(true),
  cycleMinutes: measured.max(10080),
  extraContribution: cp.default(0),
  costPerCycle: moneySchema.default('0'),
  outputs: z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        name: labelSchema,
        quantity: measured,
        price: moneySchema.nullable().default(null),
      }),
    )
    .min(1)
    .max(20),
});
export const workerEmpireSchema = z
  .object({
    id,
    name: labelSchema.default('Meu império'),
    region: z.enum(REGION_CODES),
    hoursPerDay: z.number().min(0).max(24).default(8),
    contributionBudget: cp.default(100),
    ...taxShape,
    investedNodeIds: z.array(id).max(500).default([]),
    workers: z.array(empireWorkerSchema).max(100).default([]),
    tasks: z.array(empireTaskSchema).max(100).default([]),
    cities: z
      .array(
        z.object({ nodeId: id, contribution: cp, lodgingSlots: z.number().int().min(0).max(100) }),
      )
      .max(100)
      .default([]),
  })
  .superRefine((plan, context) => {
    for (const [key, ids] of [
      ['workers', plan.workers.map((row) => row.id)],
      ['tasks', plan.tasks.map((row) => row.id)],
      ['cities', plan.cities.map((row) => row.nodeId)],
      ['investedNodeIds', plan.investedNodeIds],
    ] as const)
      if (new Set(ids).size !== ids.length)
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'Há registros repetidos no império.',
        });
    const assigned = new Set<string>();
    for (const [index, task] of plan.tasks.entries()) {
      if (!plan.workers.some((worker) => worker.id === task.workerId))
        context.addIssue({
          code: 'custom',
          path: ['tasks', index],
          message: 'Escolha um trabalhador cadastrado.',
        });
      if (task.enabled && assigned.has(task.workerId))
        context.addIssue({
          code: 'custom',
          path: ['tasks', index],
          message: 'Um trabalhador não pode realizar duas tarefas ao mesmo tempo.',
        });
      if (task.enabled) assigned.add(task.workerId);
      if (new Set(task.outputs.map((item) => item.itemId)).size !== task.outputs.length)
        context.addIssue({
          code: 'custom',
          path: ['tasks', index],
          message: 'Agrupe as quantidades de produtos repetidos.',
        });
    }
  });
export type WorkerEmpire = z.infer<typeof workerEmpireSchema>;
export type EmpireWorker = z.infer<typeof empireWorkerSchema>;
export type EmpireTask = z.infer<typeof empireTaskSchema>;

export function calculateWorkerEmpire(raw: unknown, nodes: WorldNode[]) {
  const input = workerEmpireSchema.parse(raw);
  const tax = retention(input);
  const invested = new Set(input.investedNodeIds);
  const warnings: string[] = [];
  const rows = input.tasks.map((task) => {
    const worker = input.workers.find((row) => row.id === task.workerId)!;
    const route = connectionRoute(nodes, worker.cityNodeId, task.nodeId, invested);
    const cycles = Math.floor((input.hoursPerDay * 60000) / Math.round(task.cycleMinutes * 1000));
    const priced = task.outputs.every((item) => item.price !== null);
    const gross = priced
      ? task.outputs.reduce(
          (sum, item) =>
            sum +
            (BigInt(item.price!) * BigInt(Math.round(item.quantity * 1000)) * BigInt(cycles)) /
              1000n,
          0n,
        )
      : null;
    const cost = BigInt(task.costPerCycle) * BigInt(cycles);
    const net = gross === null ? null : (gross * tax.numerator) / tax.denominator - cost;
    return {
      id: task.id,
      name: task.name,
      enabled: task.enabled,
      worker,
      route,
      cycles,
      cost: String(cost),
      gross: gross === null ? null : String(gross),
      net: net === null ? null : String(net),
      outputs: task.outputs.map((item) => ({ ...item, dailyQuantity: item.quantity * cycles })),
      extraContribution: task.extraContribution,
      standaloneContribution: route ? route.contribution + task.extraContribution : null,
    };
  });
  const active = rows.filter((row) => row.enabled);
  const used = new Map<string, WorldNode>();
  for (const row of active) {
    if (!row.route) warnings.push(`Confira a conexão da tarefa ${row.name}.`);
    if (row.net === null) warnings.push(`Informe os preços da tarefa ${row.name}.`);
    for (const node of row.route?.nodes ?? []) used.set(node.id, node);
  }
  const cityNodes = new Set(input.workers.map((worker) => worker.cityNodeId));
  for (const cityId of cityNodes) {
    const city = input.cities.find((row) => row.nodeId === cityId);
    const count = input.workers.filter((worker) => worker.cityNodeId === cityId).length;
    const name = nodes.find((node) => node.id === cityId)?.name ?? 'cidade não disponível';
    if (!city) warnings.push(`Informe o custo e o alojamento de ${name}.`);
    else if (count > city.lodgingSlots)
      warnings.push(`Faltam ${count - city.lodgingSlots} vagas de alojamento em ${name}.`);
  }
  const connectionContribution = [...used.values()].reduce(
    (sum, node) => sum + node.contribution!,
    0,
  );
  const cityContribution = input.cities
    .filter((city) => cityNodes.has(city.nodeId))
    .reduce((sum, city) => sum + city.contribution, 0);
  const extraContribution = active.reduce((sum, row) => sum + row.extraContribution, 0);
  const contribution = connectionContribution + cityContribution + extraContribution;
  const newConnectionContribution = [...used.values()]
    .filter((node) => !invested.has(node.id))
    .reduce((sum, node) => sum + node.contribution!, 0);
  const contributionKnown =
    active.every((row) => row.route !== null) &&
    [...cityNodes].every((cityId) => input.cities.some((city) => city.nodeId === cityId));
  if (contribution > input.contributionBudget)
    warnings.push('O plano ultrapassa o orçamento de contribuição.');
  const net = active.every((row) => row.net !== null && row.route !== null)
    ? String(active.reduce((sum, row) => sum + BigInt(row.net!), 0n))
    : null;
  return {
    rows,
    warnings,
    contributionKnown,
    contribution,
    connectionContribution,
    cityContribution,
    extraContribution,
    newConnectionContribution,
    sharedSavings:
      active.reduce((sum, row) => sum + (row.route?.contribution ?? 0), 0) - connectionContribution,
    remainingContribution: input.contributionBudget - contribution,
    net,
    perContribution:
      net !== null && contributionKnown && contribution > 0
        ? String(BigInt(net) / BigInt(contribution))
        : null,
    usedNodeIds: [...used.keys()],
  };
}
