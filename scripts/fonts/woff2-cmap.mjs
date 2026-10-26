/**
 * Reads the character map of a WOFF2 file (Node zlib brotli; no dependencies). Owner: WP-02.
 *
 * Google's `&text=` responses list every requested character in `unicode-range`, including characters the
 * font does not have. fetch-fonts.mjs narrows each subset's unicode-range to the code points its cmap really
 * maps, so a missing glyph goes straight to the next family of the stack, and reports what each face lacks.
 * WOFF2 (W3C REC 2024): 48-byte header, table directory (flags + UIntBase128 lengths), one brotli stream with
 * the tables concatenated in directory order; `cmap` is never transformed.
 */
import { brotliDecompressSync } from 'node:zlib';

const KNOWN = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT',
  'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT',
  'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty',
  'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

/** @param {Buffer} buf a .woff2 file @returns {Set<number>} code points mapped to a glyph other than .notdef */
export function woff2Cmap(buf) {
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not a WOFF2 file');
  if (buf.toString('latin1', 4, 8) === 'ttcf') throw new Error('font collections are not supported');
  const numTables = buf.readUInt16BE(12);
  const compressedSize = buf.readUInt32BE(20);
  let p = 48;
  const base128 = () => {
    let v = 0;
    for (let i = 0; i < 5; i++) { const b = buf[p++]; v = v * 128 + (b & 0x7f); if (!(b & 0x80)) return v; }
    throw new Error('bad UIntBase128');
  };
  let offset = 0, cmap = null;
  for (let t = 0; t < numTables; t++) {
    const flags = buf[p++];
    const tag = (flags & 0x3f) === 0x3f ? buf.toString('latin1', p, (p += 4)) : KNOWN[flags & 0x3f];
    const version = flags >> 6;
    const origLength = base128();
    const transformed = tag === 'glyf' || tag === 'loca' ? version !== 3 : version !== 0;
    const length = transformed ? base128() : origLength;
    if (tag === 'cmap') cmap = { offset, length };
    offset += length;
  }
  if (!cmap) throw new Error('no cmap table');
  const data = brotliDecompressSync(buf.subarray(p, p + compressedSize));
  return parseCmap(data.subarray(cmap.offset, cmap.offset + cmap.length));
}

function parseCmap(t) {
  const n = t.readUInt16BE(2);
  const recs = [];
  for (let i = 0; i < n; i++) recs.push({ pid: t.readUInt16BE(4 + i * 8), eid: t.readUInt16BE(6 + i * 8), off: t.readUInt32BE(8 + i * 8) });
  // prefer a full-repertoire format 12 table, then BMP format 4
  const pick = recs.map((r) => ({ ...r, fmt: t.readUInt16BE(r.off) })).sort((a, b) => (b.fmt === 12) - (a.fmt === 12) || (b.fmt === 4) - (a.fmt === 4));
  const out = new Set();
  for (const r of pick) {
    if (r.fmt === 12) {
      const groups = t.readUInt32BE(r.off + 12);
      for (let g = 0; g < groups; g++) {
        const o = r.off + 16 + g * 12, a = t.readUInt32BE(o), b = t.readUInt32BE(o + 4), gid = t.readUInt32BE(o + 8);
        for (let c = a; c <= b; c++) if (gid + (c - a)) out.add(c);
      }
      return out;
    }
    if (r.fmt === 4) {
      const seg = t.readUInt16BE(r.off + 6) / 2;
      const ends = r.off + 14, starts = ends + seg * 2 + 2, deltas = starts + seg * 2, ranges = deltas + seg * 2;
      for (let s = 0; s < seg; s++) {
        const end = t.readUInt16BE(ends + s * 2), start = t.readUInt16BE(starts + s * 2);
        const delta = t.readInt16BE(deltas + s * 2), ro = t.readUInt16BE(ranges + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let gid;
          if (!ro) gid = (c + delta) & 0xffff;
          else {
            const gi = t.readUInt16BE(ranges + s * 2 + ro + (c - start) * 2);
            gid = gi ? (gi + delta) & 0xffff : 0;
          }
          if (gid) out.add(c);
        }
      }
      return out;
    }
  }
  return out;
}
