// Cloudflare Pages Function for /day/:date.
//
// The static build (scripts/build-static.js) only pre-renders a real page
// for the dates that actually have a views/pages/days/<date>.hbs file. This
// function fills the gap for every other date: it tries the pre-rendered
// page first, and falls back to the same "not available" page the Express
// app serves locally (see server.js's /day/:date 404 handler).
//
// ?date_override=true bypasses the "is this actually today" check, same as
// it does on the live Express server — the build also pre-renders that
// bypassed content per day (under /day-available/<date>/), so this function
// just needs to fetch that variant instead of the normal one.
export async function onRequestGet(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const bypassDateCheck = url.searchParams.get('date_override') === 'true';

  const pageUrl = bypassDateCheck
    ? new URL(`/day-available/${params.date}/`, url)
    : new URL(`/day/${params.date}/`, url);
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
