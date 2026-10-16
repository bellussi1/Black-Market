import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { calculateMarket, defaultTax, MODEL_VERSION } from '@bdo/calculators';
import { describe, expect, it } from 'vitest';

import { environment } from '../../environments/environment';
import { renderComponent, useMemoryStorage } from '../testing/test-setup';
import { CalculationProof } from './calculation-proof';

describe('CalculationProof', () => {
  useMemoryStorage();
  const value = { ...defaultTax, price: '1000000', quantity: 1, cost: '0' };
  const url = `${environment.apiBaseUrl}/api/v1/calculators/market`;

  it('confirms the local result after a click and an identical API response', async () => {
    const fixture = await renderComponent(CalculationProof, { tool: 'market', value });
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')!.click();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('button')!.disabled).toBe(true);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.proof')?.getAttribute('aria-busy'),
    ).toBe('true');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.proof-message')?.textContent,
    ).toContain('Conferindo');
    const http = TestBed.inject(HttpTestingController);
    const request = http.expectOne(url);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(value);
    request.flush({ modelVersion: MODEL_VERSION, result: calculateMarket(value) });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Resultado conferido');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.proof')?.hasAttribute('aria-busy'),
    ).toBe(false);
    http.verify();
  });

  it('reports a model mismatch instead of confirming the response', async () => {
    const fixture = await renderComponent(CalculationProof, { tool: 'market', value });
    fixture.componentInstance.verify();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(url).flush({ modelVersion: 'unknown', result: calculateMarket(value) });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Recarregue a página');
    expect(fixture.componentInstance.status()).toBe('error');
    http.verify();
  });

  it('keeps a clear message when the API is unavailable', async () => {
    const fixture = await renderComponent(CalculationProof, { tool: 'market', value });
    fixture.componentInstance.verify();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(url).flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'continuar usando a calculadora',
    );
    http.verify();
  });
});
