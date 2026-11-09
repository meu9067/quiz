// Worker entry point for the live deployment (see wrangler.toml's `main`).
//
// Everything is served as static assets from dist/ (built by
// scripts/build-static.js) except /day/:date, which needs a tiny bit of
// routing logic: it tries the pre-rendered page for that exact date first,
// falls back to the same "not available" page server.js serves locally, and
// supports ?date=true to bypass the "is this actually today" check
// by serving the pre-rendered dist/day-available/<date>/ variant instead
// (see scripts/build-static.js for how both variants get built).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/day\/([^/]+)\/?$/);

    if (!match) {
      return env.ASSETS.fetch(request);
    }

    return handleDayRequest(request, env, match[1]);
  },
};

async function handleDayRequest(request, env, date) {
  const url = new URL(request.url);
  const bypassDateCheck = url.searchParams.get('date') === 'true';

  const pageUrl = bypassDateCheck
    ? new URL(`/day-available/${date}/`, url)
    : new URL(`/day/${date}/`, url);
  const pageResponse = await env.ASSETS.fetch(new Request(pageUrl, request));

  if (pageResponse.status === 200) {
    return pageResponse;
  }

  const fallbackUrl = new URL('/day-unavailable.html', url);
  const fallbackResponse = await env.ASSETS.fetch(new Request(fallbackUrl, request));
  const body = await fallbackResponse.text();

  return new Response(body, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=UTF-8' },
  });
}
