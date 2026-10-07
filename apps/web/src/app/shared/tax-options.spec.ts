import { describe, expect, it, vi } from 'vitest';
import { defaultTax } from '@bdo/calculators';
import { TaxOptionsComponent } from './tax-options';
import { renderComponent, useMemoryStorage } from '../testing/test-setup';

describe('TaxOptionsComponent', () => {
  useMemoryStorage();

  it('emits an immutable input update when Value Pack is toggled in the template', async () => {
    const original = { ...defaultTax, valuePack: false };
    const fixture = await renderComponent(TaxOptionsComponent, { value: original });
    const changed = vi.fn();
    fixture.componentInstance.changed.subscribe(changed);
    const checkbox = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    await fixture.whenStable();
    expect(changed).toHaveBeenCalledWith({ ...original, valuePack: true });
    expect(original.valuePack).toBe(false);
  });

  it('renders tax and collection bonus from signal inputs', async () => {
    const fixture = await renderComponent(TaxOptionsComponent, {
      value: { ...defaultTax, taxPercent: 25, collectionBonus: 5 },
    });
    const fields = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>(
      'input[type="number"]',
    );
    expect(Array.from(fields, (field) => field.value)).toEqual(['25', '5']);
  });
});
