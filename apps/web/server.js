import { serve } from "bun";

serve({
  port: 5173,
  fetch(req) {
    const url = new URL(req.url);
    
    // Route handling
    switch (url.pathname) {
      case "/":
        return new Response(Bun.file("index.html"));
      case "/join":
        return new Response(Bun.file("join.html"));
      case "/spectate":
        return new Response(Bun.file("spectate.html"));
      case "/lobby":
        return new Response(Bun.file("lobby.html"));
      case "/game":
        return new Response(Bun.file("game.html"));
      case "/components.js":
        return new Response(Bun.file("components.js"), {
          headers: { "Content-Type": "application/javascript" }
        });
      case "/websocket-client.js":
        return new Response(Bun.file("websocket-client.js"), {
          headers: { "Content-Type": "application/javascript" }
        });
      case "/sounds.js":
        return new Response(Bun.file("sounds.js"), {
          headers: { "Content-Type": "application/javascript" }
        });
      default:
        return new Response("Not found", { status: 404 });
    }
  },
});

console.log("Frontend running at http://localhost:5173");
