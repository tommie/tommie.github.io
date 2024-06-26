'use strict';

export function encode(out, index, value) {
  switch (getValueKind(value)) {
  case 'boolean':
    return encodeBigInt(out, index, BigInt(value));

  case 'number':
    return encodeFloat32(out, index, value);

  case 'bigint':
    return encodeBigInt(out, index, value, false);

  case 'string':
    return encodeArrayBufferView(out, index, new TextEncoder().encode(value));

  case 'buffer':
    return encodeArrayBufferView(out, index, value);

  default:
    throw new Error(`Unhandled value type: ${value} `);
  }
}

export function decode(view, kind) {
  if (!(view instanceof DataView)) view = new DataView(view.buffer, view.byteOffset, view.byteLength);

  switch (kind) {
  case 'boolean':
    const [i, v] = decodeBigInt(view, 0);
    return [i, Boolean(v)];

  case 'number':
    return decodeFloat32(view, 0);

  case 'bigint':
    return decodeBigInt(view, 0);

  case 'string':
    {
      const [i, buf] = decodeArrayBufferView(view, 0);
      return [i, new TextDecoder().decode(buf)];
    }

  case 'buffer':
    return decodeArrayBufferView(view);

  default:
    throw new Error(`Unhandled value type: ${value} `);
  }
}

function encodeBigInt(out, index, value, isLength) {
  if (!isLength && canUseShortForm(value)) {
    out.setInt8(index++, Number(value));
    return index;
  }

  const bps = isLength ? LENGTH_BREAKPOINTS : NONLENGTH_BREAKPOINTS;
  let bpi = 0;

  for (; bpi < bps.length; ++bpi) {
    const bp = bps[bpi][0];

    if (value >= -(1n << BigInt(bp)) && value < 1n << BigInt(bp)) {
      break;
    }
  }

  if (bpi == 0 && isLength && value < 8n) {
    bpi = 2;
  }

  if (bpi === bps.length) {
    if (isLength) {
      throw new Error(`Length out of range: ${value}`);
    } else {
      let n = sizeOfBigInt(value);
      n += (8 - n % 8) % 8;  // Round up to a byte.
      index = encodeBigInt(out, index, BigInt(n / 8), true);
      for (let i = BigInt(n); i > 0n;) {
        if (i >= 64n) {
          out.setBigUint64(index, value >> (i - 64n), false);
          index += 8;
          i -= 64n;
        } else if (i >= 32n) {
          out.setUint32(index, Number(value >> (i - 32n)), false);
          index += 4;
          i -= 32n;
        } else if (i >= 16n) {
          out.setUint16(index, Number(value >> (i - 16n)), false);
          index += 2;
          i -= 16n;
        } else {
          out.setUint8(index++, Number(value >> (i - 8n)));
          i -= 8n;
        }
      }
      return index;
    }
  }

  const prefix = isLength ? 0x20 : 0x00;
  const size = bps[bpi][1];

  out.setUint8(index++, 0x80 | prefix | (bpi << 3) | (Number(value >> (8n*BigInt(size))) & 0x07));

  switch (size) {
  case 0:
    break;
  case 1:
    out.setUint8(index, Number(value));
    break;
  case 2:
    out.setUint16(index, Number(value), false);
    break;
  case 4:
    out.setUint32(index, Number(value), false);
    break;
  case 8:
    out.setBigUint64(index, value, false);
    break;
  }

  return index + size;
}

const NONLENGTH_BREAKPOINTS = [
  [2+1*8, 1],
  [2+2*8, 2],
  [2+4*8, 4],
  [2+8*8, 8],
];
const LENGTH_BREAKPOINTS = [
  [3+1*8, 1],
  [3+2*8, 2],
  [0,     0],
  [3+8*8, 8],
];

function encodeArrayBufferView(out, index, value) {
  const arr = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);

  if (arr.byteLength === 0) {
    out.setUint8(index++, 0xB0);
  } else if (arr.byteLength <= 1) {
    const v = arr[0];
    if (v < 0x80 || v >= 0xC0) {
      out.setUint8(index++, v);
    } else {
      out.setUint8(index++, 0x80);
      out.setUint8(index++, v);
    }
  } else {
    index = encodeBigInt(out, index, BigInt(arr.byteLength), true);
    new Uint8Array(out.buffer, out.byteOffset + index, out.byteLength - index).set(arr);
    return index + arr.byteLength;
  }

  return index;
}

function encodeFloat32(out, index, value) {
  const buf = new DataView(new ArrayBuffer(4));
  buf.setFloat32(0, value);
  const intv = buf.getUint32(0, false);
  let tz = ctz32(intv);
  tz = tz - tz % 8;
  return encode(out, index, BigInt(intv >> tz));
}

function decodeBigInt(view, index, onlyLength) {
  const b = view.getUint8(index++);

  switch (b & 0xE0) {
  case 0x00:
  case 0x20:
  case 0x40:
  case 0x60:
  case 0xC0:
  case 0xE0:
    // Short form.
    return [index, BigInt((b & 0x80) ? -(-b & 0x7F) : b)];

  case 0x80:
    {
      // Medium form.
      if (onlyLength) {
        return [index, b >> 3];
      }

      let v = BigInt((b & 0x04) ? -(-b & 0x03) : (b & 0x07));
      switch (b & 0x18) {
      case 0x00:
        v <<= 8n;
        v |= BigInt(view.getUint8(index++));
        return [index, v];

      case 0x08:
        v <<= 16n;
        v |= BigInt(view.getUint16(index, false));
        index += 2;
        return [index, v];

      case 0x10:
        v <<= 32n;
        v |= BigInt(view.getUint32(index, false));
        index += 4;
        return [index, v];

      case 0x18:
        v <<= 64n;
        v |= view.getBigUint64(index, false);
        index += 8;
        return [index, v];
      }
    }

  case 0xA0:
    {
      // Long form.
      let n = BigInt(b & 0x07);

      switch (b & 0x18) {
      case 0x00:
        n <<= 8n;
        n |= BigInt(view.getUint8(index++));
        break;

      case 0x08:
        n <<= 16n;
        n |= BigInt(view.getUint16(index, false));
        index += 2;
        break;

      case 0x10:
        break;

      case 0x18:
        n <<= 64n;
        n |= view.getBigUint64(index, false);
        index += 8;
        break;
      }

      if (onlyLength) {
        return [index, Number(n)];
      }

      let ret = 0n;
      for (let j = 0; j < n; ++j) {
        ret <<= 8n;
        ret |= BigInt(view.getUint8(index++));
      }
      return [index, ret];
    }
  }
}

function decodeArrayBufferView(view, index) {
  const b = view.getUint8(index);
  switch (b & 0xC0) {
  case 0x00:
  case 0x40:
  case 0xC0:
    return [1, new Uint8Array(view.buffer, view.byteOffset + index, 1)];

  case 0x80:
    let [i, n] = decodeBigInt(view, index, /*onlyLength=*/ true);
    n = Number(n);
    return [i + n, new Uint8Array(view.buffer, view.byteOffset + i, n)];
  }
}

function decodeFloat32(view, index) {
  const [i, v] = decodeBigInt(view, 0);
  const buf = new DataView(new ArrayBuffer(4));
  switch (i - index) {
  case 1:
    buf.setUint8(0, Number(v));
    break;

  case 2:
    buf.setUint16(0, Number(v), false);
    break;

  case 3:
    buf.setUint32(0, Number(v << 16n), false);
    break;

  case 5:
    buf.setUint32(0, Number(v), false);
    break;
  }

  return [i, buf.getFloat32(0)];
}

function getValueKind(value) {
  const to = typeof value;
  switch (to) {
  case 'boolean':
  case 'number':
  case 'bigint':
  case 'string':
    return to;

  default:
    if ('buffer' in value && value.buffer instanceof ArrayBuffer) {
      return 'buffer';
    }

    throw new Error(`Unhandled value type: ${value} `);
  }
}

function canUseShortForm(value) {
  return value >= -64 && value < 128;
}

// BigInt doesn't have an API to figure out the highest bit set.
//
// As this is only an example, we can do it the slow way.
function sizeOfBigInt(value) {
  let n = 0;
  for (; value; value >>= 1n, ++n) {}
  return n;
}

// From https://graphics.stanford.edu/~seander/bithacks.html#ZerosOnRightModLookup.
function ctz32(value) {
  return CTZ32_LOOKUP[(-value & value) % 37];
}

const CTZ32_LOOKUP = [
  32, 0, 1, 26, 2, 23, 27, 0, 3, 16, 24, 30, 28, 11, 0, 13, 4,
  7, 17, 0, 25, 22, 31, 15, 29, 10, 12, 6, 0, 21, 14, 9, 5,
  20, 8, 19, 18,
];
