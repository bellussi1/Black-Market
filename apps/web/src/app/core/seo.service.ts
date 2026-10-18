import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, type MetaDefinition, Title } from '@angular/platform-browser';
import type { RouterStateSnapshot } from '@angular/router';
import { TitleStrategy } from '@angular/router';

import {
  isPublicSeoPath,
  PRIVATE_DESCRIPTIONS,
  publicDescription,
  withNonAffiliationDisclosure,
} from './seo-content';

const MANAGED_SELECTORS = [
  'name="description"',
  'name="robots"',
  'property="og:title"',
  'property="og:description"',
  'property="og:type"',
  'property="og:url"',
  'property="og:site_name"',
  'property="og:locale"',
  'property="og:image"',
  'property="og:image:type"',
  'property="og:image:width"',
  'property="og:image:height"',
  'property="og:image:alt"',
  'name="twitter:title"',
  'name="twitter:description"',
  'name="twitter:card"',
  'name="twitter:image"',
  'name="twitter:image:alt"',
];

const SHARE_IMAGE = '/og-black-market.png';
const SHARE_IMAGE_ALT =
  'Black Market, ferramenta independente de mercado, receitas e planejamento para Black Desert Online, sem afiliação com a Pearl Abyss.';

@Injectable({ providedIn: 'root' })
export class SeoService extends TitleStrategy {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private currentUrl = '/';

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot) ?? 'Black Market';
    this.currentUrl = snapshot.url;
    let route = snapshot.root;
    let privateRoute = false;
    while (route) {
      privateRoute ||= route.data['private'] === true || route.data['noindex'] === true;
      if (!route.firstChild) break;
      route = route.firstChild;
    }
    this.update(snapshot.url, title, privateRoute);
  }

  describe(name: string, description: string) {
    const title = name.replace(/<[^>]*>/g, '').slice(0, 120) + ' · Black Market';
    const summary = withNonAffiliationDisclosure(
      description
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .slice(0, 120),
    );
    this.title.setTitle(title);
    const tags: MetaDefinition[] = [
      { name: 'description', content: summary },
      { property: 'og:title', content: title },
      { property: 'og:description', content: summary },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: summary },
    ];
    for (const tag of tags) this.meta.updateTag(tag);
    const origin = this.documentOrigin();
    if (origin) {
      const path = this.pathOf(this.currentUrl);
      const canonical = new URL(path, origin).href;
      this.setCanonical(canonical);
      this.addSocialMetadata(title, summary, canonical, origin);
      this.setStructuredData(path, title, summary, canonical, origin);
    }
  }
  unavailable() {
    this.document.head.querySelector('script[data-black-market-schema]')?.remove();
    for (const link of this.document.head.querySelectorAll('link[rel="canonical"]')) {
      link.remove();
    }
    for (const selector of MANAGED_SELECTORS.filter((value) => value !== 'name="robots"')) {
      for (const tag of this.meta.getTags(selector)) this.meta.removeTagElement(tag);
    }
    this.meta.updateTag({ name: 'robots', content: 'noindex,nofollow' });
  }

  private update(url: string, titleOverride: string, privateRoute: boolean): void {
    this.clearMetadata();
    const path = this.pathOf(url);

    const origin = this.documentOrigin();
    const knownPublicRoute = isPublicSeoPath(path);
    const indexable = knownPublicRoute && !privateRoute && origin !== null;
    const title = titleOverride || 'Black Market';
    const description = withNonAffiliationDisclosure(
      publicDescription(path) ??
        PRIVATE_DESCRIPTIONS[path] ??
        'Black Market: plataforma brasileira para jogadores de Black Desert Online.',
    );

    this.title.setTitle(title);
    this.meta.addTags([
      { name: 'description', content: description },
      { name: 'robots', content: indexable ? 'index,follow' : 'noindex,nofollow' },
    ]);

    if (!indexable || !origin) return;

    const canonical = new URL(path, origin).href;
    this.setCanonical(canonical);
    this.addSocialMetadata(title, description, canonical, origin);
    this.setStructuredData(path, title, description, canonical, origin);
  }

  private addSocialMetadata(title: string, description: string, canonical: string, origin: string) {
    const image = new URL(SHARE_IMAGE, origin).href;
    const tags: MetaDefinition[] = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: canonical },
      { property: 'og:site_name', content: 'Black Market' },
      { property: 'og:locale', content: 'pt_BR' },
      { property: 'og:image', content: image },
      { property: 'og:image:type', content: 'image/png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: SHARE_IMAGE_ALT },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:image', content: image },
      { name: 'twitter:image:alt', content: SHARE_IMAGE_ALT },
    ];
    for (const tag of tags) this.meta.updateTag(tag);
  }

  private setCanonical(canonical: string): void {
    const link = this.document.createElement('link');
    link.rel = 'canonical';
    link.href = canonical;
    this.document.head.querySelector('link[rel="canonical"]')?.replaceWith(link);
    if (!this.document.head.querySelector('link[rel="canonical"]'))
      this.document.head.appendChild(link);
  }

  private setStructuredData(
    path: string,
    title: string,
    description: string,
    canonical: string,
    origin: string,
  ): void {
    const website = { '@type': 'WebSite', name: 'Black Market', url: origin, inLanguage: 'pt-BR' };
    const data =
      path === '/'
        ? {
            '@context': 'https://schema.org',
            ...website,
            description,
          }
        : {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: title,
            description,
            url: canonical,
            inLanguage: 'pt-BR',
            isPartOf: website,
          };
    this.document.head.querySelector('script[data-black-market-schema]')?.remove();
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-black-market-schema', '');
    script.textContent = JSON.stringify(data).replaceAll('<', '\\u003c');
    this.document.head.appendChild(script);
  }

  private pathOf(url: string): string {
    return url.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  }

  private documentOrigin(): string | null {
    try {
      const url = new URL(this.document.URL);
      if (!['http:', 'https:'].includes(url.protocol)) return null;
      if (
        url.hostname === 'localhost' ||
        url.hostname.endsWith('.localhost') ||
        url.hostname.endsWith('.invalid') ||
        url.hostname === '127.0.0.1' ||
        url.hostname === '[::1]'
      ) {
        return null;
      }
      return url.origin;
    } catch {
      return null;
    }
  }

  private clearMetadata(): void {
    this.document.head.querySelector('script[data-black-market-schema]')?.remove();
    for (const selector of MANAGED_SELECTORS) {
      for (const tag of this.meta.getTags(selector)) this.meta.removeTagElement(tag);
    }
    for (const link of this.document.head.querySelectorAll('link[rel="canonical"]')) {
      link.remove();
    }
  }
}
