import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import type { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';

/** Match the absolute public URL used by SSR's HTTP_TRANSFER_CACHE_ORIGIN_MAP. */
export const apiOriginInterceptor: HttpInterceptorFn = (request, next) => {
  if (isPlatformBrowser(inject(PLATFORM_ID)) && request.url.startsWith('/api/v1/')) {
    const origin = new URL(inject(DOCUMENT).baseURI).origin;
    return next(request.clone({ url: origin + request.url }));
  }
  return next(request);
};
