---
title: Installing Windows 7 with Intel SRT SSD caching on a Gigabyte GA-Z170N-WiFi
categories: [computer, windows, isrt, z170]
---
I got a new gaming computer since the video card on my old one died
and it was time to do a full upgrade. This turned out to be an effort
spread across several weekends and four re-installations of
Windows. It's finally set up the way I want it. Here is a short build log.

Requirements
------------

* The machine must be small. Mini-ITX or so.
* Good video card, but not necessarily the best.
* Freesync-compatible, since G-sync is more expensive and not based on
  open standards.
* SSD as systems storage. HDD for games and documents. In my last
  computer, I filled up the system SSD fairly quickly with programs I
  rarely used, so the newest (most played) games were on the secondary
  HDD. so I want to install everything to the HDD and use the Intel
  Smart Response Technology (iSRT) to cache on the SSD.
* Windows is installed on the SSD proper so it can write the pagefile
  and do "idle stuff" without touching the HDD.

Components
----------

[PCPartPicker part list](http://uk.pcpartpicker.com/p/ZZ4XmG)

Type|Item
:----|:----
**CPU** | [Intel Core i5-6500 3.2GHz Quad-Core Processor](http://uk.pcpartpicker.com/part/intel-cpu-bx80662i56500)
**CPU Cooler** | [Silverstone AR06 40.2 CFM CPU Cooler](http://uk.pcpartpicker.com/part/silverstone-cpu-cooler-ar06)
**Motherboard** | [Gigabyte GA-Z170N-WIFI Mini ITX LGA1151 Motherboard](http://uk.pcpartpicker.com/part/gigabyte-motherboard-gaz170nwifi)
**Memory** | [Kingston HyperX Fury Black 16GB (2 x 8GB) DDR4-2133 Memory](http://uk.pcpartpicker.com/part/kingston-memory-hx421c14fbk216)
**Storage** | [Samsung 850 EVO-Series 500GB 2.5" Solid State Drive](http://uk.pcpartpicker.com/part/samsung-internal-hard-drive-mz75e500bam)
**Video Card** | [Sapphire Radeon R9 390 8GB Nitro Video Card](http://uk.pcpartpicker.com/part/sapphire-video-card-100382ntoc2l)
**Case** | [Silverstone ML08B HTPC Case](http://uk.pcpartpicker.com/part/silverstone-case-sstml08b)
**Power Supply** | [Corsair SF 600W 80+ Gold Certified Fully-Modular SFX Power Supply](http://uk.pcpartpicker.com/part/corsair-power-supply-cp9020105na)
**Optical Drive** | [LG GS40N DVD/CD Writer](http://uk.pcpartpicker.com/part/lg-optical-drive-gs40n)

I still haven't bought the DVD writer since Amazon UK refused to sell me one.

Fitting the hardware
--------------------

The case is really small, light and seems to have good build
quality. The side panel sheets are thin, but the case is meant to be
transported often, so this makes sense. While the PSU is modular, I
needed almost all cables installed anyway. The cables are annoyingly
in the form of thick ribbons, and just the motherboard power supply
cabling makes the interior look like a mess.

The video card is too thick to use the supplied upper clamp in the
back position, so I had to skip that. It could have fitted in the
front position, had Sapphire placed their PSU connector 5 mm forward.

The docking sled for the SSD is a nice, but fairly pointless touch. I
will remove one of the sleds and place my 1 TB 3.5" HDD there instead.

Firmware setup
--------------

Since I have a 500 GB SSD and a 1 TB HDD, I don't want to waste the
SSD on just using 64 GB of it for the iSRT cache (which is the
maximum). This means I want to set up caching and then install the
system on the remaining part of it. Unfortunately, the firmware setup
doesn't support setting up SSD caching. This must be done in
Windows. Also, the SATA controller must be switched to RAID mode (but
not yet).

I'm not doing any overclocking, but under M.I.T, PC Health Status I
changed the CPU fan speed control to Silent.

I enabled Fast boot, and realized the hard way that Ultra-fast boot
can render you unable to start the computer if it's in SATA RAID mode:
firmware doesn't initialize either the USB or PS/2 keyboard in
Ultra-fast mode. If Windows crashes, there is no way to control the
Windows boot menu, and it boots into safe mode by default, which
cannot read the disks, and thus there is no good way to get out of
this. My solution when this happened was to remove all bootable disks,
which causes firmware to go into setup instead, with enabled keyboard
drivers. Why safe mode doesn't load the SATA drivers properly is
beyond me.

Since I dislike the old BIOS boot process, I disable all legacy
support and rely exclusively on UEFI. This caused no issues.

Some other options:

* Enabled Intel Platform trust technology
* Enabled VT-d
* Disabled internal graphics
* Disabled the annoyingly bright yellow Audio LED
* Set Power on by keyboard to Any key
* Enabled all Platform power management options

For audio, I found out (again; the hard way) that enabling the DSP
causes the Realtek drivers to fail to find the device.

Installing Windows 7
--------------------

If I try to boot from my Windows 7 installation disc in RAID mode, it
doesn't find any hard drives. So, no go.

If I install in AHCI mode, I can't easily switch to RAID mode. I tried
this, and Windows keeps BSOD:ing on boot, even when following the
[how-to on overclock.net](http://www.overclock.net/t/1227636/how-to-change-sata-modes-after-windows-installation).
It is possible this is because the device-to-driver mapping is not present, which
[this post](http://superuser.com/questions/300035/how-can-i-install-an-amd-raid-driver-after-windows-installation)
tries to resolve.

What I ended up doing was installing Windows to the HDD using my
installation disc in AHCI mode, then creating a bootable USB stick
with the Intel SATA drivers added. This is straight-forward once you
know how:

1. Get an ISO image of a Windows installation disc. I had a physical
   disc and used
   [LC ISO Creator](http://www.softpedia.com/get/CD-DVD-Tools/CD-DVD-Rip-Other-Tools/LC-ISO-Creator.shtml).
   A program that does one thing, and does it well.
2. Use [Rufus](https://rufus.akeo.ie/) to make a bootable USB stick
   from the ISO. Again, I used GPT since I dislike the old IBM PC
   cruft, but it shouldn't matter. At first I tried to just copy the
   files from the DVD to the USB stick, but this for some reason
   didn't seem to work (despite UEFI boot mode).
3. Use `dism` (which seems to come standard with Windows 7) to
   [add drivers](https://technet.microsoft.com/en-ie/library/hh825070.aspx#AddDriverDISM).
   The drivers come from the Gigabyte driver CD in `F:`. Add all
   drivers from the `boot` directory. My USB stick is `D:` here:

   ```console
   md %TEMP%\wim

   dism /Mount-Image /ImageFile:D:\sources\boot.wim /Index:1 /MountDir:%TEMP%\wim
   dism /Image:%TEMP%\wim /Add-Driver /Driver:F:\boot /Recurse
   dism /Unmount-Image /MountDir:%TEMP%\wim /Commit

   dism /Mount-Image /ImageFile:D:\sources\boot.wim /Index:2 /MountDir:%TEMP%\wim
   dism /Image:%TEMP%\wim /Add-Driver /Driver:F:\boot /Recurse
   dism /Unmount-Image /MountDir:%TEMP%\wim /Commit

   dism /Mount-Image /ImageFile:D:\sources\install.wim /Index:2 /MountDir:%TEMP%\wim
   dism /Image:%TEMP%\wim /Add-Driver /Driver:F:\boot /Recurse
   dism /Unmount-Image /MountDir:%TEMP%\wim /Commit
   ```

   Note that you want to add it to all images in `boot.wim`, and at
   least to the image you are going to install in `install.wim`. In my case, running

   ```console
   dism /Get-ImageInfo /ImageFile:D:\sources\boot.wim
   ```

   shows two images, hence the indices above. Doing the same for
   `install.wim` showed that my edition of Windows 7 had index 2.
4. Reboot and change the SATA controller to RAID mode.
5. Boot from the USB stick and install Windows.

Since firmware setup cannot set up SSD caching, I have an interesting
problem. I need to set this up before installing, but I need to
install before I can set it up. I did this the hard way, first
installing Windows on the hard drive, installing all drivers and then
enabled iSRT. Yes, this was installation number two. Then I did the
entire installation again, this time installing to the SSD. However,
the
[guide on using the SSD for OS installation at overclock.net](http://www.overclock.net/t/1404323/guide-using-1-ssd-as-system-drive-os-and-acceleration-drive-raid-smart-response-technology-ssd-caching)
is something I would try next time. Funnily enough, the firmware setup
recognizes the drive as cache, but cannot create it.

So, all-in-all, I needed three installations of Windows to get the
machine set up the way I wanted. One of them (the USB stick creation)
could have been avoided if I had had another Windows computer
available. (I actually installed it four times because I screwed up
once.)

Once started, I read that
[changing `C:\Users` to point to the HDD is bad](http://www.zdnet.com/article/dont-move-your-windows-user-profiles-folder-to-another-drive/),
so instead I just relocated my `Documents` and `Downloaded`
directories to the HDD. I also set up Steam to use the HDD by default
for installations.

Windows Update is stuck
----------------------

I realized after all this that Windows update was stuck in searching
for updates. This turned out to be
[a known issue](https://support.microsoft.com/en-us/kb/3102810) and
after installing the KB3102810 fix, it downloaded 239 updates and
eventually gave me the option to upgrade to Windows 10.
