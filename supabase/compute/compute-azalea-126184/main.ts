Deno.serve((_request: Request): Response =>
  new Response("Hello, world!", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  }));
