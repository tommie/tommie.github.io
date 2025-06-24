---
title: Claude Being Technically Correct
---

Today I've been researching the best way to connect small sensors to the cloud in 2025.
Zigbee, Thread, Matter, 433 MHz, WiFi, BLE.
Lots of choices.
I've been using Claude to give me summaries of the protocols and their differences.
A standing instruction is to use Go, Typescript or Python to give interface descriptions instead of trying to explain them in text.

This is technically correct Typescript, but I think it's a somewhat weird way to present this explanation on how to pair devices across brands:

> ## Pairing Process
> If the software version of your IKEA smart lighting products is 1.2.x or later, you can connect them directly to a Philips Hue Bridge How to use TRÅDFRI smart lighting - IKEA UK:
>
> ```ts
// Pairing sequence for Trådfri devices on Hue Bridge
interface TradfriOnHuePairing {
  step1: "Reset Trådfri device (4 quick button presses)";
  step2: "Wait 10 seconds for reset";
  step3: "Put Hue Bridge in pairing mode";
  step4: "Device should appear as generic Zigbee device";
}
```

From now on, all my numbered lists will be Typescript-compatible if you say you know Typescript.
