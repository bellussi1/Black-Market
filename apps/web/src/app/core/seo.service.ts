import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

const PUBLIC_DESCRIPTIONS: Readonly<Record<string, string>> = {
  '/': 'Black Market: itens, receitas e ferramentas de Black Desert Online em português brasileiro, com foco no mercado SA.',
  '/database/items':
    'Consulte itens de Black Desert Online em português, com imagens, categorias, descrições e relações de produção.',
  '/market':
    'Consulte preços e disponibilidade no mercado SA de Black Desert Online. Confira a origem e a data de atualização dos dados.',
  '/crafting':
    'Explore receitas de Black Desert Online e compare materiais, custos de produção e retorno estimado no mercado SA.',
  '/enhancement':
    'Planeje aprimoramentos de Black Desert Online com estimativas de probabilidade, materiais e custos.',
  '/lifeskills':
    'Planeje profissões de Black Desert Online considerando maestria, tempo, rendimento e custos informados.',
  '/rng':
    'Compare o retorno esperado de caixas de Black Desert Online com probabilidades e preços informados.',
  '/buffs':
    'Organize buffs de Black Desert Online e consulte seus efeitos para planejar suas atividades.',
};

const PRIVATE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  '/settings': 'Gerencie suas preferências e o backup dos seus dados no Black Market.',
  '/storage': 'Gerencie seu armazém pessoal no Black Market.',
  '/gear': 'Planeje seus equipamentos pessoais no Black Market.',
};

const MANAGED_SELECTORS = [
  'name="description"',
  'name="robots"',
  'property="og:title"',
  'property="og:description"',
  'property="og:type"',
  'property="og:url"',
  'property="og:site_name"',
  'name="twitter:title"',
  'name="twitter:description"',
  'name="twitter:card"',
];

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly destroyRef = inject(DestroyRef);
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    this.destroyRef.onDestroy(() => this.clearMetadata());

    if (this.router.navigated) this.update(this.router.url, this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => this.update(event.urlAfterRedirects, event.url));
  }

  private update(url: string, requestedUrl: string): void {
    this.clearMetadata();
    const path = this.pathOf(url);
    const requestedPath = this.pathOf(requestedUrl);
    let route = this.router.routerState.snapshot.root;
    let routeTitle: string | undefined;
    let privateRoute = false;

    while (route) {
      routeTitle = route.title ?? routeTitle;
      privateRoute ||= route.data['private'] === true || route.data['noindex'] === true;
      if (!route.firstChild) break;
      route = route.firstChild;
    }

    const origin = this.documentOrigin();
    const knownPublicRoute = Object.hasOwn(PUBLIC_DESCRIPTIONS, path);
    const knownRequest = Object.hasOwn(PUBLIC_DESCRIPTIONS, requestedPath);
    const indexable = knownPublicRoute && knownRequest && !privateRoute && origin !== null;
    const title = routeTitle ?? 'Black Market';
    const description =
      PUBLIC_DESCRIPTIONS[path] ??
      PRIVATE_DESCRIPTIONS[path] ??
      'Black Market: plataforma brasileira para jogadores de Black Desert Online.';

    this.title.setTitle(title);
    this.meta.addTags([
      { name: 'description', content: description },
      { name: 'robots', content: indexable ? 'index,follow' : 'noindex,nofollow' },
    ]);

    if (!indexable || !origin) return;

    const canonical = new URL(path, origin).href;
    const link = this.document.createElement('link');
    link.rel = 'canonical';
    link.href = canonical;
    this.document.head.appendChild(link);
    this.meta.addTags([
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: canonical },
      { property: 'og:site_name', content: 'Black Market' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:card', content: 'summary' },
    ]);
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
    for (const selector of MANAGED_SELECTORS) {
      for (const tag of this.meta.getTags(selector)) this.meta.removeTagElement(tag);
    }
    for (const link of this.document.head.querySelectorAll('link[rel="canonical"]')) {
      link.remove();
    }
  }
}
