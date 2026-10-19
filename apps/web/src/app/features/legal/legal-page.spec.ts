import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { PRIVACY_COOKIE, PrivacyService } from '../../core/privacy.service';
import { PrivacyControls } from '../../shared/privacy-controls/privacy-controls';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { legalDocuments, legalUpdatedOn } from './legal-content';
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
      expect(element.querySelectorAll('nav[aria-label="Documentos da plataforma"] a').length).toBe(
        4,
      );
      expect(element.querySelectorAll('main').length).toBe(0);
      expect(element.querySelectorAll('h1').length).toBe(1);
      expect(element.querySelector('time')?.getAttribute('datetime')).toBe(legalUpdatedOn);
      for (const link of element.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
        expect(element.querySelector(link.getAttribute('href')!)).not.toBeNull();
      }
      for (const section of element.querySelectorAll('section[aria-labelledby]')) {
        expect(element.querySelector('#' + section.getAttribute('aria-labelledby'))).not.toBeNull();
      }
      expect(element.textContent).not.toMatch(
        /arsha|bdo-data-extractor|de onde vêm os dados|fórmula/i,
      );
    });
  }
  it('describes optional tutorial analytics without implementation field names', () => {
    const policy = JSON.stringify(legalDocuments['privacy']);
    expect(policy).toContain('início, conclusão ou encerramento de um tutorial');
    expect(policy).toContain('revisão editorial do guia');
    expect(policy).toContain('não registram passos individuais do tutorial');
    expect(policy).toContain('opcionais');
  });

  it('navigates all four public legal routes and marks the current document', async () => {
    await renderComponent(PrivacyControls, {}, [
      provideRouter([
        ...Object.entries({
          termos: 'terms',
          privacidade: 'privacy',
          cookies: 'cookies',
          contato: 'contact',
        }).map(([path, legal]) => ({ path, component: LegalPage, data: { legal } })),
      ]),
    ]);
    const harness = await RouterTestingHarness.create();
    for (const [path, key] of Object.entries({
      termos: 'terms',
      privacidade: 'privacy',
      cookies: 'cookies',
      contato: 'contact',
    })) {
      await harness.navigateByUrl('/' + path, LegalPage);
      for (const request of TestBed.inject(HttpTestingController).match(
        environment.apiBaseUrl + '/api/v1/platform/config',
      )) {
        request.flush({ contactEmail: 'enzobellussi3@gmail.com', controllerName: 'Bellussi' });
      }
      harness.detectChanges();
      const element = harness.routeNativeElement!;
      expect(element.querySelector('h1')?.textContent).toContain(legalDocuments[key].title);
      expect(element.querySelector('nav a[aria-current="page"]')?.getAttribute('href')).toBe(
        '/' + path,
      );
    }
    TestBed.inject(HttpTestingController).verify();
  });
  it('shows optional preferences only when configured and permits rejection then selective acceptance', async () => {
    const fixture = await renderComponent(PrivacyControls);
    const privacy = TestBed.inject(PrivacyService);
    expect((fixture.nativeElement as HTMLElement).querySelector('section')).toBeNull();
    privacy.optionalAvailable.set(true);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const button = Array.from(element.querySelectorAll('button')).find((row) =>
      row.textContent?.includes('Recusar estatísticas'),
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
    const checkbox = element.querySelector<HTMLInputElement>('label input[type="checkbox"]')!;
    expect(checkbox).not.toBeNull();
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    Array.from(element.querySelectorAll('button'))
      .find((row) => row.textContent?.includes('Salvar escolha'))!
      .click();
    fixture.detectChanges();
    expect(privacy.allowsAnalytics()).toBe(true);
    const preference = document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(PRIVACY_COOKIE + '='))
      ?.slice(PRIVACY_COOKIE.length + 1);
    expect(JSON.parse(decodeURIComponent(preference!)).analytics).toBe(true);
  });
});
