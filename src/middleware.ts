// src/middleware.ts
import type { APIContext, MiddlewareNext } from 'astro';

const ASSET_RE = /\.(?:png|jpe?g|webp|gif|svg|ico|css|js|map|woff2?|ttf|txt|xml|pdf|mp4|mp3)$/i;
const ASSET_DIR_RE = /^\/(?:images|img|assets|static|_astro)\//i;

export async function onRequest(context: APIContext, next: MiddlewareNext) {
  const p = new URL(context.request.url).pathname;

  // Si es asset (por extensión o carpeta), no pasar por SSR
  if (ASSET_RE.test(p) || ASSET_DIR_RE.test(p)) {
    // Negative caching de 404: si no existe, que el CDN/navegador lo recuerde
    return new Response('', {
      status: 404,
      headers: {
        // 5 min: corta reintentos en bucle
        'cache-control': 'public, max-age=300, s-maxage=300'
      }
    });
  }

  return next();
}
