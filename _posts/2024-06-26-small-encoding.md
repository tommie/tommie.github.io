---
title: A Small Variable-Length Bit/Byte Encoding
categories: [encoding, marshaling, protocol, wire, compression]
---

This is an encoding that unifies the treatment of booleans, bit sets, integers and arbitrary byte data.
For a while, I've been toying with the idea of unifying variable-length integer encoding with encoding the length of byte data.
It's dogmatically annoying that Protocol Buffers doesn't support `uint128` or bigger, and I have to resort to `bytes`.
I want to express an RSA modulus as a big integer, not as a byte sequence!
Or conversely, I want to treat byte sequences and integers the same at the encoding level.
This grew out of that mental exercise.

The goals are to:

* Create a compact encoding for small and common values.
* Create an encoding that scales to large values.
* Self-delimiting values that don't require external framing.
* Encode small and big integers the same way.
* Encode "round" floating point numbers more efficiently than copy-pasting IEEE 754 values.
* Encode short byte sequences compactly.
* Handle ASCII gracefully.

## Background

There are lots of variable-length integer encodings out there, but they mostly fall into three categories.

1. Protocol buffers uses 7-bit octets with the upper bit indicating if another octet follows.
   WebAssembly (LEB-128) is basically the same.
2. ASN.1 BER/CER/DER lengths and integers use length prefixes.
3. ASN.1 BER/CER/DER tags use the top bit to encode continuation bytes/octets.
4. UTF-8 uses a variable number of top bits in the first byte to say how many bytes follow.
   A single test can be used to discover the full size, which is nice.
   It still uses a bit in each following byte to allow re-synchronizing the code point sequence, so is a bit of a hybrid.

The ones using continuation bits always require lots of bit fiddling, even when the values are so large that optimizing is just wasteful.
The ones using length prefixes don't optimize for small values.

## The Encoding Format

There are three forms: we'll call them "short", "medium" and "long".
The most significant bits of the first byte determine the form:

```
Short:  0vvv vvvv
        11vv vvvv
Medium: 100n nsvv vvvv...
Long:   101N Nlll llll... svvv...
```

where _v_ is a value bit, _n_ and _l_ are value length bits, and _N_ is a length-of-length bit.
_s_ is a sign bit, which is only present for integer types.

We use big-endian to preserve the natural order of things.
Little-endian is great for casting integer sizes during computations, but for communication, the most significant value is normally written first.
(Well, except in DNS domain names, of course.)

The value bits are mostly straight forward.
In the medium form, we have room for the top two value bits in the first byte, and the sign bit.
We use two's complement signed values for integers, allowing removing leading zeros and ones as appropriate.

In the medium form, the _n_ is the log<sub>2</sub> of the number of value bytes that follow:

* `00`: 1 byte
* `01`: 2 bytes
* `10`: 4 bytes
* `11`: 8 bytes

This is only useful for bit-aligned values like integers and bit sets.
For byte-aligned values, being limited to small power-of-two sizes is a bit awkward, and we don't generally use the medium form for byte sequences.
(If we do, the initial three _svv_ bits are zero, and reserved for future use.)

In the long form, the _N_ is a modified log<sub>2</sub> of the number of length bytes that follow:

* `00`: 1 length byte
* `01`: 2 length bytes
* `10`: **0 length bytes**
* `11`: 8 length bytes

This modification allows us to encode short byte sequences (up to 8 bytes) with a single-byte overhead.
The somewhat awkward position of the zero makes it easy compute the length from _N_ using a bit shift and bitwise-AND.
If the _length_ of the value requires 4 bytes to describe (i.e. the value is larger than 2<sup>3+2*8</sup> bytes long), the overhead of the leading bytes is so small anyway, that we might just skip 4.
But at the smaller end, allowing zero length for short strings is useful.

Examples of the three forms (requires JavaScript):

<div class="highlight">
  <pre id="examples"></pre>
</div>

<div class="live-example">
  <h3 style="margin-top: 0">Live Example</h3>

  <noscript>
    There is a live a example here if you enable JavaScript.
  </noscript>

  <label for="valueinput">JavaScript Expression:</label>
  <input id="valueinput" placeholder="'Hello' or 0.5 or 42n or true" value="'Hello world'">

  <pre id="encodedoutput"></pre>

  <pre id="decodedoutput"></pre>
</div>

### Properties

* The same encoding can be used for small and large data.
  The starting point is a length encoded value, and we add optimizations for small values.
* Small integers in the range [-63, +128], are encoded as single bytes.
* ASCII strings of length 1 are encoded as single bytes.
* Best-case small value overhead is zero.
  Worst-case small value overhead is one byte, i.e. 100%.
* Medium-sized integers up to 2<sup>64</sup> can be expressed with at most one byte overhead.
  For a 64-bit number, the overhead is 13%.
* Large integers up to 2<sup>3*2<sup>67</sup></sup> (a.k.a. enough) can be expressed.
* The empty string takes one byte (`101 00 000`<sub>2</sub>.)
  This could also be used as a NULL-value for bit-aligned data types.
* Since we have three bits to use in the first byte, even when we have following bytes, we can afford to always use a sign bit without blowing up unsigned integers.
* Decoding the length of the value takes 1-3 steps, scaling with the size of the data:
  1. Check the three initial bits.
     If not 10x<sub>2</sub>, then it's a simple literal.
     (Always.)
  1. If 101<sub>2</sub>, then check the following two bits, and _l_ bytes.
     (For values larger than 2<sup>67</sup>.)
  1. If 100<sub>2</sub>, then check the next two bits.
     (For values larger than 127.)

### Floating Point Numbers

The approach commonly taken today is to use IEEE 754 to copy values directly from memory onto the wire.
E.g. [Protocol Buffers](https://protobuf.dev/programming-guides/encoding/#non-varints) and [WebAssembly](https://webassembly.github.io/spec/core/binary/values.html#floating-point) do that, while using variable-length encoding of integers.
Ideally, an encoding format would be able to express round values in shorter form, just like we do with small integers.

The [binary32 encoding](https://en.wikipedia.org/wiki/Single-precision_floating-point_format#IEEE_754_standard:_binary32) stores floating points as

* 1 bit sign
* 8 bits base-2 exponent (where 0 and 0xFF have non-obvious, special, meaning)
* 23 bits fraction (absolute value of the significand without the leading 1)

The biggest differences to integers are that floating point numbers consist of three parts and significand values have left-aligned bits, while integers are right-aligned.
This is because the significand is always normalized to start with an implicit 1, and the other bits are fractional.
Arguably, the sign bit belongs to the significand, so perhaps we can see this as two parts.

Regardless of the parts, we can simply reinterpret the float32 (in this case) as a uint32, and attempt to encode that.
As our integer representation assumes zeros on the left can be removed, we have to do something to be able to cut off zeros on the right instead.
We have three choices: cut off trailing zeros, byte-swap so the trailing zeros become leading zeros, or reverse all bits.

One argument in favor of keeping the exponent to the left (i.e. not byte-swapping) is that the exponent's value is well-known for common values.
The exponent in binary32 is encoded as [excess-127](https://en.wikipedia.org/wiki/Offset_binary#Excess-127), which means it is normally hovering around 127, translating to zero.
This works surprisingly well (in terms of coding size) with our encoding due to two things:

1. the right-shift due to the sign bit means the exponent range in the first byte is really [0, 63], and
2. even if the sign bit is set, as long as the second bit is set (exponent is >=0), it triggers the 11<sub>2</sub> case, which is efficient.

Byte-swapping also doesn't reverse bits, so we'd likely have extra zero (upper) bits that can't be compressed away.
Reversing at the bit level would help, but is an uncommon operation, and is sure to mess with the exponent's nice property mentioned above.
So we rule out byte-swapping and bit reversing.

Let's look closer at cutting off trailing zeros.
If we simply count trailing zeros, and shift them away, we need to carry how many zeros were removed somehow.
Otherwise, we can't decode the value unambiguously.
The most significant bit can be either zero or one, so it doesn't help.
We could add a "start" bit and decoding could shift left until that first bit goes away.
Or we could add a bit counter.
(If our encoded _n_ and _l_ counted bits instead of bytes, that would solve it, but since _n_ is in log<sub>2</sub> to be compact, the granularity wouldn't be enough.)

As an aside, JavaScript is gifted with a [Count Leading Zeros](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/clz32), but no Count Trailing Zeros function!
C++ has [`countr_zero`](https://en.cppreference.com/w/cpp/numeric/countr_zero) and GCC has [`__builtin_ctz`](https://gcc.gnu.org/onlinedocs/gcc/Other-Builtins.html).
Even WebAssembly [supports both](https://webassembly.github.io/spec/core/text/instructions.html#numeric-instructions).
Modern CPUs can do both efficiently.

A more enticing option is to somehow infer the size from the encoded value.
We can accomplish this by the integer decoder telling the floating point number decoder how many value bits it saw.
As long as the trailing bit removal is aligned to bytes, while taking the three bits in the initial byte into account for the medium form, that is enough to be able to shift left.
One way is by having an option in the integer decoder to left-align the output to the nearest byte boundary.
That would make our encoded leading zeros into trailing zeros again, by the right amount, without having to pass meta information about the input encoding.

We can over-engineer this encoding by splitting the exponent and significand.
As the appendix shows, it makes things worse, as we now have two integer overheads.

## Should You Use This Encoding?

While at Google, I was told the servers spend a significant portion of processing power parsing Protocol Buffer messages.
Much of that time is probably due to the varint-encoding, and the byte counting.
Would it have been better to use simple [XDR](https://en.wikipedia.org/wiki/External_Data_Representation) with generic compression?
It would have allowed for relatively simple hardware offloading of compression.
And it's certainly where we are moving to today.
Google has created [FlatBuffers](https://flatbuffers.dev/) in this vein, though it had by no means replaced Protocol Buffers internally in 2021.

Most protocols defined today do what low-level protocols like IP and USB have always been doing:
use a schema with fixed-length integers, like XDR.
E.g. MessagePack, Cap'n Proto, TLS.

The [TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446.html#section-3) presentation language is actually very nice, and you should probably be using that for describing data structures.
It's expressive, but not as cumbersome as ASN.1.
The encoding follows clearly from the presentation language.
There's even [eTPL: An Enhanced Version of the TLS Presentation Language Suitable for Automated Parser Generation](https://ivesk.hs-offenburg.de/fileadmin/Einrichtungen/ivesk/files/preprint_eTPL_IDAACS-2017.pdf) which discusses a few shortcomings, and includes a [prototype code generator for C++](https://github.com/phantax/etpl-tool).

Adding generic compression on top of that makes sense.
[Cap'n Proto suggests](https://capnproto.org/encoding.html#compression) using LZ4 (for speed), or zlib (for size).

## Bottom Line

If you can't use fixed-length integers and a generic compression algorithm, but still want small wire transfers, and a generic parser, perhaps the presented encoding is useful.
You can use the same length-value encoding for data type tags, integers, big integers, octet sequences, floating point numbers, bit sets, tuples and more.
If the value is small, the length can be compressed or even omitted.

## Appendix: Splitting Floating Point Numbers

The sign really belongs with the significand, but exponent and significand are just two signed integers of 8 bits and 24 bits.
So we can encode them as such (keeping the exponent first for good measure.)

For the exponent, if it is within [-64 and +127], it can be encoded as a single byte.
The special values 0 and 0xFF, which are used for values close to zero, infinity and NaN, fall into this category.

The significand (with the moved sign bit at the top) is just another integer.
If trailing zeros can be removed, they are not part of the encoding.
Note that binary32 doesn't use two's complement for the significand:
there's simply a sign bit and the absolute fraction.

This means that

* the value zero is encoded as `00 00`<sub>16</sub>, i.e. two bytes,
* the value 1 is encoded as `01 00`<sub>16</sub>,
* infinity becomes `FF 00`<sub>16</sub>,
* -infinity becomes `FF 80`<sub>16</sub>,
* qNaN becomes `FF 81`<sub>16</sub>, and
* sNaN becomes `FF 01`<sub>16</sub>.

This assumes that 01<sub>2</sub> is our special prefix instead of 10<sub>2</sub>.
-infinity would otherwise take three bytes.
The drawback of this modification is that not all ASCII characters fit in [0, 63].
I.e. the string "0" (ASCII 48) would occupy one byte, but "A" (ASCII 65) would require two.

The NaN cases are special.
Since only the first and last bits are used, we've compressed them into a single significand byte.

Encodings of other values depend on how many leading zeros can be removed from the exponent, and trailing zeros from the significand.
In general, since decimal and binary fractions don't line up, you will incur a two byte overhead on top of the four or eight bytes normally used.
However, if your input is often integers, with perhaps the odd 0.5 at the end, and you want to support double precision, this can save some bytes.
E.g. the value 100.5 is encoded as three bytes, regardless of the IEEE 754 representation.
Integers up to 1,023 fit in two bytes.

The complexity this adds, and the overhead of always having to encode two separate integers makes this unappealing.

<script type="module">
import main from '/assets/2024-06-26-small-encoding-main.js';

main();
</script>

<style>
#encodedoutput {
  white-space: pre-wrap;
}
</style>
