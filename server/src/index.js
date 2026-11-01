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
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (url.pathname === '/hit' && req.method === 'POST') {
      const body = await req.text(); if (body.length > 2000) return new Response('za duże', { status: 413, headers: cors });
      const r = await env.STATS.get(env.STATS.idFromName('main')).fetch('https://do/hit', { method: 'POST', body });
      return new Response(null, { status: r.status === 200 ? 204 : r.status, headers: cors });
    }
    if (url.pathname === '/stats') {
      const r = await env.STATS.get(env.STATS.idFromName('main')).fetch('https://do/stats');
      const j = await r.json(); let online = 0; const pokoje = {};
      for (let i = 1; i <= 3; i++) { const c = +(await (await env.ROOM.get(env.ROOM.idFromName('t' + i)).fetch('https://do/count')).text()); pokoje['t' + i] = c; online += c; }
      j.online = online; j.pokoje = pokoje;
      if (online > (j.peak || 0)) await env.STATS.get(env.STATS.idFromName('main')).fetch('https://do/peak', { method: 'POST', body: String(online) });
      return new Response(JSON.stringify(j), { headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=20' } });
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

// Statystyki gry: anonimowe liczniki (losowy identyfikator z przeglądarki, bez IP i danych osobowych)
const EVS = ['start', 'beat', 'mission', 'mini', 'mp'];
export class Stats extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); const q = this.ctx.storage.sql;
    q.exec(`CREATE TABLE IF NOT EXISTS daily(day TEXT, k TEXT, v INTEGER, PRIMARY KEY(day,k));
            CREATE TABLE IF NOT EXISTS seen(day TEXT, id TEXT, PRIMARY KEY(day,id));
            CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY, first TEXT, mob INTEGER);
            CREATE TABLE IF NOT EXISTS scores(g TEXT, nick TEXT, s INTEGER, t INTEGER);
            CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v INTEGER);`);
    this.rl = new Map(); this.cache = null;
  }
  add(day, k, v) { this.ctx.storage.sql.exec('INSERT INTO daily(day,k,v) VALUES(?,?,?) ON CONFLICT(day,k) DO UPDATE SET v=v+excluded.v', day, k, v); }
  async fetch(req) {
    const url = new URL(req.url); const q = this.ctx.storage.sql; const day = new Date(Date.now() + 3600e3).toISOString().slice(0, 10);
    if (url.pathname === '/peak') { const v = +(await req.text()) || 0; q.exec('INSERT INTO meta(k,v) VALUES(\'peak\',?) ON CONFLICT(k) DO UPDATE SET v=MAX(v,excluded.v)', v); this.cache = null; return new Response('ok'); }
    if (url.pathname === '/hit') {
      let m; try { m = JSON.parse(await req.text()); } catch (e) { return new Response('zły JSON', { status: 400 }); }
      const id = clean(m.id, 40).replace(/[^a-z0-9-]/gi, ''); if (id.length < 8 || !EVS.includes(m.ev)) return new Response('złe dane', { status: 400 });
      const now = Date.now(), r = this.rl.get(id) || { t: now, n: 0 }; if (now - r.t > 60000) { r.t = now; r.n = 0; } if (++r.n > 20) return new Response('limit', { status: 429 }); this.rl.set(id, r);
      if (this.rl.size > 5000) this.rl.clear();
      const d = m.d || {};
      if (m.ev === 'start') {
        this.add(day, 'starts', 1); this.add(day, d.mob ? 'mob' : 'desk', 1);
        const isNew = !q.exec('SELECT 1 FROM players WHERE id=?', id).toArray().length;
        if (isNew) { q.exec('INSERT INTO players(id,first,mob) VALUES(?,?,?)', id, day, d.mob ? 1 : 0); this.add(day, 'new', 1); }
      }
      if (m.ev === 'beat') this.add(day, 'min', Math.min(5, Math.max(1, +d.min || 1)));
      if (m.ev === 'mission') { this.add(day, 'missions', 1); if (d.main) this.add(day, 'main', 1); }
      if (m.ev === 'mp') this.add(day, 'mp', 1);
      if (m.ev === 'mini') {
        const g = ['paczkomat', 'flanki', 'karne'].includes(d.g) ? d.g + (d.m ? '-' + clean(d.m, 10).replace(/[^a-z]/g, '') : '') : null; if (!g) return new Response('zła gra', { status: 400 });
        this.add(day, 'mini', 1); this.add(day, 'mini:' + g, 1); if (d.w) this.add(day, 'miniwin', 1);
        const s = Math.max(0, Math.min(5000, Math.round(+d.s || 0))); const nick = censor(clean(d.n, 18)) || 'Anonim';
        if (s > 0 && d.w) { q.exec('INSERT INTO scores(g,nick,s,t) VALUES(?,?,?,?)', g, nick, s, now); q.exec('DELETE FROM scores WHERE g=? AND rowid NOT IN (SELECT rowid FROM scores WHERE g=? ORDER BY s DESC, t ASC LIMIT 25)', g, g); }
      }
      q.exec('INSERT OR IGNORE INTO seen(day,id) VALUES(?,?)', day, id);
      this.cache = null; return new Response('ok');
    }
    if (url.pathname === '/stats') {
      if (this.cache && Date.now() - this.cache.t < 15000) return new Response(this.cache.body);
      const tot = {}; for (const r of q.exec('SELECT k, SUM(v) AS v FROM daily GROUP BY k').toArray()) tot[r.k] = r.v;
      const days = []; const since = new Date(Date.now() + 3600e3 - 29 * 86400e3).toISOString().slice(0, 10);
      const byDay = {}; for (const r of q.exec('SELECT day,k,v FROM daily WHERE day>=?', since).toArray()) (byDay[r.day] = byDay[r.day] || {})[r.k] = r.v;
      const uniq = {}; for (const r of q.exec('SELECT day, COUNT(*) AS n FROM seen WHERE day>=? GROUP BY day', since).toArray()) uniq[r.day] = r.n;
      for (let i = 29; i >= 0; i--) { const dd = new Date(Date.now() + 3600e3 - i * 86400e3).toISOString().slice(0, 10); const b = byDay[dd] || {}; days.push({ d: dd, gracze: uniq[dd] || 0, starty: b.starts || 0, nowi: b.new || 0, min: b.min || 0 }); }
      const players = q.exec('SELECT COUNT(*) AS n, SUM(mob) AS m FROM players').toArray()[0];
      const top = {}; for (const r of q.exec('SELECT g,nick,s,t FROM scores ORDER BY s DESC, t ASC').toArray()) { (top[r.g] = top[r.g] || []); if (top[r.g].length < 10) top[r.g].push({ n: r.nick, s: r.s, t: r.t }); }
      const mini = {}; Object.keys(tot).filter(k => k.startsWith('mini:')).forEach(k => mini[k.slice(5)] = tot[k]);
      const peak = (q.exec('SELECT v FROM meta WHERE k=\'peak\'').toArray()[0] || {}).v || 0;
      const body = JSON.stringify({ gracze: players.n || 0, telefon: players.m || 0, starty: tot.starts || 0, minuty: tot.min || 0, misje: tot.missions || 0, fabula: tot.main || 0, minigry: tot.mini || 0, wygrane: tot.miniwin || 0, multi: tot.mp || 0, startyTel: tot.mob || 0, startyKomp: tot.desk || 0, peak, mini, top, dni: days, dzis: days[days.length - 1], t: Date.now() });
      this.cache = { t: Date.now(), body }; return new Response(body);
    }
    return new Response('?', { status: 404 });
  }
}
