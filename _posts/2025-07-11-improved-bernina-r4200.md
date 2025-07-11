---
title: A Hack For The Bernina R4200 Motor Driver
categories: [electronics, repair, reverse engineering, pcb, sewing machine, hack]
---

In my [previous post](./2025-05-04-bernina-r4200.md) about the Bernina 1130 motor driver board R4200, I reverse engineered it and explained how it works, to the best of my knowledge.

<figure class="float-right clear-both">
  <a href="/assets/2025-05-04-bernina-r4200.svg"><img width="60%" style="border-radius:6px; border:2px solid white; box-shadow:3px 3px 8px rgba(0,0,0,.35)" src="/assets/2025-05-04-bernina-r4200.svg"></a>

  <figcaption style="font-style:italic; text-align:center">Schematic of the R4200 motor driver</figcaption>
</figure>

One thing has bothered me with the L4200 power supply (on which the R4200 sits):
the resistor R16 that draws 1.3 W when the sewing machine does nothing.
The whole machine draws about 20 W when idle, so this is about prolonging the life of components, rather than saving energy.

The problem is the idle level of the driver output is high, which keeps transistor T113 pulling current through the base drive transformer.
Since there are no voltage edges, the transformer actually does nothing, except waste some heat.

However, since there is a brake input and output, that gets deasserted while the motor is running, couldn't we use that to fix this?

## Modification

If we look at the brake signal, it comes to U2A, which draws the entire control signal low when the brake is on.
That is technically correct behavior for clamping the signal, but unfortunately the U1D predriver inverts this to a high level.
(As I hypothesized in the previous post, this driver was probably meant to drive a PNP transistor.)

What if we disconnect the U2A output and put it directly on OUTDRV instead?
Both U2 and U1 are open-collector outputs, so they won't short-circuit.
And while the brake is active, we get a zero-level output, which means T113 on the L4200 won't be on.

<figure class="float-right clear-both">
  <a href="/assets/2025-07-09-bernina-r4200-pcb-mod.jpg"><img width="60%" style="border-radius:6px; border:2px solid white; box-shadow:3px 3px 8px rgba(0,0,0,.35)" src="/assets/2025-07-09-bernina-r4200-pcb-mod.jpg"></a>

  <figcaption style="font-style:italic; text-align:center">Modified R4200 motor driver</figcaption>
</figure>

I added a little bit of PVC tape (not shown) under the pin to make sure it doesn't short to the old pad.
Testing this by lifting the U2A:2 leg and soldering a wire to J1:6 indeed shows the motor still works.
And after leaving it on for 10 min, the R16 and T113 components on the L4200 are still cool.

Be careful not to run the machine with U2A output disconnected, since that might turn on both brake and drive power transistors at the same time,
shorting the half H-bridge that drives the motor!
I think this is what killed my in-laws machine.
I hade to replace both drive transistors and the L125/L126 filter inductors.
All of them had blown.

It's possible that the spike caused by enabling the break will fire one last drive signal to T110 while the brake transistor T114 is also turning on.
That could be a potential issue.
Time will tell.
