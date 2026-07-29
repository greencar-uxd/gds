'use strict';
// 자체 제작 kiwi 디코더 — 외부 의존성 0 (Node 표준 라이브러리만)
// .fig 문서 블록은 deflate가 아니라 zstd(매직 0xFD2FB528) — Node 22.15+ 필요
const fs = require('fs');
const zlib = require('zlib');

const T = { BOOL: -1, BYTE: -2, INT: -3, UINT: -4, FLOAT: -5, STRING: -6, INT64: -7, UINT64: -8 };
const KIND = ['ENUM', 'STRUCT', 'MESSAGE'];

class Reader {
  constructor(buf) { this.d = buf; this.i = 0; }
  get eof() { return this.i >= this.d.length; }
  byte() { return this.d[this.i++]; }
  bool() { return !!this.d[this.i++]; }
  varuint() {
    let v = 0, s = 0, b;
    do { b = this.d[this.i++]; v |= (b & 127) * Math.pow(2, s); s += 7; } while (b & 128);
    return v >>> 0 === v ? v >>> 0 : v;
  }
  varint() { const v = this.varuint(); return (v & 1) ? ~(v >>> 1) : (v >>> 1); }
  varuint64() {
    let v = 0n, s = 0n, b;
    do { b = this.d[this.i++]; v |= BigInt(b & 127) << s; s += 7n; } while (b & 128);
    return v;
  }
  varint64() { const v = this.varuint64(); return (v & 1n) ? ~(v >> 1n) : (v >> 1n); }
  float() {
    if (this.d[this.i] === 0) { this.i++; return 0; }
    let bits = this.d.readUInt32LE(this.i); this.i += 4;
    bits = ((bits << 23) | (bits >>> 9)) >>> 0;
    const b = Buffer.allocUnsafe(4); b.writeUInt32LE(bits, 0);
    return b.readFloatLE(0);
  }
  string() {
    const s = this.i;
    while (this.d[this.i] !== 0) this.i++;
    const out = this.d.toString('utf8', s, this.i);
    this.i++;
    return out;
  }
}

function parseSchema(buf) {
  const r = new Reader(buf);
  const n = r.varuint();
  const defs = [];
  for (let i = 0; i < n; i++) {
    const name = r.string();
    const kind = r.byte();
    const fc = r.varuint();
    const fields = [];
    for (let j = 0; j < fc; j++) {
      const fname = r.string();
      const type = r.varint();
      const isArray = !!r.byte();
      const value = r.varuint();
      fields.push({ name: fname, type, isArray, value });
    }
    defs.push({ name, kind: KIND[kind], fields, index: i });
  }
  return defs;
}

function makeDecoder(defs, project) {
  const byIndex = defs;
  // 성능: 필드 조회를 O(1)로. (find()는 192k 노드 × 600필드에서 비현실적)
  for (const d of defs) {
    if (!d._map) {
      d._map = new Map();
      for (const f of d.fields) d._map.set(f.value, f);
    }
  }
  // 메모리: project에 지정된 def는 지정 필드만 보관(나머지는 읽고 버림)
  const keep = new Map();
  if (project) for (const k of Object.keys(project)) keep.set(k, new Set(project[k]));
  function readValue(r, type) {
    switch (type) {
      case T.BOOL: return r.bool();
      case T.BYTE: return r.byte();
      case T.INT: return r.varint();
      case T.UINT: return r.varuint();
      case T.FLOAT: return r.float();
      case T.STRING: return r.string();
      case T.INT64: return r.varint64();
      case T.UINT64: return r.varuint64();
      default: return readDef(r, byIndex[type]);
    }
  }
  function readField(r, f) {
    if (f.isArray) {
      const n = r.varuint();
      const a = new Array(n);
      for (let k = 0; k < n; k++) a[k] = readValue(r, f.type);
      return a;
    }
    return readValue(r, f.type);
  }
  function readDef(r, def) {
    if (!def) throw new Error('unknown def');
    if (def.kind === 'ENUM') {
      const v = r.varuint();
      const f = def.fields.find(x => x.value === v);
      return f ? f.name : v;
    }
    const o = {};
    const k = keep.get(def.name);
    if (def.kind === 'STRUCT') {
      for (const f of def.fields) {
        const v = readField(r, f);
        if (!k || k.has(f.name)) o[f.name] = v;
      }
      return o;
    }
    // MESSAGE
    for (;;) {
      const id = r.varuint();
      if (id === 0) break;
      const f = def._map.get(id);
      if (!f) throw new Error(`unknown field ${id} in ${def.name}`);
      const v = readField(r, f);
      if (!k || k.has(f.name)) o[f.name] = v;
    }
    return o;
  }
  return { readDef, byIndex };
}

function loadFig(figPath, project) {
  const b = fs.readFileSync(figPath);
  if (b.slice(0, 8).toString() !== 'fig-kiwi') throw new Error('not a fig-kiwi file');
  const version = b.readUInt32LE(8);
  let o = 12; const blocks = [];
  while (o < b.length) { const len = b.readUInt32LE(o); o += 4; blocks.push(b.slice(o, o + len)); o += len; }
  const dec = raw => {
    if (raw.length >= 4 && raw.readUInt32LE(0) === 0xFD2FB528) return zlib.zstdDecompressSync(raw);
    try { return zlib.inflateRawSync(raw); } catch { return zlib.inflateSync(raw); }
  };
  const schemaBuf = dec(blocks[0]);
  const docBuf = dec(blocks[1]);
  const defs = parseSchema(schemaBuf);
  const { readDef } = makeDecoder(defs, project);
  const r = new Reader(docBuf);
  const root = defs.find(d => d.name === 'Message');
  const doc = readDef(r, root);
  return { version, defs, doc, bytesRead: r.i, docSize: docBuf.length };
}

module.exports = { loadFig, parseSchema, makeDecoder, Reader, T };
