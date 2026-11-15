/* Precached complete MP3s must support HTML media byte ranges, including offline.
   Register before Workbox's full-response precache route; keep only one cached file. */
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url), range = request.headers.get('range');
  if (request.method !== 'GET' || !range || !url.href.startsWith(self.registration.scope + 'audio/') || !url.pathname.endsWith('.mp3')) return;
  event.respondWith((async () => {
    const cached = await caches.match(request.url, {ignoreSearch: true});
    if (!cached || cached.status !== 200) return fetch(request);
    const data = await cached.blob(), match = /^bytes=(\d*)-(\d*)$/i.exec(range.trim());
    const invalid = () => new Response(null, {status: 416, headers: {'Content-Range': `bytes */${data.size}`, 'Accept-Ranges': 'bytes'}});
    if (!match || (!match[1] && !match[2])) return invalid();
    const start = match[1] ? Number(match[1]) : Math.max(0, data.size - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), data.size - 1) : data.size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= data.size || end < start || (!match[1] && Number(match[2]) === 0)) return invalid();
    const headers = new Headers(cached.headers);
    headers.delete('Content-Encoding');
    headers.set('Content-Range', `bytes ${start}-${end}/${data.size}`);
    headers.set('Content-Length', String(end - start + 1));
    headers.set('Accept-Ranges', 'bytes');
    return new Response(data.slice(start, end + 1), {status: 206, headers});
  })());
});
