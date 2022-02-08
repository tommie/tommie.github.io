---
title: Reverse Engineering the Galaxy Buds Pro Configuration Protocol
categories: [reverse engineering, galaxy buds, python]
---

I purchased a pair of
[Galaxy Buds Pro](https://www.samsung.com/us/mobile/audio/headphones/galaxy-buds-pro-phantom-black-sm-r190nzkaxar/)
last week, and I'm met with some truly horrible distortions listening
to speech in a YouTube video. I assumed it was the noise cancelation,
so I just wanted to turn that off. Since the
[Bose headphones not-broken-noise-cancelation firmware update](https://www.theverge.com/2020/4/6/21209974/bose-qc35-qc35ii-noise-canceling-investigation-firmware),
and some reviews of a buggy
[Android app](https://play.google.com/store/apps/details?id=com.samsung.accessory.atticmgr),
I wasn't too keen on installing the Samsung app, and let it do a
firmware upgrade. Instead, I downloaded the APK and reverse engineered
it to build the
[tommie/pygalaxybuds Python library](https://github.com/tommie/pygalaxybuds)
to interact with the earbuds. It only supports Linux, since it uses
PyBluez.

Now I could disable noise cancelation using

```console
$ galaxybudsctl --address 01:23:45:67:89:ab --set-noise-cancelation off
SKU: SM-R190NZKAEUD, SM-R190NZKAEUD
Upated noise cancelation mode.
```

Well worth the Sunday it took to figure out the protocol, and the two
days after to create and package the library? Inspired by Carl's
[Do things, tell people](http://carl.flax.ie/dothingstellpeople.html)
post, I should become better at telling people about things I've done!

The following text is a summary of what I learned from this project.

## What are the Galaxy Buds Pro?

The Pros are the second latest generation of Galaxy Buds, and seemed
like the right choice for me. Buds 2 are newer, but from reviews, it
seemed Buds Pro were a better deal. I'm guessing the protocols are
very similar, since they were launched the same year.

## Playing with Ghidra

I took this opportunity to see if [Ghidra](https://ghidra-sre.org/)
could reverse engineer APKs. Last time I needed disassembly (a few
years ago) of an Android app, I had to use multiple tools, and the
unmaintained [jd-gui](http://java-decompiler.github.io/). I didn't
want to go through that again. That said, I haven't done much reverse
engineering since Ghidra was released, so this was pretty much the
first time I used it for real.

On first glance, Ghidra doesn't seem to handle Android apps very
well. Sure, it can disassemble and decompile, but it doesn't
reassemble class definitions and source files. I couldn't even find a
simple way to show what fields are in a class. That's weird.

I'm guessing the app is written in Kotlin as it includes a separate
DEX file with some standard library. And the decompiled code looks
wonky. Perhaps one of the optional Ghidra analyzers can fix the lack
of recognizing goto optimizations in if-else blocks... But it sure led
to some ugly Java code with the default settings. Since I was looking
at the protocol parser, a massive switch statement became nested ifs
and gotos.

My overall feeling in Ghidra (compared to IDAPro and jd-gui) is "I'm
lost." But, alas, I managed to find the information I needed.

## How does the protocol work?

The main class is
`com.samsung.accessory.hearablemgr.core.service.CoreService`. It
drives many of the subsystems, including the SPP/RFCOMM Bluetooth
connection. They use an
["insecure RFCOMM" socket](https://developer.android.com/reference/android/bluetooth/BluetoothDevice#createInsecureRfcommSocketToServiceRecord(java.util.UUID))
for communication. The protocol runs on top of RFCOMM with a simple
framing, CRC and message type. There are no request-response
identifiers, so one should be careful not to run multiple operations
simultaneously.

The basic frame consists of

* Start-of-frame marker, 0xFD.
* Flags and payload body length. Flags include "is response" and "is
  fragment". The length is capped to 0x400, and includes the message
  type and CRC.
* Message type (called message ID).
* CRC16 covering the message type and payload. This seems to be
  encoded in big-endian, unlike everything else, so they have to do a
  byte-swap to handle it.
* End-of-frame marker, 0xDD.

The parser skips over any data where the SOF, length and EOF don't
match up. It seems like a good, resilient, frame parser.

Message types seem to be fairly ad-hoc, and there are multiple styles
and revisions to them. The ExtendedStatusUpdated message is probably
the most complex. It starts with a `revision` byte, which dictates the
syntax of the rest of the message. They seem to have shoveled things
around over the revisions (my earbuds send revision 9,) and some
fields move depending on revision. This means you have to look fairly
carefully at the code that creates messages, and the code that
extracts fields from messages to understand how they are actually
used. There isn't a nice facade that switches from low-level to
high-level representation for use in the UI.

When the buds are in the case and the lid is closed, the Bluetooth
connection is reset. Conclusion: don't leave the lid open, or buds
out, if you want to preserve battery.

## Experimenting with Web Bluetooth

My first idea was to use
[Web Bluetooth API](https://webbluetoothcg.github.io/web-bluetooth/)
to create a self-contained HTML page to configure the earbuds. Sadly,
it turns out
[RFCOMM is out of scope](https://github.com/WebBluetoothCG/web-bluetooth/blob/main/charter.md#out-of-scope). Too
bad. Oh, well. I guess now I know how that API works, the next time I
have a GATT-compliant device to play with.

It would have been so nice to replace the app with a single HTML file,
though.

## Packaging the Python library

There was a recent post by Drew DeVault about
[Python: Please stop screwing over Linux distros](https://drewdevault.com/2021/11/16/Python-stop-screwing-distros-over.html)
that suggested packaging for Python is as horrible as ever. However,
after reading
[Packaging Python Projects](https://packaging.python.org/en/latest/tutorials/packaging-projects/),
it seems there's a clear official way of packaging nowadays. So that's
nice. That said, I wanted to spend as little time on this as
possible. It's quite possible no one will use this code anyway.

The only thing I didn't figure out is how to nicely run a
`console_script` from a source repositry. Since the new directory
structure places all Python code in `/src/`, I can't simply place a
Python file in `/` and import by package. I need to either add `src`
to `PYTHONPATH`, or need to pretend that `src` is a namespace
package. Same thing if I tried to run a module using `python -m`. It
would be nice if the `build` or `setuptools` modules had a way to run
it, like `npm` and clones allows you to run `scripts` with `npm run`.

## Coredumps from ears

I find it fascinating that there's protocol support for retrieving
coredumps. There's enough code in my earbuds that they need coredumps
to debug them. Amazing how many transistors are everywhere nowadays.
