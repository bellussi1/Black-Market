import { describe, expect, it } from 'vitest';

import { renderComponent } from '../../testing/test-setup';
import { NotFoundPage } from './not-found-page';

describe('NotFoundPage', () => {
  it('uses the shared page heading and provides clear recovery routes', async () => {
    const fixture = await renderComponent(NotFoundPage);
    const page = fixture.nativeElement as HTMLElement;

    expect(
      page.querySelector('.tool-page > header.tool-heading h1#not-found-title')?.textContent,
    ).toContain('Esta página não existe');
    expect(page.querySelector('a[href="/"]')?.textContent).toContain('Voltar ao início');
    expect(page.querySelector('a[href="/market"]')?.textContent).toContain('Abrir mercado');
  });
});
