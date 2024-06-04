---
title: WebAssembly Memory Limits
categories: [rant, wasm, webassembly, rp2040]
---

I thought it would be nice to use WebAssembly as a sequencing language for a project running on an RP2040.
It's like a [BusPirate](https://buspirate.com/), but for higher voltages.

The [wasm3](https://github.com/wasm3/wasm3) seems to be the smallest C-based library.
It appears unmaintained, though.
Or at least very reduced in attention.
Recently, bots started adding auto-generated fuzz-test issues.
It doesn't look good.
There are [some](https://github.com/wasm3/wasm3/pull/490) [bad](https://github.com/wasm3/wasm3/pull/489) issues.

They've implemented instruction sequencing as tail-call recursion, which isn't great if you build in debug mode, with TCO disabled.

The [Wasmi](https://github.com/wasmi-labs/wasmi) project is built in Rust, but [#1009](https://github.com/wasmi-labs/wasmi/pull/1009) contains a beginning to C-bindings.
That would be nice.
And Rust being Rust, I expect fewer memory corruption issues.

Another drawback of wasm3 is the lack of re-entrant functions.
It simply calls FFI functions and blocks, like any other C function.
Wasmi supports resumable calls at the FFI boundary, which is similar to the [js-promise-integration](https://github.com/WebAssembly/js-promise-integration/blob/main/proposals/js-promise-integration/Overview.md) that adds support for `Promise` for imported JavaScript functions.
This would allow me to run event-based code with a main loop.

## 64 KiB Is Enough For Everyone

I got as far as to start writing [JTAG TAP](https://en.wikipedia.org/wiki/JTAG) messages, where I needed a memory buffer.
And there I'm stuck now.
It turns out that WebAssembly defines "memories" in terms of page sizes, not bytes.
A page is [fixed at 64 KiB](https://webassembly.github.io/spec/core/exec/runtime.html#page-size).
The RP2040 has 260 KiB, and after loading the main program into RAM, it's down to 120 KiB (at least before optimizations.)
I can't afford 64 KiB, and I only need 10 bytes for this test.

The [memory limits](https://webassembly.github.io/spec/core/binary/types.html#binary-limits) in a module are stored as 32-bit unsigned integers, the same size as pointers in WebAssembly.
Thus, even if memory limits were specified in bytes, instead of page size, there would have been no impact on addressable space.

I'm sitting here amazed at how _this_ could be the thing that makes WebAssembly infeasible for a microcontroller project.
Not that binary modules are difficult to parse, or that the stack-based execution model is difficult to process.
Not even that it's difficult to make a sensible FFI.
No, that someone decided that 64 KiB is the smallest unit to be able to allocate.

So, I guess I'll have to resort to [MicroPython](https://micropython.org/) or something.
I was hoping to have a VM with static typing and no garbage collector.

## WebAssembly Propsal

[Issue 1512](https://github.com/WebAssembly/design/issues/1512) is a proposal for configurable page size.

In March, it was moved to a [proposal repository](https://github.com/WebAssembly/custom-page-sizes/blob/main/proposals/custom-page-sizes/Overview.md), so this is looking promising.

It simply defines that the page size can be specified in the WASM module file.
Currently soft-limited to either 1 byte or (the old default) 64 KiB, which is fine with me!

Hoping this lands soon.
