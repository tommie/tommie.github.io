---
title: Making a bootable Windows 11 Installer USB stick from Linux
categories: [windows, linux, ubuntu, usb]
---

I recently repaired a bricked Lenovo L470.
Probably a case of a firmware upgrade gone wrong, causing the EC chip to not run.
My default is to install Ubuntu, but there's a Windows 10 Pro license key sticker on it, so I guess I should use that.

You can download Windows 11 from Microsoft, but it's an ISO file, which UEFI won't boot from.

I tried using [`geteltorrito`](https://manpages.ubuntu.com/manpages/bionic/man1/geteltorito.1.html) the way I did to convert the Lenovo firmware updater ISO file to a USB disk image.
However, that gave me a 4 kiB file, not 5.9 GiB, which seemed very wrong.

With UEFI, we should be able to just create a FAT file system and copy the files, right?
Except the Windows 11 installer contains a 4.9 GiB file, larger than even FAT32's limit of 4 GiB.

There is a [Creating a Windows 11 Install USB in 2022](https://gist.github.com/vgmoose/4e74aca92787e79661defc16960a10f3) gist by @vgmoose that does the above, but uses wimtools to split the large file.
This seems a bit silly, even if it looked straight forward.

The [exFAT file system](https://en.wikipedia.org/wiki/ExFAT) from 2006 can actually handle large files, but from what I've read, no UEFI firmware actually supports booting from them.

## The Rufus Project

The [Rufus](https://rufus.ie/] project has a solution.
It's a Windows program to create bootable USB sticks, but they've implemented an EFI shim to boot from NTFS-formatted partitions.
And the [UEFI:NTFS](https://github.com/pbatard/uefi-ntfs) shim can be used without the Rufus program.

## The Solution

Assuming your USB stick device is `/dev/sdX`.
You have to use `sudo` in front of most commands here unless you're operating as user root.

1. Download the [Windows 11 ISO](https://www.microsoft.com/en-us/software-download/windows11) from Microsoft.
1. Verify the download integrity using `sha256sum` and compare the checksums with what's on the download page.
1. Download the [NTFS EFI shim](https://github.com/pbatard/rufus/blob/master/res/uefi/uefi-ntfs.img) from Rufus.
1. Use `cfdisk /dev/sdX` or similar partitioning tool to create a GPT partition table (use `cfdisk --zero /dev/sdX` to start with an empty partition table).
1. Add a "Microsoft Basic Data" partition that spans all but 2 MiB of the USB stick.
1. Add an "EFI System" partition at the end.
   At least 2 MiB.
   I'd go with 100 MiB.
1. Create an NTFS file system using `mkfs.ntfs --fast --label WIN11 /dev/sdX1`.
1. Write the EFI shim using `dd if=Downloads/uefi-ntfs.img of=/dev/sdX2 bs=64K`.
1. Re-read the partition table using `hdparm -z /dev/sdX`.
1. Mount the WIN11 partition and the Windows 11 ISO file.
1. Copy all the files from the ISO to the WIN11 partition.
1. Eject the USB stick and you're good to go.
