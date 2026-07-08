/**
 * Patches a MediaRecorder-produced WebM `Blob` to carry a real `Duration` in
 * its `Segment → Info` element (CHR-59).
 *
 * Root cause (confirmed by inspecting the raw bytes of a real recording):
 * Chrome's MediaRecorder NEVER writes a `Duration` element when the duration
 * isn't known upfront — which is always true for a live capture — so
 * `Segment → Info` only ever contains `TimecodeScale` + `MuxingApp` +
 * `WritingApp`. Playing the file back with `<video>` works (Chrome tolerates
 * it), but many stricter players/OS default video apps treat a duration-less
 * webm as unsupported/corrupt and refuse to open it — matching "impossible de
 * lire la vidéo".
 *
 * `Segment` itself is written with EBML's "unknown size" marker (all-1 bits),
 * which is valid for a live recording and means nothing outside `Info` needs
 * to shift or have its size recomputed — only `Info` grows by the inserted
 * `Duration` element, and only `Info`'s own size field needs rewriting.
 */

const SEGMENT_ID = 0x18538067;
const INFO_ID = 0x1549a966;
const DURATION_ID = 0x4489;

/** Read an EBML element ID (the vint bytes ARE the ID — the marker bit is kept). */
function readId(buf: Uint8Array, pos: number): { id: number; length: number } | null {
  const first = buf[pos];
  if (first === undefined) return null;
  let length = 1;
  let mask = 0x80;
  while (length <= 4 && !(first & mask)) {
    length++;
    mask >>= 1;
  }
  if (length > 4) return null;
  let id = first;
  for (let i = 1; i < length; i++) id = id * 256 + buf[pos + i];
  return { id, length };
}

/** Read an EBML size vint (marker bit stripped — this is the numeric value). */
function readSize(buf: Uint8Array, pos: number): { value: number; length: number } | null {
  const first = buf[pos];
  if (first === undefined) return null;
  let length = 1;
  let mask = 0x80;
  while (length <= 8 && !(first & mask)) {
    length++;
    mask >>= 1;
  }
  if (length > 8) return null;
  let value = first & (mask - 1);
  for (let i = 1; i < length; i++) value = value * 256 + buf[pos + i];
  return { value, length };
}

/** Encode an EBML size vint, using at least `minLength` bytes (grows if the
 *  value no longer fits — never truncates below what the value needs). */
function encodeSize(value: number, minLength = 1): Uint8Array {
  let length = minLength;
  while (length < 8 && value > Math.pow(2, 7 * length) - 2) length++;
  const out = new Uint8Array(length);
  let v = value;
  for (let i = length - 1; i >= 0; i--) {
    out[i] = v & 0xff;
    v = Math.floor(v / 256);
  }
  out[0] |= 0x80 >> (length - 1);
  return out;
}

/**
 * Returns a new Blob with a `Duration` (in ms) written into `Segment → Info`,
 * or the ORIGINAL blob unchanged if the structure isn't recognised (defensive
 * — a webm the operator can still open in Chrome/VLC/the site's own player
 * beats a broken download) or if a Duration is already present.
 */
export async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  try {
    const bytes = new Uint8Array(await blob.arrayBuffer());

    // Skip the EBML header (the first top-level element) to reach Segment.
    let pos = 0;
    const ebmlId = readId(bytes, pos);
    if (!ebmlId) return blob;
    pos += ebmlId.length;
    const ebmlSize = readSize(bytes, pos);
    if (!ebmlSize) return blob;
    pos += ebmlSize.length + ebmlSize.value;

    const seg = readId(bytes, pos);
    if (!seg || seg.id !== SEGMENT_ID) return blob;
    pos += seg.length;
    const segSize = readSize(bytes, pos);
    if (!segSize) return blob;
    const segContentStart = pos + segSize.length;

    // Walk Segment's direct children to find Info (Segment may be
    // unknown-size — we simply stop once Info is found, no need to visit
    // every later sibling like Tracks/Cluster).
    let cursor = segContentStart;
    let infoStart = -1;
    let infoIdLen = -1;
    let infoSizeLen = -1;
    let infoContentLen = -1;
    while (cursor < bytes.length) {
      const elId = readId(bytes, cursor);
      if (!elId) break;
      const elSize = readSize(bytes, cursor + elId.length);
      if (!elSize) break;
      const elContentStart = cursor + elId.length + elSize.length;
      if (elId.id === INFO_ID) {
        infoStart = cursor;
        infoIdLen = elId.length;
        infoSizeLen = elSize.length;
        infoContentLen = elSize.value;
        break;
      }
      cursor = elContentStart + elSize.value;
    }
    if (infoStart < 0) return blob;

    // Already has a Duration child? Don't double-insert.
    const infoContentStart = infoStart + infoIdLen + infoSizeLen;
    let p = infoContentStart;
    const infoContentEnd = infoContentStart + infoContentLen;
    while (p < infoContentEnd) {
      const cid = readId(bytes, p);
      if (!cid) break;
      const csize = readSize(bytes, p + cid.length);
      if (!csize) break;
      if (cid.id === DURATION_ID) return blob;
      p = p + cid.length + csize.length + csize.value;
    }

    // Build the Duration element: ID(2B, 0x4489) + size(1B, always 8) +
    // 8-byte big-endian IEEE754 double. TimecodeScale is 1_000_000ns = 1ms
    // (Chrome's default, confirmed in the same byte dump), so Duration's
    // value is simply the duration in milliseconds.
    const durationEl = new Uint8Array(11);
    durationEl[0] = 0x44;
    durationEl[1] = 0x89;
    durationEl[2] = 0x88;
    new DataView(durationEl.buffer).setFloat64(3, durationMs, false);

    const newInfoContentLen = infoContentLen + durationEl.length;
    const newInfoSize = encodeSize(newInfoContentLen, infoSizeLen);

    const head = bytes.slice(0, infoStart + infoIdLen); // up to & incl. Info's ID
    const body = bytes.slice(infoContentStart); // Info's existing content onward

    const out = new Uint8Array(head.length + newInfoSize.length + durationEl.length + body.length);
    let o = 0;
    out.set(head, o);
    o += head.length;
    out.set(newInfoSize, o);
    o += newInfoSize.length;
    out.set(durationEl, o);
    o += durationEl.length;
    out.set(body, o);

    return new Blob([out], { type: blob.type });
  } catch {
    return blob; // best-effort — never let a patching bug break the download
  }
}
