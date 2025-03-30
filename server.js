// Backend (server.js) with extended tracking for load testing
import { WebSocketServer } from 'ws';
import http from 'http';
import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static(path.join(__dirname, '../Holes_Client')));
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const players = new Map();

function broadcast(state) {
  const data = JSON.stringify({ type: 'STATE', data: { players: Object.fromEntries(players) } });
  for (let ws of wss.clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

wss.on('connection', (ws) => {
  const id = crypto.randomUUID();
  players.set(id, {
    x: Math.random() * 800,
    y: Math.random() * 600,
    hp: 100,
    energy: 100,
    score: 0,
    lastMove: Date.now(),
    status: 'idle',
    actions: [],
    latency: 0,
  });
  ws.send(JSON.stringify({ type: 'INIT', data: { id } }));

  ws.on('message', (msg) => {
    try {
      const { type, data } = JSON.parse(msg);
      const p = players.get(id);
      if (!p) return;

      switch (type) {
        case 'MOVE':
          p.x += data.dx;
          p.y += data.dy;
          p.lastMove = Date.now();
          p.status = 'moving';
          p.energy = Math.max(0, p.energy - 1);
          break;

        case 'ACTION':
          p.actions.push({ name: data.name, ts: Date.now() });
          p.score += 1;
          p.status = 'acting';
          break;

        case 'PING':
          ws.send(JSON.stringify({ type: 'PONG', data: { ts: data.ts } }));
          break;
      }
    } catch (err) {
      console.error('Failed to parse message:', err);
    }
  });

  ws.on('close', () => {
    players.delete(id);
  });
});

setInterval(() => broadcast(players), 33); // ~30 FPS broadcast

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
