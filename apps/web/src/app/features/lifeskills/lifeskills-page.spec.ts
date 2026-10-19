import { describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from '../../core/analytics.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { LifeskillsPage } from './lifeskills-page';

describe('lifeskill session analytics', () => {
  useMemoryStorage();

  it('links the shared hub to production and keeps the public sessions route active', async () => {
    const fixture = await renderComponent(LifeskillsPage);
    const links = Array.from(
      fixture.nativeElement.querySelectorAll(
        'nav[aria-label="Navegação de Life Skills e recomendações"] a',
      ),
    ) as HTMLAnchorElement[];

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/recommendations?tab=production',
      '/lifeskills?tab=sessions',
    ]);
    expect(links.filter((link) => link.getAttribute('aria-current') === 'page')).toHaveLength(1);
    expect(links[1].getAttribute('aria-current')).toBe('page');
  });

  it('compares saved observations by context and refreshes the sample after deletion', async () => {
    const fixture = await renderComponent(LifeskillsPage);
    const page = fixture.componentInstance;
    page.patch({
      name: 'Rota observada',
      skill: 'gathering',
      mode: 'active',
      mastery: 0,
      minutes: 30,
      directIncome: '100',
    });
    page.save();
    page.patch({ minutes: 90 });
    page.save();
    page.patch({
      mode: 'afk',
      name: 'Outra atividade',
      minutes: 60,
      directIncome: '0',
      cost: '20',
    });
    page.save();
    fixture.detectChanges();
    const comparison = () =>
      fixture.nativeElement.querySelector('[data-session-comparison]') as HTMLElement | null;
    expect(comparison()?.textContent).toContain('Rota observada');
    expect(comparison()?.textContent).toContain('120');
    expect(comparison()?.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(comparison()?.textContent).toContain('Outra atividade');
    expect(comparison()?.textContent).toContain('0');
    const row = page.sessions().find((session) => session.input.name === 'Outra atividade');
    page.removeSession(row!.id);
    fixture.detectChanges();
    expect(comparison()?.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(comparison()?.textContent).not.toContain('Outra atividade');
    const cells = comparison()!.querySelectorAll('tbody td');
    expect(cells[0].textContent).toContain('2');
    expect(cells[3].textContent?.trim()).toBe('100');
    for (const session of [...page.sessions()]) page.removeSession(session.id);
    fixture.detectChanges();
    expect(comparison()).toBeNull();
  });

  it('shows unknown legacy context separately from zero mastery and updates with region', async () => {
    const fixture = await renderComponent(LifeskillsPage);
    const page = fixture.componentInstance;
    page.patch({ name: 'Legado' });
    page.save();
    page.patch({ name: 'Atual', mastery: 0, mode: 'active', skill: 'fishing' });
    page.save();
    fixture.detectChanges();
    const text = fixture.nativeElement.querySelector('[data-session-comparison]').textContent;
    expect(text).toContain('Maestria não informada');
    expect(text).toContain('Modo não informado');
    expect(text).toContain('Maestria 0');
    expect(text).toContain('Pesca');
    page.store.update((state) => ({ ...state, region: 'eu' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-session-comparison]')).toBeNull();
  });

  it('records a saved session without its name, inputs, or calculated silver', async () => {
    const capture = vi.fn();
    const fixture = await renderComponent(LifeskillsPage, {}, [
      { provide: AnalyticsService, useValue: { capture } },
    ]);
    fixture.componentInstance.save();

    expect(capture.mock.calls).toEqual([
      ['journey_started', { feature: 'lifeskills', action: 'save' }],
      ['journey_completed', { feature: 'lifeskills', action: 'save', status: 'success' }],
    ]);
    expect(JSON.stringify(capture.mock.calls)).not.toMatch(/Minha sessão|silver|999999/i);
  });
});
