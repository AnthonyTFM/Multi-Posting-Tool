// One process serves the website (Next.js) and the phone agent's WebSocket
// (Twilio ConversationRelay connects to wss://<host>/voice/relay).

import "./src/lib/quiet-warnings.ts";
import { createServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";
import { handleRelayConnection } from "./src/lib/voice/relay.ts";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname: "0.0.0.0", port });
const handle = app.getRequestHandler();

await app.prepare();
const upgradeNext = app.getUpgradeHandler();

const server = createServer((req, res) => {
  void handle(req, res);
});

const relay = new WebSocketServer({ noServer: true });
relay.on("connection", handleRelayConnection);

server.on("upgrade", (req, socket, head) => {
  const { pathname } = new URL(req.url ?? "/", "http://localhost");
  if (pathname === "/voice/relay") {
    relay.handleUpgrade(req, socket, head, (ws) => relay.emit("connection", ws, req));
    return;
  }
  void upgradeNext(req, socket, head); // Next.js dev HMR
});

server.listen(port, () => {
  console.log(`> Omurice Ramen ready on http://localhost:${port} (${dev ? "dev" : "production"})`);
});
