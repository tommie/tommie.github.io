---
title: Setting Up USB Device Pass-Through on Android Emulator on Linux
categories: [android, avd, emulator, linux, usb]
---

If you are trying to get a USB device to work with your Android app, it can be useful to be able to do it in an emulator.
In my case, my intended tablet can't provide enough current, so until I have a USB hub (or even Y-cable,) I could use my desktop's USB port instead.
Or so I thought.
Trying to get it up and running took a few hours of reading.
Here is a short history of what I tried, and a step-by-step at the end.

The app is based on Flutter and [`usb_serial`](https://pub.dev/packages/usb_serial).
I was running a virtual device (AVD) using API level 34 (UpsideDownCake), with Google APIs, the "recommended" image, on Ubuntu 22.04/x86_64.

----

The basics are in the official [Emulator USB passthrough integration guide](https://source.android.com/docs/automotive/start/passthrough).
The [`studio.emu.params` environment variable](https://stackoverflow.com/questions/39397056/how-to-pass-command-line-options-to-the-emulator-in-android-studio) doesn't work, because it [splits on comma](https://android.googlesource.com/platform/tools/adt/idea/+/b2b3cb609db5ee7ac715e6f76492aab1af255673/android/src/com/android/tools/idea/avdmanager/AvdManagerConnection.java#617) and joins with space, thereby ruining the `-device` parameters the guide suggests using.

I created a wrapper [script](https://gist.github.com/tommie/336e908a95ded68037d5b99985d3f275) to add parameters to the emulator command line.
No luck, though.
And sadly, it seems the emulator looks for the script in only one location, ignoring `PATH`, so you have to keep overwriting it after upgrades.
*Sigh*.
My app was still showing no signs of seeing the USB device.
And `adb logcat` showed no sign of USB activity.

It turns out there is also a [`-usb-passthrough`](https://stackoverflow.com/a/66965350) option to the emulator, so I don't have to use the low-level QEMU parameters.
This didn't help, but is a nicer interface.
It also uses comma, so the script is still needed.

There is a description about using a [custom USB device](https://gist.github.com/Alabate/200f021e644baed84993dd6109811ba2) in a Gist by [Alabate](https://github.com/Alabate).
It explains how to run a custom kernel, but the interesting piece is the `/system/etc/permissions` file.
Trying to run `adb root` failed with

    adbd cannot run as root in production builds

Searching for a debug build of the AVD image yielded nothing.
However, [this answer](https://stackoverflow.com/a/53860893) says the Google Play API images are really the "production builds" they are talking about.
So I downloaded the Default Android System Image variant of UpsideDownCake and made the permission file changes.
I couldn't get the `adb remount` command to do anything useful, so did a manual remount.

Finally, my app picked up the USB device!

## Summary

1. Install a [script](https://gist.github.com/tommie/336e908a95ded68037d5b99985d3f275) that allows you to add emulator command line parameters.
1. Set parameters `-usb-passthrough vendorid=0x1234,productid=0x5678 -writable-system`, for whatever vendor and product IDs are.
   E.g. using the `AVDX_EMU_PARAMS` environment variable the script will read from.
1. Start Android Studio, ensuring it has the environment variable.
1. Start an AVD with a Default Android System Image.
1. Run
   ```
   adb root
   adb shell
   ```
1. In adb: run
   ```
   mount -o remount,rw /system
   echo '<permissions><feature name="android.hardware.usb.host"/></permissions>' > /system/etc/permissions/android.hardware.usb.host.xml
   reboot
   ```

Your USB device intent filters should now work.
The permissions are persistent, so you only need to do this once.
However, you'll always need the `-usb-passthrough` command line option.
