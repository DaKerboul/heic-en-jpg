// Mini-backend : uniquement feedback texte anonyme. JAMAIS d'images.
//
// Durcissements : méthode + content-type vérifiés, taille bornée,
// anti-spam basique (longueur min, honeypot absent, rate-limit mémoire),
// aucune donnée persistée ici (brancher KV / webhook si besoin).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > MAX_PER_WINDOW;
}

export async function POST({ request }: { request: Request }) {
  if (request.headers.get('content-type')?.includes('application/json') !== true) {
    return Response.json({ ok: false, error: 'JSON attendu' }, { status: 415 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'JSON invalide' }, { status: 400 });
  }
  const message = String((body as Record<string, unknown>)?.message ?? '').trim().slice(0, 2000);
  const page = String((body as Record<string, unknown>)?.page ?? '').slice(0, 120);
  if (message.length < 10) {
    return Response.json({ ok: false, error: 'Message trop court (10 caractères min)' }, { status: 422 });
  }
  // Refuse les contenus suspects (URLs massives, base64 d'images collées par erreur)
  if (/data:image\/|base64/i.test(message) || (message.match(/https?:\/\//g) ?? []).length > 3) {
    return Response.json({ ok: false, error: 'Texte uniquement, sans image ni liens multiples' }, { status: 422 });
  }
  const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? 'unknown';
  if (rateLimited(ip)) {
    return Response.json({ ok: false, error: 'Trop de messages, réessayez dans une minute' }, { status: 429 });
  }
  // TODO: persister (KV / Upstash) ou notifier (webhook / email). Log edge en attendant.
  console.log('[feedback]', { page, len: message.length, excerpt: message.slice(0, 160) });
  return Response.json({ ok: true });
}
