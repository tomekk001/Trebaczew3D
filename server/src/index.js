// Serwer multiplayer "Symulator życia w Trębaczewie" – Cloudflare Worker + Durable Object.
// Każdy pokój (t1, t2, …) to osobny Durable Object; do pokoju wchodzi max MAX graczy.
import { DurableObject } from 'cloudflare:workers';

const MAX = 30;
const ROOMS = /^t[1-9]$/;
const BAD = ['kurw','chuj','huj','pierdol','jeb','pizd','cip','skurw','dziwk','pedal','pedał','spierdal','zajeb','wypierdal','fiut','kutas','szmat','debil','cwel','nigg','nigg'];
const clean = (t, n) => String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g, '').slice(0, n).trim();
function censor(t) {
  return t.split(/(\s+)/).map(w => { const l = w.toLowerCase().replace(/[^a-ząćęłńóśźż0-9]/g, '').replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e').replace(/4/g, 'a').replace(/@/g, 'a');
    return BAD.some(b => l.includes(b)) ? w[0] + '*'.repeat(Math.max(2, w.length - 1)) : w; }).join('');
}
const num = (v, a, b) => { v = +v; return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : 0; };
const hex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : null;
const VEH = ['car', 'van', 'moto', 'tractor', 'bus', 'bike', 'fire'];
function cleanPresence(p) {
  p = p || {};
  return { x: num(p.x, -6000, 6000), z: num(p.z, -6000, 6000), h: num(p.h, -50, 50), s: num(p.s, 0, 80), v: VEH.includes(p.v) ? p.v : null, vc: hex(p.vc), col: hex(p.col) || '#888888', nick: censor(clean(p.nick, 24)) || null };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/' || url.pathname === '/status') {
      const out = {};
      for (let i = 1; i <= 3; i++) { const r = await env.ROOM.get(env.ROOM.idFromName('t' + i)).fetch('https://do/count'); out['t' + i] = +(await r.text()); }
      return new Response(JSON.stringify({ ok: true, gra: 'Symulator życia w Trębaczewie', pokoje: out }), { headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' } });
    }
    const m = url.pathname.match(/^\/room\/([a-z0-9]+)$/);
    if (!m || !ROOMS.test(m[1])) return new Response('Nie ma takiego pokoju', { status: 404 });
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('Oczekiwano WebSocket', { status: 426 });
    return env.ROOM.get(env.ROOM.idFromName(m[1])).fetch(req);
  }
};

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  socks() { return this.ctx.getWebSockets().filter(w => { const a = w.deserializeAttachment(); return a && a.id; }); }
  send(ws, o) { try { ws.send(JSON.stringify(o)); } catch (e) {} }
  bcast(o, except) { const s = JSON.stringify(o); for (const w of this.socks()) if (w !== except) { try { w.send(s); } catch (e) {} } }
  async fetch(req) {
    if (new URL(req.url).pathname === '/count') return new Response(String(this.socks().length));
    const pair = new WebSocketPair(); const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    const others = this.socks().filter(w => w !== server);
    if (others.length >= MAX) { this.send(server, { t: 'full' }); server.close(4001, 'full'); return new Response(null, { status: 101, webSocket: client }); }
    const id = crypto.randomUUID().slice(0, 8);
    server.serializeAttachment({ id, p: null, chat: 0, n: 0, win: 0 });
    this.send(server, { t: 'hello', id, max: MAX, peers: others.map(w => w.deserializeAttachment()).filter(a => a.p).map(a => ({ peer: a.id, presence: a.p })) });
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, raw) {
    const a = ws.deserializeAttachment(); if (!a || !a.id) return;
    if (typeof raw !== 'string' || raw.length > 1500) return;
    // limit: max 40 wiadomości na sekundę od jednego gracza
    const now = Date.now(); const sec = Math.floor(now / 1000); if (a.win !== sec) { a.win = sec; a.n = 0; } if (++a.n > 40) { ws.serializeAttachment(a); return; }
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.t === 'p') { a.p = cleanPresence(m.d); ws.serializeAttachment(a); this.bcast({ t: 'p', peer: a.id, d: a.p }, ws); return; }
    if (m.t === 'e') {
      if (m.topic === 'chat') {
        if (now - a.chat < 1500) { this.send(ws, { t: 'err', code: 'slow' }); ws.serializeAttachment(a); return; }
        const t = censor(clean(m.d && m.d.t, 140)); if (!t) return; a.chat = now; ws.serializeAttachment(a);
        this.bcast({ t: 'e', peer: a.id, topic: 'chat', d: { t } }, ws); this.send(ws, { t: 'e', peer: a.id, topic: 'chat', d: { t }, me: 1 }); return;
      }
      if (m.topic === 'klakson') { if (now - a.chat < 400) return; a.chat = now - 1100; ws.serializeAttachment(a); this.bcast({ t: 'e', peer: a.id, topic: 'klakson', d: {} }, ws); return; }
    }
    ws.serializeAttachment(a);
  }
  async webSocketClose(ws) { const a = ws.deserializeAttachment(); if (a && a.id) { ws.serializeAttachment({}); this.bcast({ t: 'l', peer: a.id }, ws); } try { ws.close(1000); } catch (e) {} }
  async webSocketError(ws) { return this.webSocketClose(ws); }
}
