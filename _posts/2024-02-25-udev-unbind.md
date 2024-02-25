---
title: Automatically Unbinding a Linux Kernel USB Device Driver With UDev
categories: [linux, kernel, usb, udev, webusb]
---

For an upcoming project, I'm implementing a [USB Test and Measurement Class](https://www.usb.org/document-library/test-measurement-class-specification) device.
To avoid having to build apps for desktop and mobile, I'm starting with a web app using [WebUSB](https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API).

However, since I'm trying to be a nice citizen by using an existing class rather than going directly for a vendor-specific class, I'm immediately punished:
the Linux `usbtmc` device driver is loaded automatically, and attempting to access the interface with WebUSB [fails with `NetworkError`](https://wicg.github.io/webusb/#dom-usbdevice-claiminterface), per the specification.

This udev rule makes `usbtmc` unbind itself from any interface on any Raspberry Pi RP2040 device:

```
DRIVER=="usbtmc", ACTION=="add", \
    ATTRS{idVendor}=="2e8a", ATTRS{idProduct}=="000a", \
    RUN+="/bin/sh -c 'echo -n %k >%S%p/driver/unbind'"
```

I've opened [webusb#246](https://github.com/WICG/webusb/issues/246) to ask how eager `USBDevice.claimInterface` should be to succeed.
Should it try to unbind the kernel driver or not?
