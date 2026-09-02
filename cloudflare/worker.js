/**
 * Optional Cloudflare Worker for the canonical Maybe deployment.
 *
 * It proxies the GitHub Pages source to https://webmcp.qinqinghua.tech/maybe/
 * while making WebMCP-critical response behavior deterministic.
 *
 * Route suggestion:
 *   webmcp.qinqinghua.tech/maybe*
 *
 * IMPORTANT:
 * - Disable Cloudflare Rocket Loader for this route, or keep the data-cfasync="false"
 *   attributes in index.html.
 * - If Cloudflare Agent Readiness > WebMCP injection is enabled for this zone,
 *   turn it OFF while Maybe registers its own document.modelContext tools.
 */

const UPSTREAM_ORIGIN = 'https://phamvanhuy15296-alt.github.io';
const APP_PREFIX = '/maybe';
const PROXY_BUILD = 'maybe-webmcp-proxy-2026-09-02-hotfix1';

function isCritical(pathname, contentType = '') {
  return (
    pathname === '/maybe/' ||
    pathname.endsWith('/index.html') ||
    pathname.endsWith('/js/webmcp.js') ||
    pathname.endsWith('/js/webmcp-bootstrap.js') ||
    pathname.endsWith('/js/decision-ui.js') ||
    contentType.includes('text/html')
  );
}

function withWebMCPHeaders(response, pathname) {
  const headers = new Headers(response.headers);
  const contentType = headers.get('content-type') || '';

  headers.set('Origin-Agent-Cluster', '?1');
  headers.set('Permissions-Policy', 'tools=(self)');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Maybe-Proxy-Build', PROXY_BUILD);

  if (isCritical(pathname, contentType)) {
    headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
    headers.set('CDN-Cache-Control', 'no-store');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request) {
    const incoming = new URL(request.url);

    if (incoming.pathname === APP_PREFIX) {
      return Response.redirect(`${incoming.origin}${APP_PREFIX}/${incoming.search}`, 308);
    }

    if (!incoming.pathname.startsWith(`${APP_PREFIX}/`)) {
      return new Response('Not found', { status: 404 });
    }

    // The GitHub Pages project already lives under /maybe/, so preserve the path.
    const upstreamUrl = new URL(`${incoming.pathname}${incoming.search}`, UPSTREAM_ORIGIN);
    const upstreamRequest = new Request(upstreamUrl, request);

    const upstreamResponse = await fetch(upstreamRequest, {
      cf: {
        cacheEverything: false,
        cacheTtl: 0,
      },
    });

    return withWebMCPHeaders(upstreamResponse, incoming.pathname);
  },
};
