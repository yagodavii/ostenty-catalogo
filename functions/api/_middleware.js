export async function onRequest({ request, next }) {
  try {
    return await next();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("OSTENTY auth API exception", new URL(request.url).pathname, error?.stack || message);
    return new Response(JSON.stringify({ error: "Falha interna na autenticação.", diagnostic: message }), {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }
}
