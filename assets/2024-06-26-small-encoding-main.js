import { decode, encode } from './2024-06-26-small-encoding.js';

const EXAMPLE_INPUTS = [
  ['Integer', 'bigint', [
    -65n,
    -64n,
    -1n,
    0n,
    1n,
    127n,
    1023n,
    1024n,
    0x3FFFFFFFFFFFFFFFFn,
    0x40000000000000000n,
  ]],

  ['Floating Point', 'number', [
    0,
    0.5,
    1,
    2,
    3,
    4,
    8,
    205887/2**16,
    1*2**-120,  // Only uses 10 bits.
  ]],

  ['ASCII', 'string', [
    '',
    'a',

    'Hello',
    'Hello world',
  ]],

  ['Unicode', 'string', [
    'Ö',
    '☺',
  ]],
];
const EXAMPLE_PADDING = 20;

function encodeValue(value, length) {
  const buf = new DataView(new ArrayBuffer(Math.max(256, length)));
  const len = encode(buf, 0, value);

  return Array.from(new Uint8Array(buf.buffer, buf.byteOffset, len)).map(v => v.toString(0x10).padStart(2, '0')).join(' ');
}

function decodeHex(value, kind) {
  return decode(Uint8Array.from(value.split(' ').map(v => parseInt(v, 0x10))), kind)[1];
}

function runExampleTests() {
  for (const [group, kind, vs] of EXAMPLE_INPUTS) {
    for (const v of vs) {
      try {
        const enc = encodeValue(v, 256);
        const decv = decodeHex(enc, kind);
        if (decv !== v) {
          console.error(`Bad encoding for ${group}: ${v} -> ${enc} -> ${decv}`);
        }
      } catch (ex) {
        console.error('Decode test failed for ${group}:', v, ex);
      }
    }
  }
}

export default function main() {
  const encodedOutputEl = document.getElementById('encodedoutput');
  const decodedOutputEl = document.getElementById('decodedoutput');
  const valueInputEl = document.getElementById('valueinput');

  function updateOutput() {
    if (!valueInputEl.value.length) {
      encodedOutputEl.innerText = '';
      decodedOutputEl.innerText = '';
      return;
    }

    try {
      const v = eval(valueInputEl.value);
      encodedOutputEl.innerText = encodeValue(v, valueInputEl.value.length);
      decodedOutputEl.innerText = decodeHex(encodedOutputEl.innerText, getValueKind(v));
    } catch (ex) {
      encodedOutputEl.innerText = String(ex);
      decodedOutputEl.innerText = '';
    }
  }

  valueInputEl.addEventListener('input', updateOutput);
  updateOutput();

  document.getElementById('examples').innerText = EXAMPLE_INPUTS.map(([group, _, vs], i) => {
    return (i ? '\n' : '') + '# ' + group + '\n' + vs.map(v => `${String(v).padStart(EXAMPLE_PADDING, ' ')}  →  ${encodeValue(v, 256)}`).join('\n');
  }).join('\n');

  runExampleTests();
}
