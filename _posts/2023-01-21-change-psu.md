---
title: Changing the Output Voltage of a Cheap Power Supply
categories: [electronics, smps, psu, voltage, diy]
---

Recently, I found myself wanting to hook up a Bluetooth beacon (a JDY-25M) to a cheap mains power supply module.
First time, it went well, and the beacon beaconed.
The second time, the thing blew up.
Voltage overshoot? Yepp.

It uses the [THX208](http://www.thx.com.cn/a/chanpinzhongxin/nenyuanzhixing5jinenxiao/50.html) SPMS chip and looks [like this](https://remont-aud.net/publ/stati/istochniki_pitanija/kitajskij_blok_pitanija_na_thx208/32-1-0-455) (credit to KARVAC on remont-aud.net):

![Cheap PSU](/assets/2023-01-21-change-psu-schematic.png)

The JDY-25M is rated for 1.9-3.6 V. While my Chinese power supply module is rated at 3.3 V, it overshoots to 4 V on startup.
Note that there is an LED always on, so there is always some load.
There are at least two solutions to this issue:

1. Add the U3 linear regulator after the module, to condition the voltage.
   A low-dropout (LDO) regulator will have little impact once the SMPS module is in steady-state, but will clamp the overshoot transient at start.
2. Lower the voltage of the module, so the overshoot isn't too high.

The first option requires adding another IC, and while my module actually has a footprint for one, I don't have a suitable regulator at hand.
It would certainly be the nicest way of solving the problem.

The second option just requires changing the voltage divider that sets the feedback voltage (R5 and R6).
That's much cheaper.
The problem now is figuring out which pair of resistors I should use.
The original circuit has 6.8 and 2.2 k&Omega; feeding the [TL431](https://www.st.com/resource/en/datasheet/tl431.pdf) reference pin, which in turn drives the optocoupler that feeds back to the mains voltage side.
The steady-state reference voltage is 2.5 V for the TL431, according to the datasheet.
To check, `2.5/(6.8/(2.2+6.8)) = 3.3`, fits the bill.

If we had a 0.7 V overshoot now, lowering the voltage will probably net us around the same again, so we need to lower this to at most 2.9 V.

But, if we just feed the output voltage directly, it will end up at 2.5 V, and overshoot to something like 3.2 V.
This is within the spec of the JDY-25M.
So just removing the resistor closest to ground is enough.

## Removing the Resistor

Doing that gives an output of 2.9 V, with overshoot up to 3.6 V.
That's 400 mV higher than what I had expected.
Good enough, but why?
There's a bit of a drop in R5, but that shouldn't be more than 10 mV.

The optocoupler has a forward voltage of 1.2 V.
Looking at figure 14 in the TL431 datasheet, V<sub>KA</sub> can leak below 2.5 V.
I'm guessing this is driving the TL431 too low, and it stops doing the right thing.
Playing nice, I should probably set the TL431 to 2.9 V output with a divider.

## Computing Resistors

More generally, the issue is finding two resistors in the standard E12 series that come close to a desired output voltage.
Aside from that, we also need to care about the total impedance.
A lower value will drive the TL431 reference input quicker, but will waste energy.
A value too high runs the risk of letting the TL431's input impedance interfere with our divider.
The datasheet suggests the impedance is over 600 k&Omega; (4 µA at 2.5 V).
10 k&Omega; is a common value to aim for, but isn't critical as long as it is much smaller than the 600 k&Omega;.

This is all fairly easy to compute with JavaScript:

{% include 2023-01-21-change-psu.html %}

<script type="module" src="/assets/2023-01-21-change-psu.js"></script>
