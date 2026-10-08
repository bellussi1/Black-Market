import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { PrivacyService } from '../../core/privacy.service';
import { PrivacyControls } from '../../shared/privacy-controls/privacy-controls';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { legalDocuments } from './legal-content';
import { LegalPage } from './legal-page';
describe('legal navigation and privacy controls', () => {
  useMemoryStorage();
  for (const key of ['terms', 'privacy', 'cookies', 'contact']) {
    it('renders ' + key + ' with public contact and semantic navigation', async () => {
      const fixture = await renderComponent(LegalPage, {}, [
        { provide: ActivatedRoute, useValue: { data: of({ legal: key }) } },
      ]);
      TestBed.inject(HttpTestingController)
        .expectOne(environment.apiBaseUrl + '/api/v1/platform/config')
        .flush({ contactEmail: 'enzobellussi3@gmail.com', controllerName: 'Bellussi' });
      fixture.detectChanges();
      const element = fixture.nativeElement as HTMLElement;
      expect(element.querySelector('h1')?.textContent).toContain(legalDocuments[key].title);
      expect(element.querySelector('a[href="mailto:enzobellussi3@gmail.com"]')).not.toBeNull();
      expect(element.querySelectorAll('nav a').length).toBe(4);
      expect(element.querySelectorAll('main').length).toBe(0);
    });
  }
  it('shows optional preferences only when configured and permits rejection then selective acceptance', async () => {
    const fixture = await renderComponent(PrivacyControls);
    const privacy = TestBed.inject(PrivacyService);
    expect((fixture.nativeElement as HTMLElement).querySelector('section')).toBeNull();
    privacy.optionalAvailable.set(true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const button = Array.from(element.querySelectorAll('button')).find((row) =>
      row.textContent?.includes('Rejeitar'),
    )!;
    button.click();
    fixture.detectChanges();
    expect(privacy.allowsAnalytics()).toBe(false);
    privacy.open.set(true);
    fixture.detectChanges();
    Array.from(element.querySelectorAll('button'))
      .find((row) => row.textContent?.includes('Personalizar'))!
      .click();
    fixture.detectChanges();
    expect(element.querySelector('label input[type="checkbox"]')).not.toBeNull();
    fixture.componentInstance.analytics = true;
    privacy.save(fixture.componentInstance.analytics);
    fixture.detectChanges();
    expect(privacy.allowsAnalytics()).toBe(true);
  });
});
