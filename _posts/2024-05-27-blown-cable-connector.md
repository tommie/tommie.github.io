---
title: A Poorly Assembled Connector On A Cable
category: [electronics, cable, explosion, copper]
---

We were happily going to [slowUp in Ticino](https://slowup.ch/ticino/), an event where they close roads and let cyclists roam free.
It's a great idea, and they've been doing it since 2000!
At the hotel, though, I plugged in my laptop charger to the wall, and a loud explosion emanated from the charger brick.
And the entire room went dark.
With a burnt-electronics smell on the primary side of the charger.
Fuse box did nothing, probably something they have to reset in the reception.
A few moments later, we got the light back and the janitor checked the outlet.
Aight, no charging for me.

Back at home, I took the Lenovo charger apart and couldn't find anything wrong.
Everything looked absolutely fine and no skid marks.
A few months later, though, I tried using the same mains cable, and got nothing...
But why?
Measuring the resistance, the phase lead had intermittent connection.
If I pushed the probe hard towards the bottom, it had less than an ohm.
Otherwise, it was in the megaohms.
Time to dissect it, because it's screwed anyway!

The [IEC 60320 C5](https://en.wikipedia.org/wiki/IEC_60320) connector (usually called a clover connector,) was injection moulded around a hard plastic tip and connectors.

Slitting along the mould seam, and removing the tip, there is copper splatter on both sides:

<figure>
  <div style="text-align:center">
    <a href="/assets/2024-05-27-cable-1.jpg"><img width="60%" style="border-radius:6px; border:2px solid white; box-shadow:3px 3px 8px rgba(0,0,0,.35)" src="/assets/2024-05-27-cable-1.jpg"></a>
  </div>

  <figcaption style="font-style:italic; text-align:center">Copper splatter.</figcaption>
</figure>

If we run the knife all the way through the moulded plastic, we can see copper wires going from one side to the other:

<figure>
  <div style="text-align:center">
    <a href="/assets/2024-05-27-cable-2.jpg"><img width="60%" style="border-radius:6px; border:2px solid white; box-shadow:3px 3px 8px rgba(0,0,0,.35)" src="/assets/2024-05-27-cable-2.jpg"></a>
  </div>

  <figcaption style="font-style:italic; text-align:center">Between the poles is suspicious copper.</figcaption>
</figure>

Splitting it completely, we can see that the green ground wire comes in in the left hand side part, so the wires we see are simply a sharp turn going into the connector on the right hand part.
Note there doesn't seem to be any green sleeve around the ground wire strands!
(The blackness at the base of the contacts is just moulded plastic.)
It smells burnt, and there is black residue when poking around here:

<figure>
  <div style="text-align:center">
    <a href="/assets/2024-05-27-cable-split-1.jpg"><img width="60%" style="border-radius:6px; border:2px solid white; box-shadow:3px 3px 8px rgba(0,0,0,.35)" src="/assets/2024-05-27-cable-split-1.jpg"></a>
  </div>

  <figcaption style="font-style:italic; text-align:center">Cut-through view.</figcaption>
</figure>

And if we carefully carve out all the parts and show the connector from the back, we can see that the ground cable crimp connector seems half-full compared to the line and neutral:

<figure>
  <div style="text-align:center">
    <a href="/assets/2024-05-27-cable-top.jpg"><img width="60%" style="border-radius:6px; border:2px solid white; box-shadow:3px 3px 8px rgba(0,0,0,.35)" src="/assets/2024-05-27-cable-top.jpg"></a>
  </div>

  <figcaption style="font-style:italic; text-align:center">.</figcaption>
</figure>

## Conclusion

The ground cable was incorrectly assembled, it passed inspection and eventually blew up the wire strands with a bang.
Stands to reason that the GFCI tripped, not the fuse.
It's unclear if the ground wire was simply stripped too far, or if not all strands were seated in the crimp connection.

It makes me wonder how many cables are assembled this way, but the strands happen to point in the direction of the neutral line, or somewhere else.
And if this could happen with the line wire strands, could it poke out through the moulding?
There is 6 mm of bare wire, and they sit less than 6 mm into the moulding.
Perhaps they at least do some visual QC on the cables.

This also explains why poking at the bottom of the contact helped, since a small portion of the wire had evaporated, I was simply pushing the ends together.
