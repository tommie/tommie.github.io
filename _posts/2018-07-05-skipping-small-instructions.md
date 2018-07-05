---
title: Skipping a small instruction when generating machine code
categories: [programming, assembly, hcs08, hc08]
---

I just saw a cool optimization by a C compiler. This is assembly for
the [Freescale HCS08 series](https://www.nxp.com/docs/en/reference-manual/HCS08RMV1.pdf).

```asm
	TST	var
	BEQ	loc_52
	CLRA
	CPHX	#$a601
loc_52:
	STA	var
```

One thing sticks out: the seemingly unused result of the `CPHX`
(status flags are overwritten later in the code, before any
conditionals). And after fixing my custom HCS08 disassembler, I
noticed `loc_52` is actually in the middle of the `CPHX`
instruction. I double checked the instruction decoding, instruction
lengths, branch offsets. All looked good. But that 0xA601 immediate
value is interesting. Decoded, it would mean `LDA #1`, which makes
sense here, since it's about to be stored in `var`. But no, the `CLRA`
and `CPHX` machine codes are correct...

Fast forward an hour or two, and it dawned on me how clever this
is. This code inverts a boolean flag. So in C, it would be

```c
if (var) var = 0;
else var = 1;
```

The straight-forward assembly code translation of this would be

```asm
	TST	var
	BEQ	loc_53
	CLRA
	BRA	loc_55
loc_53:
	LDA	#1
loc_55:
	STA	var
```

Imagine we go the `CLRA` execution path. Then we want to skip the
`LDA` instruction. HC08 doesn't have a conditional skip or conditional
load. But what if we could make the `LDA` instruction not doing
anything? E.g. by turning it into a comparison operation instead of a
load. That means one byte overhead instead of the branche's two. Saved
a byte, in every `!a` expression.

So `CPHX` is used for two-byte instructions. I don't think HC08 has
instructions with three bytes arguments, so the trick wouldn't work
for longer instructions. In the code I'm reverse engineering, I
haven't found any one-byte instructions being disabled using the same
technique.

Cute.
