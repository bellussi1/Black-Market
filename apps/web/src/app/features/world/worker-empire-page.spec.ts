import { describe, expect, it } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { WorkerEmpireComponent } from './worker-empire';

describe('WorkerEmpireComponent', () => {
  useMemoryStorage();
  const nodes = [
    {
      id: 'town',
      name: 'Velia',
      contribution: 0,
      links: [],
      x: 0,
      z: 0,
      enabled: true,
      main: true,
    },
  ];
  it('renders labelled inputs and saves a plan in the existing workspace backup', async () => {
    const fixture = await renderComponent(WorkerEmpireComponent, { nodes });
    const page = fixture.componentInstance;
    page.worker = {
      id: 'w',
      name: 'Meu trabalhador',
      cityNodeId: 'town',
      species: 'goblin',
      level: 10,
    };
    page.addWorker();
    page.editCity('town');
    page.addCity();
    page.save();
    fixture.detectChanges();
    expect(page.store.data().workerEmpires[0].workers[0].name).toBe('Meu trabalhador');
    expect(fixture.nativeElement.querySelector('#empire-title').textContent).toContain(
      'contribuição',
    );
    expect(
      fixture.nativeElement.querySelector('input[name="workerName"]').closest('label'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain(
      'Império salvo',
    );
  });
  it('keeps regional plans separate and does not mutate a saved plan while editing', async () => {
    const fixture = await renderComponent(WorkerEmpireComponent, { nodes });
    const page = fixture.componentInstance;
    page.save();
    const saved = page.store.data().workerEmpires[0];
    page.load(saved);
    page.patch({ name: 'Rascunho alterado' });
    expect(saved.name).toBe('Meu império');
    page.store.setRegion('eu');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.draft().region).toBe('eu');
    expect(page.saved()).toEqual([]);
    page.store.setRegion('sa');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.saved()).toHaveLength(1);
  });
  it('blocks concurrent worker assignment and preserves an unknown price', async () => {
    const fixture = await renderComponent(WorkerEmpireComponent, { nodes });
    const page = fixture.componentInstance;
    page.worker = { id: 'w', name: 'Trabalhador', cityNodeId: 'town', species: 'human', level: 1 };
    page.addWorker();
    const task = {
      id: 'one',
      name: 'Produção',
      workerId: 'w',
      nodeId: 'town',
      enabled: true,
      cycleMinutes: 60,
      costPerCycle: '0',
      extraContribution: 0,
      outputs: [{ itemId: 1, name: 'Produto', quantity: 1, price: null }],
    };
    page.task = task;
    page.addTask();
    page.task = { ...task, id: 'two' };
    page.addTask();
    fixture.detectChanges();
    expect(page.draft().tasks).toHaveLength(1);
    expect(page.message()).toContain('duas tarefas');
    expect(page.result().value?.net).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Dados incompletos');
  });
});
