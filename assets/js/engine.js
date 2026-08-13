/* ══════════════════════════════════════════════════════════════
   MOTOR · plantas, leitura de CSV, filtros e cálculo
   Criado por Gabriel Loiola
   ══════════════════════════════════════════════════════════════ */
window.Seat = (function () {
'use strict';
const VERSION = '4.0.0';
const DAY = 86400000;

/* ---- plantas ---- */
function lanes(spec) {
  const out = {};
  spec.forEach(([lane, pairs]) => pairs.forEach(([col, seat]) => {
    out[seat] = { seat, col, lane,
      gridRow: lane === 1 ? 1 : lane === 2 ? 2 : lane === 3 ? 4 : 5,
      position: lane === 1 || lane === 4 ? 'Janela' : 'Corredor',
      side: lane <= 2 ? 'Oposto ao motorista' : 'Motorista' };
  }));
  return out;
}
const seq = (from, list) => list.map((s, i) => [from + i, s]);

const DD = lanes([
  [1, [[1, 3], [2, 7], [3, 11], [5, 19], [6, 23], [7, 27], [8, 31], [9, 35], [10, 39], [11, 43]]],
  [2, [[1, 4], [2, 8], [3, 12], [5, 20], [6, 24], [7, 28], [8, 32], [9, 36], [10, 40], [11, 44]]],
  [3, seq(1, [2, 6, 10, 14, 16, 18, 22, 26, 30, 34, 38, 42, 46])],
  [4, seq(1, [1, 5, 9, 13, 15, 17, 21, 25, 29, 33, 37, 41, 45])]
]);
DD[19].note = 'Logo atrás da escada: sem poltrona à frente, costuma ter mais espaço para as pernas.';

const EXEC = lanes([
  [1, seq(1, [3, 7, 11, 15, 19, 23, 27, 31, 35, 39, 43])],
  [2, seq(1, [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44])],
  [3, seq(1, [2, 6, 10, 14, 18, 22, 26, 30, 34, 38, 42, 46])],
  [4, seq(1, [1, 5, 9, 13, 17, 21, 25, 29, 33, 37, 41, 45])]
]);

const CAMA = lanes([[1, [[2, 55], [3, 59]]], [3, [[1, 54], [2, 58], [3, 62]]], [4, [[1, 53], [2, 57], [3, 61]]]]);
Object.values(CAMA).forEach(m => { if (m.lane === 1) m.position = 'Janela'; });

const LAYOUTS = {
  dd: { id: 'dd', name: 'DD · piso superior (46)', badge: 'DD · PISO SUPERIOR', columns: 13, map: DD,
    stairCol: 4, rear: ['HO', 'HO'], band: 'HO · estrutura central', topSide: 'Lado oposto ao motorista',
    ctx: 'Piso superior de um DD. A escada ocupa duas posições depois das poltronas 11/12 — por isso o lado oposto ao motorista salta de 12 para 19.' },
  exec: { id: 'exec', name: 'Executivo · piso único (46)', badge: 'EXECUTIVO · PISO ÚNICO', columns: 12, map: EXEC,
    stairCol: 0, rear: ['HO', 'HO'], band: 'HO · estrutura central', topSide: 'Lado oposto ao motorista',
    ctx: 'Piso único com 46 poltronas e corredor contínuo, sem escada. Numeração regular da frente ao fundo.' },
  cama: { id: 'cama', name: 'Cama · leito 1+2 (8)', badge: 'CAMA · LEITO', columns: 12, map: CAMA,
    stairCol: 0, wcCol: 1, rear: [], band: 'HO · estrutura central', topSide: 'Lado oposto ao motorista · leito individual',
    ctx: 'Salão leito-cama com oito poltronas: duas individuais no lado oposto e seis em duplas do lado do motorista. Cada viagem pesa muito.' }
};

function detect(seatCount, classText) {
  const seats = Object.keys(seatCount || {}).map(Number);
  if (!seats.length) return { id: 'dd', why: 'Sem poltronas válidas; planta padrão DD.' };
  const cls = String(classText || '').toUpperCase();
  const high = seats.filter(s => s > 46);
  if (high.length && high.length === seats.length)
    return { id: 'cama', why: `Poltronas de ${Math.min(...seats)} a ${Math.max(...seats)} com classe “${cls || 'não informada'}” — leito-cama.` };
  if (/\bDD\b|DOUBLE|DECK/.test(cls))
    return { id: 'dd', why: `Classe “${cls}” indica veículo de dois andares; usamos o piso superior.` };
  if (/CAMA|LEITO CAMA/.test(cls) && seats.length <= 12)
    return { id: 'cama', why: `Classe “${cls}” com ${seats.length} poltronas — leito-cama.` };
  return { id: 'exec', why: `Classe “${cls || 'não informada'}” com poltronas de 1 a ${Math.max(...seats)} — piso único.` };
}

/* ---- utilidades ---- */
const norm = v => String(v == null ? '' : v).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[º°]/g, '').replace(/[_./\\-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
function findCol(h, exact, loose) {
  const n = h.map(norm);
  for (const c of exact) { const i = n.indexOf(norm(c)); if (i >= 0) return i; }
  for (const c of loose) { const k = norm(c); const i = n.findIndex(x => x.includes(k)); if (i >= 0) return i; }
  return -1;
}
function mapHeaders(h) {
  return {
    saleDate: findCol(h, ['Data Venda', 'Data da Venda', 'Data Compra'], ['data venda', 'data compra']),
    saleTime: findCol(h, ['Hora Venda', 'Hora da Venda', 'Hora Compra'], ['hora venda', 'hora compra']),
    ticket: findCol(h, ['N° Bilhete', 'Nº Bilhete', 'Bilhete', 'Ticket'], ['bilhete', 'ticket']),
    seat: findCol(h, ['Poltrona', 'Assento', 'Seat'], ['poltrona', 'assento']),
    revenue: findCol(h, ['Receita R$', 'Receita'], ['receita']),
    price: findCol(h, ['precototal', 'Preço Total', 'Valor Total'], ['preco total', 'precototal']),
    tripId: findCol(h, ['ID Viagem', 'codViagem'], ['id viagem', 'cod viagem', 'codigo viagem']),
    service: findCol(h, ['codServico', 'Código Serviço', 'Serviço'], ['codservico', 'codigo servico']),
    line: findCol(h, ['codLinha', 'Código Linha'], ['codlinha', 'codigo linha']),
    lineName: findCol(h, ['nomeLinha', 'Linha'], ['nomelinha']),
    tripDate: findCol(h, ['Data Viagem', 'Data Partida'], ['data viagem', 'data partida']),
    tripTime: findCol(h, ['Hora Viagem', 'Hora Partida'], ['hora viagem', 'hora partida']),
    origin: findCol(h, ['Origem'], ['origem']),
    destination: findCol(h, ['Destino'], ['destino']),
    status: findCol(h, ['Tipo Venda', 'Status', 'Situação'], ['tipo venda', 'situacao', 'status']),
    channel: findCol(h, ['canal'], ['canal']),
    agency: findCol(h, ['agencia', 'Agência'], ['agencia']),
    klass: findCol(h, ['classe'], ['classe'])
  };
}
const cell = (r, i) => i >= 0 && r[i] != null ? String(r[i]).trim() : '';

function parseDate(v) {
  const raw = String(v || '').trim(); if (!raw) return null;
  let m = raw.match(/^(\d{4})[-/]([01]?\d)[-/]([0-3]?\d)(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) m = raw.match(/^([0-3]?\d)[-/]([01]?\d)[-/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const iso = m[1].length === 4;
    const y = +(iso ? m[1] : m[3]), mo = +m[2], d = +(iso ? m[3] : m[1]);
    const hh = +(m[4] || 0), mi = +(m[5] || 0), ss = +(m[6] || 0);
    const dt = new Date(y, mo - 1, d, hh, mi, ss);
    if (dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d)
      return { y, mo, d, hh, mi, ss, hasTime: m[4] != null, ms: dt.getTime(), dow: dt.getDay(),
        iso: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
  }
  const n = Number(raw.replace(',', '.'));
  if (Number.isFinite(n) && n > 20000 && n < 90000) {
    const dt = new Date(new Date(1899, 11, 30).getTime() + n * DAY);
    return { y: dt.getFullYear(), mo: dt.getMonth() + 1, d: dt.getDate(), hh: dt.getHours(), mi: dt.getMinutes(),
      ss: dt.getSeconds(), hasTime: Math.abs(n - Math.trunc(n)) > 1e-9, ms: dt.getTime(), dow: dt.getDay(),
      iso: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}` };
  }
  return null;
}
function parseTime(v) {
  const raw = String(v || '').trim(); if (!raw) return null;
  const all = [...raw.matchAll(/(?:^|[ T])(\d{1,2}):(\d{2})(?::(\d{2}))?/g)];
  const m = all.length ? all[all.length - 1] : null; if (!m) return null;
  const hh = +m[1], mi = +m[2], ss = +(m[3] || 0);
  return hh < 24 && mi < 60 && ss < 60 ? { hh, mi, ss } : null;
}
function stamp(dv, tv, needTime) {
  const d = parseDate(dv); if (!d) return null;
  const t = parseTime(tv);
  if (!t && !d.hasTime && needTime) return null;
  const u = t || { hh: d.hh || 0, mi: d.mi || 0, ss: d.ss || 0 };
  return { ms: new Date(d.y, d.mo - 1, d.d, u.hh, u.mi, u.ss).getTime(), iso: d.iso, dow: d.dow,
    hh: u.hh, mi: u.mi, coarse: u.mi === 0 && u.ss === 0 };
}
function money(v) {
  let s = String(v == null ? '' : v).trim().replace(/\s/g, '').replace(/R\$/gi, ''); if (!s) return null;
  const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
  if (c >= 0 && d >= 0) s = c > d ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (c >= 0) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s); return Number.isFinite(n) ? n : null;
}
const key = v => norm(v).replace(/\|/g, ' ').slice(0, 160);
function hash(s) {
  let a = 0x811c9dc5, b = 0x9e3779b9;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a ^= c; a = Math.imul(a, 0x01000193); b ^= c + i; b = Math.imul(b, 0x85ebca6b); }
  return ((a >>> 0).toString(16) + (b >>> 0).toString(16));
}

/* ---- CSV ---- */
function delimiterOf(t) {
  let c = 0, s = 0, tb = 0, q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '"') { if (q && t[i + 1] === '"') i++; else q = !q; }
    else if (!q && (ch === '\n' || ch === '\r')) break;
    else if (!q && ch === ',') c++; else if (!q && ch === ';') s++; else if (!q && ch === '\t') tb++;
  }
  return tb > c && tb > s ? '\t' : s > c ? ';' : ',';
}
function reader(delim, onRow) {
  let row = [], f = '', st = 0, skip = false, first = true;
  const push = () => { let v = f; if (first) { v = v.replace(/^\uFEFF/, ''); first = false; } row.push(v); f = ''; };
  const end = () => { push(); if (row.some(v => String(v).trim() !== '')) onRow(row); row = []; };
  return {
    write(txt) {
      for (let i = 0; i < txt.length; i++) {
        const ch = txt[i];
        if (skip) { skip = false; if (ch === '\n') continue; }
        if (st === 1) { if (ch === '"') st = 2; else f += ch; }
        else if (st === 2) {
          if (ch === '"') { f += '"'; st = 1; }
          else if (ch === delim) { push(); st = 0; }
          else if (ch === '\r' || ch === '\n') { end(); skip = ch === '\r'; st = 0; }
          else if (!/\s/.test(ch)) { f += ch; st = 0; }
        }
        else if (ch === '"' && f === '') st = 1;
        else if (ch === delim) push();
        else if (ch === '\r' || ch === '\n') { end(); skip = ch === '\r'; }
        else f += ch;
      }
    },
    close() { if (f.length || row.length) end(); }
  };
}

function blankQuality() {
  return { rawRows: 0, valid: 0, dup: 0, badSeat: 0, codeSeat: 0, noTrip: 0, noSaleTime: 0,
    afterDeparture: 0, cancelled: 0, malformed: 0, coarse: 0, noRevenue: 0 };
}
const bump = (o, k) => { if (k) o[k] = (o[k] || 0) + 1; };

function accumulator(headers, sourceName) {
  const M = mapHeaders(headers);
  if (M.seat < 0) throw new Error('Não encontrei a coluna de poltrona.');
  if (M.saleDate < 0) throw new Error('Não encontrei a coluna de data da venda.');
  if (M.tripDate < 0 && M.tripId < 0) throw new Error('Preciso de “Data Viagem” ou de um ID de viagem.');
  const trips = new Map(), q = blankQuality(), seatCount = {},
    facets = { services: {}, channels: {}, classes: {}, routes: {}, lines: {} };

  function add(r) {
    q.rawRows++;
    if (!Array.isArray(r) || r.length < Math.min(headers.length, 3)) { q.malformed++; return; }
    const sRaw = cell(r, M.seat);
    if (/[A-Za-z]/.test(sRaw)) { q.codeSeat++; return; }
    if (!/^\s*\d{1,3}\s*$/.test(sRaw)) { q.badSeat++; return; }
    const seat = Number(sRaw);
    if (!Number.isInteger(seat) || seat < 1 || seat > 99) { q.badSeat++; return; }
    if (/(cancel|anul|estorn|devol|reembols)/.test(norm(cell(r, M.status)))) { q.cancelled++; return; }
    const sale = stamp(cell(r, M.saleDate), cell(r, M.saleTime), true);
    if (!sale) { q.noSaleTime++; return; }
    const tripId = cell(r, M.tripId);
    const tDate = parseDate(cell(r, M.tripDate));
    const trip = stamp(cell(r, M.tripDate), cell(r, M.tripTime), true);
    if (!trip && !tripId) { q.noTrip++; return; }
    if (trip && sale.ms > trip.ms) { q.afterDeparture++; return; }
    if (sale.coarse) q.coarse++;
    seatCount[seat] = (seatCount[seat] || 0) + 1;

    const svc = cell(r, M.service), lin = cell(r, M.line), kl = cell(r, M.klass);
    const org = cell(r, M.origin), dst = cell(r, M.destination), ch = cell(r, M.channel);
    const route = org && dst ? `${org} → ${dst}` : (cell(r, M.lineName) || '');
    bump(facets.services, svc); bump(facets.channels, ch); bump(facets.classes, kl);
    bump(facets.routes, route); bump(facets.lines, cell(r, M.lineName));

    const hhmm = trip ? `${String(trip.hh).padStart(2, '0')}:${String(trip.mi).padStart(2, '0')}` : '';
    const tk = tripId ? 'v:' + key(tripId)
      : [svc || 'sv', lin || 'ln', trip.iso, hhmm, org || 'o', dst || 'd'].map(key).join('|');
    const ticket = cell(r, M.ticket);
    const rev = money(cell(r, M.revenue)), pr = money(cell(r, M.price));
    if (rev == null && pr == null) q.noRevenue++;
    const id = ticket ? 't:' + key(ticket) : 'h:' + hash([tk, seat, sale.ms, rev, pr, ch].join('|'));

    let T = trips.get(tk);
    if (!T) {
      T = { k: tk, date: tDate ? tDate.iso : sale.iso, dow: tDate ? tDate.dow : sale.dow, fromTrip: !!tDate,
        dep: trip ? trip.ms : null, time: hhmm, svc, lin, org, dst, route, klass: kl, seats: new Map() };
      trips.set(tk, T);
    } else {
      if (trip && T.dep == null) { T.dep = trip.ms; T.time = hhmm; }
      if (tDate && !T.fromTrip) { T.date = tDate.iso; T.dow = tDate.dow; T.fromTrip = true; }
      if (!T.klass && kl) T.klass = kl;
      if (!T.route && route) T.route = route;
    }
    let S = T.seats.get(seat);
    if (!S) { S = { seat, ev: new Map() }; T.seats.set(seat, S); }
    if (S.ev.has(id)) { q.dup++; return; }
    S.ev.set(id, { i: id, m: sale.ms, r: rev, p: pr, c: ch, l: trip ? Math.max(0, (trip.ms - sale.ms) / DAY) : null });
    q.valid++;
  }

  function finish(extra) {
    const list = [...trips.values()].map(t => ({
      k: t.k, date: t.date, dow: t.dow, dep: t.dep, time: t.time, svc: t.svc, lin: t.lin,
      org: t.org, dst: t.dst, route: t.route, klass: t.klass,
      seats: [...t.seats.values()].map(s => ({ seat: s.seat, ev: [...s.ev.values()].sort((a, b) => a.m - b.m || a.i.localeCompare(b.i)) }))
        .sort((a, b) => a.seat - b.seat)
    })).sort((a, b) => String(a.date).localeCompare(String(b.date)) || a.k.localeCompare(b.k));
    const top = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
    return Object.assign({
      version: VERSION, sourceName: sourceName || 'arquivo.csv', importedAt: new Date().toISOString(),
      headers, trips: list, quality: q, seatCount, facets,
      topClass: top(facets.classes) ? top(facets.classes)[0] : '',
      topLine: top(facets.lines) ? top(facets.lines)[0] : ''
    }, extra || {});
  }
  return { add, finish };
}

async function parseFile(file, opts) {
  opts = opts || {};
  const head = await file.slice(0, Math.min(file.size, 65536)).arrayBuffer();
  let enc = 'utf-8', sample = '';
  try { sample = new TextDecoder('utf-8', { fatal: true }).decode(head); }
  catch (e) { enc = 'windows-1252'; sample = new TextDecoder('windows-1252').decode(head); }
  const delim = delimiterOf(sample), dec = new TextDecoder(enc);
  let headers = null, acc = null, n = 0, read = 0;
  const rd = reader(delim, row => {
    if (!headers) { headers = row.map(v => v.trim()); acc = accumulator(headers, file.name); return; }
    acc.add(row); n++;
    if (n % 4000 === 0 && opts.onProgress) opts.onProgress({ loaded: read, total: file.size, rows: n });
  });
  if (file.stream) {
    const r = file.stream().getReader();
    for (;;) {
      const { done, value } = await r.read(); if (done) break;
      read += value.byteLength;
      rd.write(dec.decode(value, { stream: true }));
      if (opts.onProgress) opts.onProgress({ loaded: read, total: file.size, rows: n });
      if (n % 20000 === 0) await new Promise(res => setTimeout(res, 0));
    }
    rd.write(dec.decode());
  } else rd.write(dec.decode(await file.arrayBuffer()));
  rd.close();
  if (!acc) throw new Error('Arquivo vazio ou sem cabeçalho.');
  return acc.finish({ encoding: enc, delimiter: delim === '\t' ? 'tab' : delim, size: file.size });
}
function parseText(text, name) {
  const delim = delimiterOf(text);
  let headers = null, acc = null;
  const rd = reader(delim, row => {
    if (!headers) { headers = row.map(v => v.trim()); acc = accumulator(headers, name); }
    else acc.add(row);
  });
  rd.write(String(text || '')); rd.close();
  if (!acc) throw new Error('CSV vazio.');
  return acc.finish({ encoding: 'texto', delimiter: delim, size: text.length });
}
function merge(list, name) {
  const map = new Map(), q = blankQuality(), seatCount = {},
    facets = { services: {}, channels: {}, classes: {}, routes: {}, lines: {} };
  list.forEach(ds => {
    Object.keys(q).forEach(k => q[k] += Number((ds.quality || {})[k] || 0));
    Object.entries(ds.seatCount || {}).forEach(([s, n]) => seatCount[s] = (seatCount[s] || 0) + n);
    Object.keys(facets).forEach(f => Object.entries((ds.facets || {})[f] || {}).forEach(([k, n]) => facets[f][k] = (facets[f][k] || 0) + n));
    (ds.trips || []).forEach(t => {
      let T = map.get(t.k);
      if (!T) { T = Object.assign({}, t, { seats: new Map() }); map.set(t.k, T); }
      t.seats.forEach(s => {
        let S = T.seats.get(s.seat); if (!S) { S = { seat: s.seat, ev: new Map() }; T.seats.set(s.seat, S); }
        s.ev.forEach(e => { if (!S.ev.has(e.i)) S.ev.set(e.i, e); });
      });
    });
  });
  const trips = [...map.values()].map(t => Object.assign({}, t, {
    seats: [...t.seats.values()].map(s => ({ seat: s.seat, ev: [...s.ev.values()].sort((a, b) => a.m - b.m || a.i.localeCompare(b.i)) })).sort((a, b) => a.seat - b.seat)
  })).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const top = o => Object.entries(o).sort((a, b) => b[1] - a[1])[0];
  return { version: VERSION, sourceName: name, importedAt: new Date().toISOString(), headers: [], trips,
    quality: q, seatCount, facets, topClass: top(facets.classes) ? top(facets.classes)[0] : '', topLine: top(facets.lines) ? top(facets.lines)[0] : '' };
}

/* ---- análise ---- */
const BUCKETS = [[0, 1, 'até 1 dia'], [1, 2, '1 a 2 dias'], [2, 3, '2 a 3 dias'], [3, 5, '3 a 5 dias'],
  [5, 7, '5 a 7 dias'], [7, 14, '1 a 2 semanas'], [14, 30, '2 a 4 semanas'], [30, 60, '1 a 2 meses'], [60, Infinity, 'mais de 2 meses']];
const bucketOf = d => { for (let i = 0; i < BUCKETS.length; i++) if (d < BUCKETS[i][1]) return i; return BUCKETS.length - 1; };
const LEADW = { all: null, w0: [0, 3], w1: [3, 7], w2: [7, 30], w3: [30, Infinity] };
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const round = (v, d) => v == null || !Number.isFinite(v) ? null : Math.round((v + Number.EPSILON) * 10 ** (d == null ? 4 : d)) / 10 ** (d == null ? 4 : d);

function analyze(ds, o) {
  o = o || {};
  const layoutId = o.layout || detect(ds.seatCount, ds.topClass).id;
  const L = LAYOUTS[layoutId];
  const win = LEADW[o.lead || 'all'];
  const minOcc = Number(o.minOcc) || 0;
  const A = {};
  Object.keys(L.map).forEach(s => {
    A[s] = { seat: +s, appear: 0, events: 0, first: 0, firstCredit: 0, last: 0, lastCredit: 0,
      ranks: [], pcts: [], leads: [], buckets: new Array(BUCKETS.length).fill(0),
      revSum: 0, revN: 0, tickets: 0, resale: 0, days: new Set(), channels: {} };
  });
  let totalEvents = 0, totalRev = 0, tiesFirst = 0, singles = 0, offLayout = 0, depMissing = 0, dropped = 0;
  const dayBuckets = new Array(BUCKETS.length).fill(0), dates = new Set(), revByDate = {};
  let tripsUsed = 0;

  (ds.trips || []).forEach(t => {
    if (o.start && t.date < o.start) return;
    if (o.end && t.date > o.end) return;
    if (o.service && t.svc !== o.service) return;
    if (o.klass && t.klass !== o.klass) return;
    if (o.route && t.route !== o.route) return;
    if (o.dow != null && o.dow !== '' && t.dow !== Number(o.dow)) return;

    const seats = [];
    (t.seats || []).forEach(s => {
      if (!L.map[s.seat]) { offLayout += s.ev.length; return; }
      let ev = s.ev;
      if (o.channel) ev = ev.filter(e => e.c === o.channel);
      if (win) ev = ev.filter(e => e.l != null && e.l >= win[0] && e.l < win[1]);
      if (!ev.length) return;
      seats.push({ seat: s.seat, ms: ev[0].m, lead: ev[0].l, ev });
    });
    if (!seats.length) return;
    if (minOcc && seats.length < minOcc) { dropped++; return; }
    seats.sort((a, b) => a.ms - b.ms || a.seat - b.seat);
    tripsUsed++;
    if (t.date) dates.add(t.date);
    if (t.dep == null) depMissing++;
    const n = seats.length;
    if (n === 1) singles++;
    const fMs = seats[0].ms, lMs = seats[n - 1].ms;
    const fSet = seats.filter(s => s.ms === fMs), lSet = seats.filter(s => s.ms === lMs);
    if (fSet.length > 1) tiesFirst++;
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && seats[j + 1].ms === seats[i].ms) j++;
      const mid = ((i + 1) + (j + 1)) / 2;
      for (let k = i; k <= j; k++) {
        const s = seats[k], a = A[s.seat];
        a.appear++; a.events += s.ev.length; a.ranks.push(mid);
        if (t.date) a.days.add(t.date);
        if (n > 1) a.pcts.push((mid - 1) / (n - 1));
        if (s.lead != null) { a.leads.push(s.lead); const b = bucketOf(s.lead); a.buckets[b]++; dayBuckets[b]++; }
        if (s.ev.length > 1) a.resale += s.ev.length - 1;
        s.ev.forEach(e => {
          totalEvents++;
          const val = e.r != null ? e.r : e.p;
          if (val != null) {
            a.revSum += val; a.revN++; totalRev += val;
            if (t.date) revByDate[t.date] = (revByDate[t.date] || 0) + val;
          }
          a.tickets++;
          if (e.c) a.channels[e.c] = (a.channels[e.c] || 0) + 1;
        });
      }
      i = j + 1;
    }
    fSet.forEach(s => { A[s.seat].first++; A[s.seat].firstCredit += 1 / fSet.length; });
    lSet.forEach(s => { A[s.seat].last++; A[s.seat].lastCredit += 1 / lSet.length; });
  });

  const tripCount = tripsUsed;
  const cfg = Number(o.minTrips);
  const minN = Number.isFinite(cfg) && cfg >= 1 ? Math.floor(cfg) : Math.min(30, Math.max(3, Math.ceil(tripCount * 0.25)));
  const ds2 = [...dates].sort();
  const pStart = ds2[0] || o.start || null, pEnd = ds2[ds2.length - 1] || o.end || null;
  const calendarDays = pStart && pEnd ? Math.round((new Date(pEnd + 'T12:00:00') - new Date(pStart + 'T12:00:00')) / DAY) + 1 : 0;

  const seats = Object.values(A).map(a => {
    const meta = L.map[a.seat];
    const pct = a.pcts.length ? a.pcts.reduce((x, y) => x + y, 0) / a.pcts.length : null;
    const cov = tripCount ? a.appear / tripCount : 0;
    const firstRate = tripCount ? a.firstCredit / tripCount : 0;
    const score = pct == null ? null : 0.50 * cov + 0.35 * (1 - pct) + 0.15 * Math.min(1, firstRate / 0.25);
    const conf = a.appear >= minN ? (cov >= 0.5 ? 'Alta' : 'Adequada') : (a.appear >= Math.max(3, minN * 0.5) ? 'Baixa' : 'Insuficiente');
    const top = Object.entries(a.channels).sort((x, y) => y[1] - x[1])[0];
    return { seat: a.seat, position: meta.position, side: meta.side, col: meta.col, lane: meta.lane,
      gridRow: meta.gridRow, note: meta.note || '',
      appear: a.appear, events: a.events, resale: a.resale, coverage: round(cov),
      first: a.first, firstCredit: round(a.firstCredit, 2), firstRate: round(firstRate),
      last: a.last, lastCredit: round(a.lastCredit, 2),
      avgRank: round(a.ranks.length ? a.ranks.reduce((x, y) => x + y, 0) / a.ranks.length : null, 2),
      avgPct: round(pct), medPct: round(median(a.pcts)),
      avgLead: round(a.leads.length ? a.leads.reduce((x, y) => x + y, 0) / a.leads.length : null, 2),
      medLead: round(median(a.leads), 2), leadN: a.leads.length,
      buckets: a.buckets, tickets: a.tickets,
      revenue: round(a.revSum, 2), avgRev: round(a.revN ? a.revSum / a.revN : null, 2), revN: a.revN,
      days: a.days.size, score: round(score), scorePct: round(score == null ? null : score * 100, 1),
      minN, conf, channel: top ? top[0] : null };
  }).sort((a, b) => a.seat - b.seat);

  const ok = seats.filter(s => s.appear >= minN && s.avgPct != null);
  const okLead = seats.filter(s => s.leadN >= minN && s.avgLead != null);
  const sold = seats.filter(s => s.appear > 0);
  const byFirst = [...ok].sort((a, b) => a.avgPct - b.avgPct || b.appear - a.appear || a.seat - b.seat);
  const byLead = [...okLead].sort((a, b) => b.avgLead - a.avgLead || b.medLead - a.medLead || b.appear - a.appear || a.seat - b.seat);
  const byVolume = [...sold].sort((a, b) => b.appear - a.appear || b.revenue - a.revenue || a.seat - b.seat);
  const byRevenue = [...sold].sort((a, b) => b.revenue - a.revenue || b.appear - a.appear || a.seat - b.seat);
  const byScore = [...ok].sort((a, b) => b.score - a.score || a.avgPct - b.avgPct || a.seat - b.seat);
  const champFirst = [...sold].sort((a, b) => b.first - a.first || b.firstCredit - a.firstCredit || a.seat - b.seat)[0] || null;
  const revSeries = Object.keys(revByDate).sort().map(d => ({ d, v: round(revByDate[d], 2) }));

  return {
    version: VERSION, generatedAt: new Date().toISOString(), sourceName: ds.sourceName,
    layout: layoutId, layoutName: L.name, layoutBadge: L.badge, layoutCtx: L.ctx,
    detected: detect(ds.seatCount, ds.topClass), filters: Object.assign({}, o),
    period: { start: pStart, end: pEnd, calendarDays, serviceDays: dates.size, tripCount, depMissing },
    summary: {
      events: totalEvents, seatTrips: sold.reduce((n, s) => n + s.appear, 0), revenue: round(totalRev, 2),
      soldSeats: sold.length, layoutSeats: Object.keys(L.map).length,
      perTrip: round(tripCount ? sold.reduce((n, s) => n + s.appear, 0) / tripCount : 0, 1),
      avgTicket: round(totalEvents ? totalRev / totalEvents : 0, 2),
      revPerTrip: round(tripCount ? totalRev / tripCount : 0, 2),
      occupancy: round(tripCount && Object.keys(L.map).length ? sold.reduce((n, s) => n + s.appear, 0) / (tripCount * Object.keys(L.map).length) : 0),
      tiesFirst, singles, offLayout, droppedTrips: dropped
    },
    seats, top10: byFirst.slice(0, 10), topLead10: byLead.slice(0, 10), topVolume10: byVolume.slice(0, 10),
    topRevenue10: byRevenue.slice(0, 10), byScore: byScore.slice(0, 10),
    champFirst, leadTop: byLead[0] || null, mostSold: byVolume[0] || null,
    dayBuckets, bucketLabels: BUCKETS.map(b => b[2]), revSeries, minN,
    quality: Object.assign({}, ds.quality || {}, { tiesFirst, singles, offLayout, tripsUsed })
  };
}

/* ---- simulação de reajuste ---- */
/* Dois modos de reajuste:
   'pct' — percentual sobre o preço médio pago (padrão)
   'abs' — valor fixo em reais somado a cada bilhete
   Em ambos, a receita bruta é calculada antes da retenção e só
   depois multiplicada por ela, para o ponto de equilíbrio sair certo. */
function simulate(an, opt) {
  const mode = opt.mode === 'abs' ? 'abs' : 'pct';
  const pct = Math.max(0, Number(opt.pct) || 0) / 100;
  const abs = Math.max(0, Number(opt.abs) || 0);
  const ret = Math.min(1, Math.max(0, Number(opt.ret) == null ? 1 : Number(opt.ret) / 100));
  const seats = (opt.seats || []).map(s => {
    const base = s.revenue || 0;
    const tickets = s.revN || s.tickets || 0;
    const cheio = mode === 'abs' ? base + abs * tickets : base * (1 + pct);
    const novo = cheio * ret;
    return { seat: s.seat, position: s.position, side: s.side, appear: s.appear, tickets,
      avgRev: s.avgRev, base: round(base, 2), cheio: round(cheio, 2), novo: round(novo, 2),
      delta: round(novo - base, 2),
      novoTicket: round(mode === 'abs' ? (s.avgRev || 0) + abs : (s.avgRev || 0) * (1 + pct), 2) };
  });
  const base = seats.reduce((n, s) => n + s.base, 0);
  const cheio = seats.reduce((n, s) => n + s.cheio, 0);
  const novo = seats.reduce((n, s) => n + s.novo, 0);
  const delta = novo - base;
  const total = an.summary.revenue || 0;
  const days = an.period.calendarDays || 1;
  const tickets = seats.reduce((n, s) => n + (s.tickets || 0), 0);
  /* quanto da venda dá para perder antes de empatar com a receita de hoje */
  const breakEven = cheio > base ? 1 - base / cheio : 0;
  /* percentual efetivo — no modo 'abs' depende do ticket médio da seleção */
  const pctEfetivo = base ? cheio / base - 1 : 0;
  const curve = [];
  if (mode === 'abs') {
    const step = abs > 0 ? abs / 2 : 2.5;
    for (let i = 0; i <= 8; i++) {
      const v = round(i * step, 2);
      curve.push({ p: v, abs: true, v: round((base + v * tickets) * ret - base, 2) });
    }
  } else {
    for (let p = 0; p <= 40; p += 5) curve.push({ p, v: round(base * ((1 + p / 100) * ret - 1), 2) });
  }
  return {
    mode, abs: round(abs, 2), pct: round(pct, 4), pctEfetivo: round(pctEfetivo, 4), ret: round(ret, 4), seats,
    base: round(base, 2), cheio: round(cheio, 2), novo: round(novo, 2), delta: round(delta, 2),
    deltaPct: round(base ? delta / base : 0), share: round(total ? base / total : 0),
    totalBase: round(total, 2), totalNovo: round(total - base + novo, 2),
    totalDeltaPct: round(total ? delta / total : 0),
    perTrip: round(an.period.tripCount ? delta / an.period.tripCount : 0, 2),
    perDay: round(days ? delta / days : 0, 2), perYear: round(days ? delta / days * 365 : 0, 2),
    breakEven: round(breakEven, 4), tickets, curve,
    perMonth: round(days ? delta / days * 30 : 0, 2), perHalf: round(days ? delta / days * 182 : 0, 2)
  };
}

return { VERSION, LAYOUTS, detect, parseFile, parseText, merge, analyze, simulate, BUCKETS, LEADW, DAY };
})();

/* ══════════════════════════════════════════════════════════════
   EXPORTADORES · XLSX e PDF vetorial, sem dependências
   ══════════════════════════════════════════════════════════════ */
window.SeatOut = (function () {
'use strict';

/* ---------- utilitários binários ---------- */
function utf8(t) { return new TextEncoder().encode(t); }
let CRC;
function crcTable() {
  if (CRC) return CRC;
  CRC = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; }
  return CRC;
}
function crc32(b) { const t = crcTable(); let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function le(v, n) { const b = new Uint8Array(n); let x = v >>> 0; for (let i = 0; i < n; i++) { b[i] = x & 255; x = Math.floor(x / 256); } return b; }
function cat(parts) { const t = parts.reduce((n, p) => n + p.length, 0), o = new Uint8Array(t); let x = 0; parts.forEach(p => { o.set(p, x); x += p.length; }); return o; }
function zip(files) {
  const loc = [], cen = []; let off = 0;
  const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  files.forEach(f => {
    const name = utf8(f.name), data = f.data instanceof Uint8Array ? f.data : utf8(f.data), c = crc32(data);
    const h = cat([le(0x04034B50, 4), le(20, 2), le(0x800, 2), le(0, 2), le(time, 2), le(date, 2), le(c, 4),
      le(data.length, 4), le(data.length, 4), le(name.length, 2), le(0, 2), name]);
    loc.push(h, data);
    cen.push(cat([le(0x02014B50, 4), le(20, 2), le(20, 2), le(0x800, 2), le(0, 2), le(time, 2), le(date, 2), le(c, 4),
      le(data.length, 4), le(data.length, 4), le(name.length, 2), le(0, 2), le(0, 2), le(0, 2), le(0, 2), le(0, 4), le(off, 4), name]));
    off += h.length + data.length;
  });
  const central = cat(cen);
  return cat(loc.concat([central, cat([le(0x06054B50, 4), le(0, 2), le(0, 2), le(files.length, 2), le(files.length, 2),
    le(central.length, 4), le(off, 4), le(0, 2)])]));
}
function download(bytes, name, mime) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.style.display = 'none';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
const xe = v => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/* ---------- XLSX ---------- */
const COL = i => { let s = '', n = i; while (n > 0) { n--; s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26); } return s; };
// estilos: 0 normal · 1 título · 2 subtítulo · 3 cabeçalho · 4 rótulo · 5 inteiro · 6 moeda · 7 percentual · 8 decimal · 9 destaque
function styles() {
  const fonts = [
    '<font><sz val="10"/><color rgb="FF1A1A18"/><name val="Aptos"/></font>',
    '<font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font>',
    '<font><sz val="10"/><color rgb="FF6F6F6B"/><name val="Aptos"/></font>',
    '<font><b/><sz val="9"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>',
    '<font><b/><sz val="10"/><color rgb="FF15484A"/><name val="Aptos"/></font>'
  ];
  const fills = [
    '<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF0F2E2F"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF54A2A5"/><bgColor indexed="64"/></patternFill></fill>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FFEAF3F3"/><bgColor indexed="64"/></patternFill></fill>'
  ];
  const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>',
    '<border><left style="thin"><color rgb="FFDDE3E3"/></left><right style="thin"><color rgb="FFDDE3E3"/></right><top style="thin"><color rgb="FFDDE3E3"/></top><bottom style="thin"><color rgb="FFDDE3E3"/></bottom><diagonal/></border>'];
  const xf = (nf, f, fl, b, al) => `<xf numFmtId="${nf}" fontId="${f}" fillId="${fl}" borderId="${b}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1"><alignment ${al}/></xf>`;
  const xfs = [
    xf(0, 0, 0, 0, 'vertical="center"'),
    xf(0, 1, 2, 0, 'horizontal="left" vertical="center"'),
    xf(0, 2, 0, 0, 'horizontal="left" vertical="center" wrapText="1"'),
    xf(0, 3, 3, 1, 'horizontal="center" vertical="center" wrapText="1"'),
    xf(0, 4, 4, 1, 'horizontal="left" vertical="center"'),
    xf(3, 0, 0, 1, 'horizontal="right" vertical="center"'),
    xf(164, 0, 0, 1, 'horizontal="right" vertical="center"'),
    xf(165, 0, 0, 1, 'horizontal="right" vertical="center"'),
    xf(166, 0, 0, 1, 'horizontal="right" vertical="center"'),
    xf(0, 4, 4, 1, 'horizontal="left" vertical="center" wrapText="1"')
  ];
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="3"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0.00"/><numFmt numFmtId="165" formatCode="0.0%"/><numFmt numFmtId="166" formatCode="#,##0.00"/></numFmts>' +
    `<fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills>` +
    `<borders count="${borders.length}">${borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    '<dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2"/></styleSheet>';
}
const C = (v, s, t) => ({ v, s: s || 0, t });
function cellXml(ref, c) {
  if (c == null) return '';
  if (typeof c !== 'object') c = C(c, 0);
  const s = c.s || 0;
  if (c.v == null || c.v === '') return `<c r="${ref}" s="${s}"/>`;
  if (c.t === 'n' || typeof c.v === 'number') {
    const n = Number(c.v); return Number.isFinite(n) ? `<c r="${ref}" s="${s}"><v>${n}</v></c>` : `<c r="${ref}" s="${s}"/>`;
  }
  return `<c r="${ref}" t="inlineStr" s="${s}"><is><t xml:space="preserve">${xe(c.v)}</t></is></c>`;
}
function sheet(cfg) {
  const rows = cfg.rows || [];
  let maxc = 1;
  const body = rows.map((r, i) => {
    const cells = r.cells || r; maxc = Math.max(maxc, cells.length);
    return `<row r="${i + 1}"${r.h ? ` ht="${r.h}" customHeight="1"` : ''}>` +
      cells.map((c, j) => cellXml(COL(j + 1) + (i + 1), c)).join('') + '</row>';
  }).join('');
  const cols = (cfg.cols || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('');
  const merges = (cfg.merges || []);
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${COL(maxc)}${Math.max(rows.length, 1)}"/>` +
    `<sheetViews><sheetView showGridLines="0" workbookViewId="0">${cfg.freeze ? `<pane ySplit="${cfg.freeze}" topLeftCell="A${cfg.freeze + 1}" activePane="bottomLeft" state="frozen"/>` : ''}</sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="16"/>${cols ? `<cols>${cols}</cols>` : ''}<sheetData>${body}</sheetData>` +
    (cfg.filter ? `<autoFilter ref="${cfg.filter}"/>` : '') +
    (merges.length ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '') +
    '<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>' +
    '<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/></worksheet>';
}
function book(sheets, meta) {
  const now = new Date().toISOString();
  const ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';
  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>';
  const wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    sheets.map((s, i) => `<sheet name="${xe(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets></workbook>';
  const wbr = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const core = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    `<dc:title>${xe(meta.title || 'Estudo de Poltronas')}</dc:title><dc:creator>Gabriel Loiola</dc:creator><cp:lastModifiedBy>Gabriel Loiola</cp:lastModifiedBy>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
  const files = [{ name: '[Content_Types].xml', data: ct }, { name: '_rels/.rels', data: rels },
    { name: 'docProps/core.xml', data: core }, { name: 'xl/workbook.xml', data: wb },
    { name: 'xl/_rels/workbook.xml.rels', data: wbr }, { name: 'xl/styles.xml', data: styles() }];
  sheets.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheet(s) }));
  return zip(files);
}

const fmtDate = iso => { if (!iso) return '—'; const p = String(iso).split('-'); return `${p[2]}/${p[1]}/${p[0]}`; };

function xlsx(an, opts) {
  opts = opts || {};
  const L = window.Seat.LAYOUTS[an.layout];
  const f = an.filters || {};
  const filtroTxt = [f.service && 'serviço ' + f.service, f.channel && 'canal ' + f.channel, f.klass && 'classe ' + f.klass,
    f.route, f.dow !== '' && f.dow != null ? 'dia da semana ' + f.dow : '', f.minOcc ? 'ocupação ≥ ' + f.minOcc : '',
    f.lead && f.lead !== 'all' ? 'janela ' + f.lead : ''].filter(Boolean).join(' · ') || 'sem filtros extras';

  const resumo = { name: 'Resumo', cols: [26, 20, 18, 18, 18, 18, 20, 20], freeze: 3, merges: ['A1:H1', 'A2:H2', 'A8:H8', 'A9:H9'], rows: [
    { h: 30, cells: [C(opts.title || 'Estudo de Poltronas', 1)] },
    { h: 22, cells: [C(`${an.sourceName} · ${L.name} · ${fmtDate(an.period.start)} a ${fmtDate(an.period.end)} · ${filtroTxt}`, 2)] },
    [],
    { h: 20, cells: [C('Dias corridos', 4), C(an.period.calendarDays, 5, 'n'), C('Viagens', 4), C(an.period.tripCount, 5, 'n'), C('Eventos válidos', 4), C(an.summary.events, 5, 'n'), C('Receita', 4), C(an.summary.revenue, 6, 'n')] },
    { h: 20, cells: [C('Dias com viagem', 4), C(an.period.serviceDays, 5, 'n'), C('Ocupação média', 4), C(an.summary.occupancy, 7, 'n'), C('Ticket médio', 4), C(an.summary.avgTicket, 6, 'n'), C('Receita por viagem', 4), C(an.summary.revPerTrip, 6, 'n')] },
    { h: 20, cells: [C('Poltronas com venda', 4), C(an.summary.soldSeats, 5, 'n'), C('Amostra mínima', 4), C(an.minN, 5, 'n'), C('Empates na 1ª', 4), C(an.summary.tiesFirst, 5, 'n'), C('Planta', 4), C(L.badge, 0)] },
    [],
    { h: 32, cells: [C(an.champFirst ? `Nesse período de ${an.period.calendarDays} dias, com ${an.period.tripCount} viagens, a poltrona ${an.champFirst.seat} foi comprada primeiro ${an.champFirst.first} vezes.` : 'Sem amostra suficiente.', 9)] },
    { h: 32, cells: [C(an.leadTop ? `Maior antecedência: poltrona ${an.leadTop.seat}, ${an.leadTop.avgLead} dias em média (mediana ${an.leadTop.medLead}; n=${an.leadTop.leadN}).` : '', 9)] },
    [],
    { h: 20, cells: [C('TOP 10 · MAIOR ANTECEDÊNCIA', 4)] },
    { h: 22, cells: ['Pos', 'Poltrona', 'Média (dias)', 'Mediana', 'Obs.', 'Viagens', 'Receita', 'Posição'].map(t => C(t, 3)) }
  ] };
  an.topLead10.forEach((s, i) => resumo.rows.push([C(i + 1, 5, 'n'), C(s.seat, 5, 'n'), C(s.avgLead, 8, 'n'), C(s.medLead, 8, 'n'),
    C(s.leadN, 5, 'n'), C(s.appear, 5, 'n'), C(s.revenue, 6, 'n'), C(`${s.position} · ${s.side}`, 0)]));
  resumo.rows.push([], { h: 20, cells: [C('TOP 10 · VENDEM PRIMEIRO', 4)] },
    { h: 22, cells: ['Pos', 'Poltrona', 'Percentil médio', 'Rank médio', '1ª/empate', 'Viagens', 'Receita', 'Posição'].map(t => C(t, 3)) });
  an.top10.forEach((s, i) => resumo.rows.push([C(i + 1, 5, 'n'), C(s.seat, 5, 'n'), C(s.avgPct, 7, 'n'), C(s.avgRank, 8, 'n'),
    C(s.first, 5, 'n'), C(s.appear, 5, 'n'), C(s.revenue, 6, 'n'), C(`${s.position} · ${s.side}`, 0)]));

  const head = ['Poltrona', 'Posição', 'Lado', 'Fileira', 'Viagens', 'Cobertura', 'Antec. média', 'Antec. mediana',
    'Obs. antec.', 'Rank médio', 'Percentil', '1ª escolha', 'Crédito 1ª', 'Última', 'Bilhetes', 'Receita',
    'Ticket médio', 'Índice', 'Confiança', 'Canal', 'Observação'];
  const poltronas = { name: 'Poltronas', freeze: 1, filter: `A1:${COL(head.length)}${1 + an.seats.filter(s => s.appear).length}`,
    cols: [10, 12, 20, 9, 10, 11, 13, 15, 12, 12, 11, 11, 11, 10, 10, 14, 13, 9, 12, 16, 40],
    rows: [{ h: 26, cells: head.map(t => C(t, 3)) }] };
  an.seats.filter(s => s.appear).sort((a, b) => (a.avgPct == null) - (b.avgPct == null) || (a.avgPct || 0) - (b.avgPct || 0))
    .forEach(s => poltronas.rows.push([C(s.seat, 5, 'n'), C(s.position, 0), C(s.side, 0), C(s.col, 5, 'n'), C(s.appear, 5, 'n'),
      C(s.coverage, 7, 'n'), C(s.avgLead, 8, 'n'), C(s.medLead, 8, 'n'), C(s.leadN, 5, 'n'), C(s.avgRank, 8, 'n'),
      C(s.avgPct, 7, 'n'), C(s.first, 5, 'n'), C(s.firstCredit, 8, 'n'), C(s.last, 5, 'n'), C(s.revN, 5, 'n'),
      C(s.revenue, 6, 'n'), C(s.avgRev, 6, 'n'), C(s.scorePct, 8, 'n'), C(s.conf, 0), C(s.channel || '', 0), C(s.note || '', 0)]));

  const ritmo = { name: 'Ritmo de compra', cols: [24, 14, 14, 16, 16], freeze: 1, rows: [
    { h: 26, cells: ['Faixa de antecedência', 'Compras', '% do total', 'Top 5 (compras)', '% do top 5'].map(t => C(t, 3)) }] };
  const tot = an.dayBuckets.reduce((a, b) => a + b, 0) || 1;
  const t5 = (opts.topSeats || an.topLead10.slice(0, 5));
  const t5b = new Array(an.dayBuckets.length).fill(0);
  t5.forEach(s => (s.buckets || []).forEach((v, i) => t5b[i] += v));
  const t5t = t5b.reduce((a, b) => a + b, 0) || 1;
  an.bucketLabels.forEach((lb, i) => ritmo.rows.push([C(lb, 0), C(an.dayBuckets[i], 5, 'n'), C(an.dayBuckets[i] / tot, 7, 'n'),
    C(t5b[i], 5, 'n'), C(t5b[i] / t5t, 7, 'n')]));

  const metodo = { name: 'Metodologia', cols: [30, 90], rows: [
    { h: 30, cells: [C('Metodologia', 1)] }, [],
    ...[['Viagem', 'Agrupamento por ID de viagem quando existe; senão serviço + linha + data + hora de partida + origem + destino.'],
      ['Primeira compra', 'A poltrona conta uma vez por viagem, pela primeira compra observada. Revendas ficam como evidência.'],
      ['Rank médio', 'Média da posição ordinal de compra nas viagens em que a poltrona apareceu. Menor = vende antes.'],
      ['Percentil', '(rank médio − 1) ÷ (poltronas vendidas na viagem − 1). Normaliza viagens cheias e vazias.'],
      ['Antecedência', '(partida − primeira compra) ÷ 86.400.000 ms. Média e mediana são reportadas juntas.'],
      ['Empates', 'Horários iguais recebem rank médio; o crédito de primeira escolha é rateado igualmente.'],
      ['Mapa de calor', 'Intensidade = valor da poltrona ÷ maior valor do recorte. Mais vendas = cor mais intensa.'],
      ['Índice', '0,50·cobertura + 0,35·(1 − percentil) + 0,15·min(1; taxa de 1ª ÷ 0,25).'],
      ['Amostra mínima', `Poltrona só entra nos rankings com pelo menos ${an.minN} viagens no recorte.`],
      ['Simulação', 'Receita simulada = receita observada × (1 + aumento) × retenção de demanda. Perda tolerável = 1 − 1/(1+aumento).'],
      ['Limite', 'Estudo observacional: descreve associação, não prova causalidade. Teste controlado antes de reajustar preço.']
    ].map(r => ({ h: 30, cells: [C(r[0], 4), C(r[1], 2)] })),
    [], { h: 20, cells: [C('Criado por Gabriel Loiola', 4), C('Gerado em ' + new Date().toLocaleString('pt-BR'), 2)] }
  ] };

  const sheets = [resumo, poltronas, ritmo];
  if (opts.sim) {
    const s = opts.sim;
    const sim = { name: 'Simulacao', cols: [26, 16, 16, 14, 16, 16, 16], rows: [
      { h: 30, cells: [C('Simulação de reajuste', 1)] },
      { h: 20, cells: [C(`Aumento de ${(s.pct * 100).toFixed(0)}% · retenção de demanda ${(s.ret * 100).toFixed(0)}% · ${s.seats.length} poltronas`, 2)] }, [],
      { h: 20, cells: [C('Receita atual (seleção)', 4), C(s.base, 6, 'n'), C('Receita simulada', 4), C(s.novo, 6, 'n'), C('Ganho', 4), C(s.delta, 6, 'n'), C(s.deltaPct, 7, 'n')] },
      { h: 20, cells: [C('Receita total do recorte', 4), C(s.totalBase, 6, 'n'), C('Total simulado', 4), C(s.totalNovo, 6, 'n'), C('Impacto no total', 4), C(s.totalDeltaPct, 7, 'n'), C('', 0)] },
      { h: 20, cells: [C('Ganho por viagem', 4), C(s.perTrip, 6, 'n'), C('Ganho por dia', 4), C(s.perDay, 6, 'n'), C('Projeção 12 meses', 4), C(s.perYear, 6, 'n'), C('', 0)] },
      { h: 20, cells: [C('Perda de vendas tolerável', 4), C(s.breakEven, 7, 'n'), C('Participação na receita', 4), C(s.share, 7, 'n'), C('Bilhetes na seleção', 4), C(s.tickets, 5, 'n'), C('', 0)] }, [],
      { h: 22, cells: ['Poltrona', 'Viagens', 'Bilhetes', 'Ticket médio', 'Receita atual', 'Receita simulada', 'Ganho'].map(t => C(t, 3)) }] };
    s.seats.forEach(x => sim.rows.push([C(x.seat, 5, 'n'), C(x.appear, 5, 'n'), C(x.tickets, 5, 'n'), C(x.avgRev, 6, 'n'),
      C(x.base, 6, 'n'), C(x.novo, 6, 'n'), C(x.delta, 6, 'n')]));
    sheets.push(sim);
  }
  sheets.push(metodo);
  download(book(sheets, { title: opts.title }), opts.filename || 'estudo-poltronas.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

function xlsxHistory(items) {
  const head = ['Nome', 'Salvo em', 'Fonte', 'Planta', 'Início', 'Fim', 'Dias', 'Viagens', 'Ocupação', 'Receita',
    'Ticket médio', 'Líder antecedência', 'Dias antec.', 'Líder ordem', 'Percentil', 'Mais vendida', 'Viagens líder'];
  const sh = { name: 'Historico', freeze: 1, filter: `A1:${COL(head.length)}${items.length + 1}`,
    cols: [30, 18, 24, 16, 12, 12, 8, 10, 11, 15, 13, 16, 12, 14, 11, 14, 13],
    rows: [{ h: 26, cells: head.map(t => C(t, 3)) }] };
  items.forEach(it => {
    const s = it.snap;
    sh.rows.push([C(it.name, 0), C(new Date(it.savedAt).toLocaleString('pt-BR'), 0), C(s.sourceName, 0),
      C(s.layoutBadge, 0), C(fmtDate(s.period.start), 0), C(fmtDate(s.period.end), 0), C(s.period.calendarDays, 5, 'n'),
      C(s.period.tripCount, 5, 'n'), C(s.summary.occupancy, 7, 'n'), C(s.summary.revenue, 6, 'n'), C(s.summary.avgTicket, 6, 'n'),
      C(s.leadTop ? s.leadTop.seat : '', 5, s.leadTop ? 'n' : ''), C(s.leadTop ? s.leadTop.avgLead : '', 8, s.leadTop ? 'n' : ''),
      C(s.top10[0] ? s.top10[0].seat : '', 5, s.top10[0] ? 'n' : ''), C(s.top10[0] ? s.top10[0].avgPct : '', 7, s.top10[0] ? 'n' : ''),
      C(s.mostSold ? s.mostSold.seat : '', 5, s.mostSold ? 'n' : ''), C(s.mostSold ? s.mostSold.appear : '', 5, s.mostSold ? 'n' : '')]);
  });
  download(book([sh], { title: 'Histórico de estudos' }), 'historico-estudos-poltronas.xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

/* ---------- PDF vetorial ---------- */
const W1252 = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
  0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
  0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F };
function ansi(t) {
  const s = String(t == null ? '' : t).replace(/\r\n?/g, '\n'), out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c <= 0xFF && !(c >= 0x80 && c <= 0x9F)) out.push(c);
    else if (W1252[c] !== undefined) out.push(W1252[c]);
    else out.push(0x3F);
  }
  return out;
}
const hexTxt = t => '<' + ansi(t).map(b => b.toString(16).padStart(2, '0')).join('') + '>';
function tw(t, size, bold) {
  let u = 0;
  ansi(t).forEach(b => { const c = String.fromCharCode(b);
    if (/[ilIj.,:;|'!\[\]()]/.test(c)) u += .3; else if (/[MW@%]/.test(c)) u += .85; else if (/\s/.test(c)) u += .29;
    else u += bold ? .58 : .53; });
  return u * size;
}
function wrap(t, w, size, bold) {
  const out = [];
  String(t).split('\n').forEach(par => {
    const words = par.trim().split(/\s+/).filter(Boolean);
    if (!words.length) { out.push(''); return; }
    let cur = '';
    words.forEach(word => {
      const cand = cur ? cur + ' ' + word : word;
      if (cur && tw(cand, size, bold) > w) { out.push(cur); cur = word; } else cur = cand;
    });
    if (cur) out.push(cur);
  });
  return out;
}
function clip(t, w, size, bold) {
  let s = String(t == null ? '' : t);
  if (tw(s, size, bold) <= w) return s;
  while (s.length > 1 && tw(s + '…', size, bold) > w) s = s.slice(0, -1);
  return s + '…';
}
function Page(w, h) { this.w = w; this.h = h; this.q = []; }
Page.prototype.col = function (hex, stroke) {
  let x = String(hex || '000000').replace('#', '');
  if (x.length === 3) x = x.split('').map(c => c + c).join('');
  const r = parseInt(x.slice(0, 2), 16) / 255, g = parseInt(x.slice(2, 4), 16) / 255, b = parseInt(x.slice(4, 6), 16) / 255;
  this.q.push([r, g, b].map(v => v.toFixed(3)).join(' ') + (stroke ? ' RG' : ' rg'));
};
Page.prototype.rect = function (x, top, w, h, fill, stroke, lw) {
  this.q.push('q');
  if (fill) this.col(fill, false);
  if (stroke) { this.col(stroke, true); this.q.push((lw || .6) + ' w'); }
  this.q.push([x, this.h - top - h, w, h].map(v => (+v).toFixed(2)).join(' ') + ' re ' + (fill && stroke ? 'B' : fill ? 'f' : 'S'));
  this.q.push('Q');
};
Page.prototype.line = function (x1, y1, x2, y2, c, lw) {
  this.q.push('q'); this.col(c || '999999', true); this.q.push((lw || .6) + ' w');
  this.q.push(`${(+x1).toFixed(2)} ${(this.h - y1).toFixed(2)} m ${(+x2).toFixed(2)} ${(this.h - y2).toFixed(2)} l S`); this.q.push('Q');
};
Page.prototype.text = function (x, top, t, size, o) {
  o = o || {};
  const bold = !!o.bold, s = String(t == null ? '' : t), width = tw(s, size, bold);
  let X = x;
  if (o.align === 'center') X = x - width / 2; else if (o.align === 'right') X = x - width;
  this.q.push('q'); this.col(o.color || '1A1A18', false);
  this.q.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${X.toFixed(2)} ${(this.h - top - size).toFixed(2)} Tm ${hexTxt(s)} Tj ET`);
  this.q.push('Q');
};
Page.prototype.para = function (x, top, t, w, size, lh, o) {
  o = o || {};
  let lines = wrap(t, w, size, !!o.bold);
  if (o.max && lines.length > o.max) { lines = lines.slice(0, o.max); lines[o.max - 1] = clip(lines[o.max - 1] + '…', w, size, !!o.bold); }
  lines.forEach((l, i) => this.text(x, top + i * lh, l, size, o));
  return top + lines.length * lh;
};
Page.prototype.out = function () { return this.q.join('\n') + '\n'; };

function pdfBytes(pages, title) {
  const objs = [null, null];
  const add = c => { objs.push(c); return objs.length; };
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const info = add(`<< /Title ${hexTxt(title)} /Author ${hexTxt('Gabriel Loiola')} /Producer ${hexTxt('Estudo de Poltronas')} >>`);
  const ids = [];
  pages.forEach(p => {
    const c = p.out();
    const sid = add(`<< /Length ${utf8(c).length} >>\nstream\n${c}endstream`);
    ids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.w} ${p.h}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${sid} 0 R >>`));
  });
  objs[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[1] = `<< /Type /Pages /Kids [${ids.map(i => i + ' 0 R').join(' ')}] /Count ${ids.length} >>`;
  const parts = [utf8('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
  const offs = [0]; let off = parts[0].length;
  objs.forEach((o, i) => { offs[i + 1] = off; const b = utf8(`${i + 1} 0 obj\n${o}\nendobj\n`); parts.push(b); off += b.length; });
  let x = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) x += String(offs[i]).padStart(10, '0') + ' 00000 n \n';
  x += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${off}\n%%EOF\n`;
  parts.push(utf8(x));
  return cat(parts);
}

const INK = '1A1A18', MUT = '6F6F6B', ACC = '54A2A5', DEEP = '0F2E2F', LINE = 'DDE3E3', SOFT = 'F5F8F8', WARN = 'B07C15';
const THEME = { acc: ACC, deep: DEEP };
const money0 = n => 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctS = (n, d) => (n == null ? '—' : (Number(n) * 100).toFixed(d == null ? 1 : d).replace('.', ',') + '%');
const dec = (n, d) => n == null ? '—' : Number(n).toFixed(d == null ? 1 : d).replace('.', ',');

function pdfHead(p, title, kicker, page, total, right) {
  p.rect(0, 0, p.w, 58, DEEP);
  p.text(34, 14, kicker, 7.5, { bold: true, color: '8FD3D2' });
  p.text(34, 27, title, 17, { bold: true, color: 'FFFFFF' });
  p.text(p.w - 34, 24, right || 'Estudo de Poltronas', 8.5, { color: '8FD3D2', align: 'right', bold: true });
  p.line(34, p.h - 26, p.w - 34, p.h - 26, LINE, .6);
  p.text(34, p.h - 21, 'Criado por Gabriel Loiola · gerado em ' + new Date().toLocaleString('pt-BR'), 7, { color: MUT });
  p.text(p.w - 34, p.h - 21, `Página ${page} de ${total}`, 7, { color: MUT, align: 'right' });
}
function card(p, x, top, w, h, label, value, note, accent) {
  p.rect(x, top, w, h, SOFT, LINE, .6);
  p.rect(x, top, 3, h, accent || THEME.acc);
  p.text(x + 13, top + 11, String(label).toUpperCase(), 6.8, { bold: true, color: MUT });
  let size = 15;
  while (size > 8 && tw(value, size, true) > w - 26) size -= .5;
  p.text(x + 13, top + 26, value, size, { bold: true, color: DEEP });
  if (note) p.text(x + 13, top + h - 17, clip(note, w - 26, 7, false), 7, { color: MUT });
}
function lum(hx) { let x = String(hx).replace('#',''); if (x.length === 3) x = x.split('').map(c => c + c).join('');
  const r = parseInt(x.slice(0,2),16), g = parseInt(x.slice(2,4),16), b = parseInt(x.slice(4,6),16);
  return (0.2126*r + 0.7152*g + 0.0722*b) / 255; }
function table(p, x, top, cols, rows, rh, hi) {
  let cx = x;
  cols.forEach(c => {
    p.rect(cx, top, c.w, 20, DEEP);
    p.text(c.a === 'right' ? cx + c.w - 5 : c.a === 'center' ? cx + c.w / 2 : cx + 5, top + 6.5,
      clip(c.t, c.w - 9, 6.8, true), 6.8, { bold: true, color: 'FFFFFF', align: c.a || 'left' });
    cx += c.w;
  });
  rows.forEach((r, i) => {
    const y = top + 20 + i * rh, fill = hi && i < hi ? 'EAF3F3' : (i % 2 ? 'FAFCFC' : 'FFFFFF');
    cx = x;
    cols.forEach((c, j) => {
      p.rect(cx, y, c.w, rh, fill, LINE, .4);
      const v = r[j] == null ? '' : String(r[j]);
      p.text(c.a === 'right' ? cx + c.w - 5 : c.a === 'center' ? cx + c.w / 2 : cx + 5, y + (rh - 7.4) / 2 - .5,
        clip(v, c.w - 9, 7.4, j === 0), 7.4, { bold: j === 0, color: INK, align: c.a || 'left' });
      cx += c.w;
    });
  });
  return top + 20 + rows.length * rh;
}
function mix(a, b, t) {
  const h = s => { let x = s.replace('#', ''); if (x.length === 3) x = x.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(x.slice(i, i + 2), 16)); };
  const A = h(a), B = h(b);
  return A.map((c, i) => Math.round(c + (B[i] - c) * Math.max(0, Math.min(1, t)))).map(v => v.toString(16).padStart(2, '0')).join('');
}

function pdf(an, opts) {
  opts = opts || {};
  const L = window.Seat.LAYOUTS[an.layout];
  const A4 = { w: 841.89, h: 595.28 };
  const pages = [];
  const ramp = opts.ramp || ['EDEFEE', 'BFE0C7', '6CBB7C', '1F7A3A'];
  THEME.acc = opts.acc || ramp[ramp.length - 1] || ACC;
  THEME.deep = opts.deep || '0F2E2F';
  /* mesma curva do painel: ramp já vem invertida quando é o caso */
  const curve = t => opts.gamma ? Math.pow(t, 1.7) : t;
  const rampAt = t => { const p = curve(Math.max(0, Math.min(1, t))) * (ramp.length - 1), i = Math.min(ramp.length - 2, Math.floor(p)); return mix(ramp[i], ramp[i + 1], p - i); };
  const total = opts.sim ? 4 : 3;

  /* página 1 — resumo */
  let p = new Page(A4.w, A4.h); pages.push(p);
  pdfHead(p, 'Resumo executivo', 'ESTUDO DE POLTRONAS', 1, total, an.sourceName);
  const gap = 11, cw = (A4.w - 68 - gap * 3) / 4;
  card(p, 34, 74, cw, 66, 'Período', `${an.period.calendarDays} dias`, `${an.period.tripCount} viagens · ${an.period.serviceDays} dias com saída`);
  card(p, 34 + cw + gap, 74, cw, 66, 'Ocupação média', pctS(an.summary.occupancy, 0), `${an.summary.soldSeats} de ${an.summary.layoutSeats} poltronas com venda`);
  card(p, 34 + (cw + gap) * 2, 74, cw, 66, 'Receita observada', money0(an.summary.revenue), `ticket médio ${money0(an.summary.avgTicket)}`);
  card(p, 34 + (cw + gap) * 3, 74, cw, 66, 'Planta', L.badge, `${an.sourceName}`);
  p.rect(34, 152, A4.w - 68, 62, 'F5F5F3', THEME.acc, 1);
  p.rect(34, 152, 3, 62, THEME.acc);
  p.text(48, 163, 'LEITURA PRINCIPAL', 7, { bold: true, color: THEME.acc });
  p.para(48, 176, an.champFirst
    ? `Nesse período de ${an.period.calendarDays} dias, com ${an.period.tripCount} viagens observadas, a poltrona ${an.champFirst.seat} foi comprada primeiro ${an.champFirst.first} vezes.`
    : 'Sem amostra suficiente no recorte selecionado.', A4.w - 110, 12.5, 16, { bold: true, color: DEEP, max: 2 });
  if (an.leadTop) p.text(48, 200, `Maior antecedência: poltrona ${an.leadTop.seat} · ${dec(an.leadTop.avgLead)} dias em média (mediana ${dec(an.leadTop.medLead)}, n=${an.leadTop.leadN}).`, 8, { color: MUT });

  /* recorte em vigor: o leitor precisa saber sobre o que olha */
  if (opts.filters && opts.filters.length) {
    p.text(34, 224, 'RECORTE APLICADO', 7, { bold: true, color: MUT });
    let fx = 34;
    opts.filters.slice(0, 7).forEach(([k, v]) => {
      const txt = `${k}: ${v}`;
      const w = Math.min(150, 7 + txt.length * 3.9);
      p.rect(fx, 231, w, 14, SOFT, LINE, .5);
      p.text(fx + 5, 236, clip(txt, w - 10, 6.8), 6.8, { color: INK });
      fx += w + 6;
    });
  }
  p.text(34, 258, 'Top 10 · maior antecedência', 11, { bold: true, color: DEEP });
  const c1 = [{ t: 'Pos', w: 34, a: 'center' }, { t: 'Poltrona', w: 52, a: 'center' }, { t: 'Média (d)', w: 60, a: 'right' },
    { t: 'Mediana', w: 55, a: 'right' }, { t: 'n', w: 40, a: 'right' }, { t: 'Viagens', w: 52, a: 'right' },
    { t: 'Receita', w: 78, a: 'right' }, { t: 'Posição', w: 115, a: 'left' }];
  table(p, 34, 272, c1, an.topLead10.slice(0, 10).map((s, i) => [i + 1, s.seat, dec(s.avgLead), dec(s.medLead), s.leadN, s.appear, money0(s.revenue), `${s.position} · ${s.side}`]), 16, 5);
  p.text(444, 258, 'Top 10 · vendem primeiro', 11, { bold: true, color: DEEP });
  const c2 = [{ t: 'Pos', w: 34, a: 'center' }, { t: 'Poltrona', w: 52, a: 'center' }, { t: 'Percentil', w: 58, a: 'right' },
    { t: 'Rank', w: 46, a: 'right' }, { t: '1ª', w: 36, a: 'right' }, { t: 'Viagens', w: 52, a: 'right' },
    { t: 'Receita', w: 78, a: 'right' }, { t: 'Posição', w: 8, a: 'left' }];
  table(p, 444, 272, c2, an.top10.slice(0, 10).map((s, i) => [i + 1, s.seat, pctS(s.avgPct), dec(s.avgRank, 2), s.first, s.appear, money0(s.revenue), '']), 16, 5);

  /* página 2 — mapa */
  p = new Page(A4.w, A4.h); pages.push(p);
  pdfHead(p, `Mapa de calor · ${opts.metricLabel || 'volume de vendas'}`, L.badge, 2, total, an.sourceName);
  p.text(34, 72, 'FRENTE', 7.5, { bold: true, color: THEME.acc });
  p.text(A4.w - 34, 72, 'FUNDO', 7.5, { bold: true, color: THEME.acc, align: 'right' });
  p.rect(34, 90, A4.w - 68, 330, 'F4F6F6', 'A8B4B4', 1);
  p.rect(46, 140, 54, 210, 'DCE7E7', '9AAAAA', .8);
  p.text(73, 235, 'MOTORISTA', 6.5, { bold: true, color: MUT, align: 'center' });
  const sx = 114, avail = A4.w - sx - 46, cols = L.columns, g2 = 4;
  const sw = (avail - g2 * (cols - 1)) / cols, shh = 44;
  const rowTop = { 1: 108, 2: 158, 4: 264, 5: 314 };
  const maxV = Math.max(...an.seats.map(s => s.appear), 1);
  const t5set = new Set((opts.topSeats || an.topLead10.slice(0, 5)).map(s => s.seat));
  /* opts.heat vem da tela: intensidade já calculada com a métrica, a
     referência e a sensibilidade que o usuário escolheu. Sem ele,
     o relatório cai no volume de vendas. */
  const heat = opts.heat || null;
  an.seats.forEach(s => {
    const x = sx + (s.col - 1) * (sw + g2), top = rowTop[s.gridRow];
    const t = heat ? (heat[s.seat] == null ? 0 : heat[s.seat]) : s.appear / maxV;
    const fill = s.appear ? rampAt(t) : 'E3E7E7';
    p.rect(x, top, sw, shh, fill, t5set.has(s.seat) ? THEME.acc : 'B9C4C4', t5set.has(s.seat) ? 2 : .6);
    const light = lum(fill) < .56;
    p.text(x + sw / 2, top + 8, String(s.seat), 11, { bold: true, color: light ? 'FFFFFF' : INK, align: 'center' });
    p.text(x + sw / 2, top + 24, `${s.appear} viagens`, 6.4, { color: light ? 'EDF6F1' : '4C5654', align: 'center' });
    p.text(x + sw / 2, top + 33, s.position === 'Janela' ? 'janela' : 'corredor', 5.6, { color: light ? 'E4F3EC' : '6E7A78', align: 'center' });
  });
  if (L.stairCol) {
    const x = sx + (L.stairCol - 1) * (sw + g2);
    p.rect(x, 108, sw, 94, 'D3DEDE', WARN, 1.2);
    p.text(x + sw / 2, 145, 'ESCADA', 8, { bold: true, color: DEEP, align: 'center' });
  }
  if (L.wcCol) {
    const x = sx + (L.wcCol - 1) * (sw + g2);
    p.rect(x, 108, sw, shh, 'D3DEDE', '9AAAAA', .8);
    p.text(x + sw / 2, 124, 'WC', 8, { bold: true, color: DEEP, align: 'center' });
  }
  p.rect(sx, 212, avail, 40, 'E4EAEA');
  p.text(sx + avail / 2, 225, 'CORREDOR CENTRAL · HO', 8.5, { bold: true, color: MUT, align: 'center' });
  const legLow = opts.legendLow || 'Menos vendida';
  const legHigh = opts.legendHigh || `Mais vendida (${maxV} viagens)`;
  p.text(34, 438, legLow, 7.5, { color: MUT });
  for (let i = 0; i < 14; i++) p.rect(112 + i * 17, 434, 17, 12, rampAt(i / 13));
  p.text(356, 438, legHigh, 7.5, { color: MUT });
  p.rect(510, 432, 15, 15, 'FFFFFF', THEME.acc, 2);
  p.text(534, 437, `Top 5 · ${opts.rankLabel || 'ranking ativo'}`, 7.5, { color: MUT });
  p.para(34, 462, `${L.ctx} ${opts.metricDesc || 'A intensidade é a razão entre as viagens da poltrona e a poltrona mais vendida do recorte.'} ` +
    (opts.invert ? 'A escala está invertida: a cor cheia marca os valores MENORES. ' : '') +
    (opts.scale ? `Escala: ${opts.scale}.` : ''), A4.w - 68, 7.6, 10.5, { color: MUT, max: 3 });

  /* página 3 — tabela completa */
  p = new Page(A4.w, A4.h); pages.push(p);
  pdfHead(p, 'Todas as poltronas', 'BASE AUDITÁVEL', 3, total, an.sourceName);
  const c3 = [{ t: 'Poltrona', w: 46, a: 'center' }, { t: 'Posição', w: 96, a: 'left' }, { t: 'Viagens', w: 44, a: 'right' },
    { t: 'Cobertura', w: 50, a: 'right' }, { t: 'Antec.', w: 44, a: 'right' }, { t: 'Mediana', w: 46, a: 'right' },
    { t: 'Percentil', w: 48, a: 'right' }, { t: '1ª', w: 30, a: 'right' }, { t: 'Bilhetes', w: 44, a: 'right' },
    { t: 'Receita', w: 74, a: 'right' }, { t: 'Ticket', w: 60, a: 'right' }, { t: 'Índice', w: 40, a: 'right' }, { t: 'Confiança', w: 52, a: 'left' }];
  const list = an.seats.filter(s => s.appear).sort((a, b) => (a.avgPct == null) - (b.avgPct == null) || (a.avgPct || 0) - (b.avgPct || 0));
  const half = Math.ceil(list.length / 2);
  const mk = arr => arr.map(s => [s.seat, `${s.position} · ${s.side}`, s.appear, pctS(s.coverage, 0), dec(s.avgLead), dec(s.medLead),
    pctS(s.avgPct), s.first, s.revN, money0(s.revenue), money0(s.avgRev), dec(s.scorePct), s.conf]);
  const rh = list.length > 46 ? 11 : 12.5;
  table(p, 34, 74, c3, mk(list.slice(0, half)), rh);
  if (list.length > half) table(p, 34, 74 + 20 + half * rh + 14, c3, mk(list.slice(half)), rh);

  /* página 4 — simulação */
  if (opts.sim) {
    const s = opts.sim;
    p = new Page(A4.w, A4.h); pages.push(p);
    pdfHead(p, 'Simulação de reajuste', 'CENÁRIO DE PREÇO', 4, total, an.sourceName);
    card(p, 34, 74, cw, 66, 'Receita atual', money0(s.base), `${s.seats.length} poltronas · ${s.tickets} bilhetes`);
    const ajuste = s.mode === 'abs' ? `+${money0(s.abs)} por bilhete` : `+${(s.pct * 100).toFixed(0)}%`;
    card(p, 34 + cw + gap, 74, cw, 66, `Com ${ajuste}`, money0(s.novo), `retenção de demanda ${(s.ret * 100).toFixed(0)}%`);
    card(p, 34 + (cw + gap) * 2, 74, cw, 66, 'Ganho no período', money0(s.delta), `${pctS(s.deltaPct)} sobre a seleção`, '1F7A3A');
    card(p, 34 + (cw + gap) * 3, 74, cw, 66, 'Projeção 12 meses', money0(s.perYear), `${money0(s.perDay)} por dia`, '1F7A3A');
    p.text(34, 160, 'Poltronas do cenário', 11, { bold: true, color: DEEP });
    const c4 = [{ t: 'Poltrona', w: 52, a: 'center' }, { t: 'Posição', w: 130, a: 'left' }, { t: 'Viagens', w: 52, a: 'right' },
      { t: 'Bilhetes', w: 52, a: 'right' }, { t: 'Ticket médio', w: 78, a: 'right' }, { t: 'Receita atual', w: 88, a: 'right' },
      { t: 'Receita simulada', w: 98, a: 'right' }, { t: 'Ganho', w: 78, a: 'right' }];
    const end = table(p, 34, 174, c4, s.seats.map(x => [x.seat, `${x.position} · ${x.side}`, x.appear, x.tickets,
      money0(x.avgRev), money0(x.base), money0(x.novo), money0(x.delta)]), 15);
    p.rect(34, end + 16, A4.w - 68, 58, SOFT, LINE, .6);
    p.rect(34, end + 16, 3, 58, WARN);
    p.text(48, end + 26, 'COMO LER', 7, { bold: true, color: WARN });
    p.para(48, end + 38, (s.mode === 'abs'
      ? `Receita simulada = (receita observada + ${money0(s.abs)} × bilhetes) × ${(s.ret * 100).toFixed(0)}% de retenção — equivale a ${(s.pctEfetivo * 100).toFixed(1)}% sobre o ticket médio da seleção. `
      : `Receita simulada = receita observada × (1 + ${(s.pct * 100).toFixed(0)}%) × ${(s.ret * 100).toFixed(0)}% de retenção. `) +
      `Com esse ajuste a operação suporta perder até ${pctS(s.breakEven)} das vendas dessas poltronas antes de empatar com a receita atual. ` +
      `A seleção representa ${pctS(s.share)} da receita do recorte, então o impacto no total é de ${pctS(s.totalDeltaPct)}. ` +
      `Trata-se de um cenário determinístico sobre dados observados: não estima elasticidade nem prevê reação da concorrência.`, A4.w - 110, 7.6, 10.5, { color: MUT, max: 4 });
  }

  download(pdfBytes(pages, opts.title || 'Estudo de Poltronas'), opts.filename || 'estudo-poltronas.pdf', 'application/pdf');
}

return { xlsx, xlsxHistory, pdf, download };
})();

/* ══════════════════════════════════════════════════════════════
   CACHE LOCAL · preferências (localStorage) e estudos (IndexedDB)
   ══════════════════════════════════════════════════════════════ */
window.SeatStore = (function () {
'use strict';
const PK = 'poltronas:prefs:v4', DB = 'poltronas-v4', ST = 'estudos';

function prefs() { try { return JSON.parse(localStorage.getItem(PK) || '{}') || {}; } catch (e) { return {}; } }
function setPref(k, v) { try { const p = prefs(); p[k] = v; localStorage.setItem(PK, JSON.stringify(p)); } catch (e) {} }

function open() {
  return new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error('Este navegador não guarda histórico local.'));
    const rq = indexedDB.open(DB, 1);
    rq.onupgradeneeded = () => {
      const db = rq.result;
      if (!db.objectStoreNames.contains(ST)) {
        const s = db.createObjectStore(ST, { keyPath: 'id' });
        s.createIndex('savedAt', 'savedAt');
      }
    };
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
}
async function all() {
  const db = await open();
  return new Promise((res, rej) => {
    const rq = db.transaction(ST, 'readonly').objectStore(ST).getAll();
    rq.onsuccess = () => { db.close(); res((rq.result || []).sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))); };
    rq.onerror = () => { db.close(); rej(rq.error); };
  });
}
async function get(id) {
  const db = await open();
  return new Promise((res, rej) => {
    const rq = db.transaction(ST, 'readonly').objectStore(ST).get(id);
    rq.onsuccess = () => { db.close(); res(rq.result); };
    rq.onerror = () => { db.close(); rej(rq.error); };
  });
}
async function put(rec) {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(ST, 'readwrite');
    tx.objectStore(ST).put(rec);
    tx.oncomplete = () => { db.close(); res(rec); };
    tx.onerror = () => { db.close(); rej(tx.error); };
  });
}
async function del(id) {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(ST, 'readwrite');
    tx.objectStore(ST).delete(id);
    tx.oncomplete = () => { db.close(); res(true); };
    tx.onerror = () => { db.close(); rej(tx.error); };
  });
}
async function wipe() {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(ST, 'readwrite');
    tx.objectStore(ST).clear();
    tx.oncomplete = () => { db.close(); res(true); };
    tx.onerror = () => { db.close(); rej(tx.error); };
  });
}
return { prefs, setPref, all, get, put, del, wipe };
})();
