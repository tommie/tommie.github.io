---
title: Upgrading the NVMe SSD In My Ubuntu 21.10 Laptop (EFI, LVM, LUKS)
categories: [ssd, nvme, ubuntu, dd, cryptsetup, lvm, luks]
---

I've had far too many close encounters recently... I don't like living
in the danger zone. Ubuntu saying "generating initramfs...", and `df
-h /` is slowly ticking down below 100 MiB available. All you can do
is sit there with the fingers on Ctrl-C, but hope for the best. It's
silly that it takes 1 GiB of free space just to create the initramfs
for a kernel upgrade. (Most of the time seems to be spent in zstd
compression, so I guess the end product is nicely space-efficient.)

My measly 250 GiB SSD is no longer enough. And so I once again was
surprised over how cheap storage has become. It's a nice surprise,
when you only engage in component scouring every five years or so. CHF
100 for a 1 TiB Samsung 970 EVO Plus seemed like a no-brainer, but I
don't think I need the 2 TiB. Plus, I get to upgrade from the SATA
that came with my laptop to PCI-E, which is awesome.

My setup is as follows:

* System: Lenovo ThinkPad T460s
* Storage: M.2 NVMe B+M, using a SATA card of 250 GiB
* OS: Ubuntu 21.10, upgraded annually from 18.10, it's probably an old
  partition layout.
* Block devices (GPT partition labels)
  * **sda1**: EFI partition
  * **sda2**: Linux boot partition
  * **sda3**: LUKS encrypted partition
    * **ubuntu-vg**: LVM volume group
      * **root**: LVM logical volume; the root file system
      * **data**: LVM logical volume; a separate `/home` (and other) file system
      * **swap_1**: LVM logical volume; unused swap space
* USB-to-NVMe adapter: one capable of accessing both the new PCI-E (B)
  and old SATA (B+M key) devices. From AliExpress, costed CHF 13. I
  don't understand how western stores can charge 2--10x for something
  so standard.

I was hoping to do the upgrade without installing Ubuntu from scratch,
since it's always annoying to restore settings and installed
packages. Here's what I did instead, taking around an hour to complete
(including one screw-up where I had to swap the original disk back.)

## Prepare the New Disk

1. Connect the new disk over USB. This is now called `/dev/sdb`.
1. Partition it like the old one, with `cfdisk` in my case. I made
   sure partitions were at least as big as previously, since it allows
   resizing file systems while the system is up and running.
1. Copy the `sda1` and `sda2` partitions using
   [`dd`](https://www.man7.org/linux/man-pages/man1/dd.1.html). These
   are not usually written to, so I feel they're safe to copy even
   while mounted. You can `mount -o remount,ro /boot` (and
   `/boot/EFI`) if you feel scared about unflushed file system
   buffers.
   * `dd bs=128M if=/dev/sda1 of=/dev/sdb1 status=progress`
   * `dd bs=128M if=/dev/sda2 of=/dev/sdb2 status=progress`
1. Encrypt the root partition `sdb3`
   * `cryptsetup luksFormat /dev/sdb3`
1. Open it. Ubuntu calls my opened root partition `sda3_crypt`, but
   the name here isn't persisted, so fall it whatever you want.
   * `cryptsetup open /dev/sdb3 sdb3_crypt`
1. Now replicate the LVM setup of the old disk.
   1. `pvcreate /dev/mapper/sda3_crypt`
   1. `vgcreate ubuntu-vg-new /dev/mapper/sda3_crypt` The VG name
      shouldn't collide with anything existing, so I appended `-new`
      to my existing VG. We'll rename it later.
   1. `lvcreate -L 50g ubuntu-vg-new root`
   1. `lvcreate -L 1g ubuntu-vg-new swap_1`
   1. `lvcreate -L -l 100%FREE ubuntu-vg-new data`
   1. `sync`, to be safe.

Power off, and replace the old disk with the new. You should be able
to boot to the initramfs, at which point it won't find the LUKS device
and gives you a shell. Don't connect the old disk over USB, or it may
boot from there instead of staying in initramfs. The nice thing about
staying here is that there's no writing going on to either of the
disks.

## Copying the Rest

1. Connect the old disk over USB. Mine is called `sda` (as it was
   before,) because my new disk is called `nvme0n1`.
1. Open both LUKS devices
   1. `cryptsetup open /dev/sda3 sda3_crypt`
   1. `cryptsetup open /dev/nvme0n1p3 nvme0n1_crypt`
1. Copy the file systems with `dd`. I use `dd` to preserve the UUIDs,
   which means I won't have to update `/etc/fstab` later. Since I
   won't have the old and new device connected to the same computer,
   I'm fine with that. Note that Busybox's `dd` doesn't support `status=`, and can't take a unit in `bs=`.
   * `dd bs=128000000 if=/dev/mapper/ubuntu--vg-root of=/dev/mapper/ubuntu--vg--new-root`
   * `dd bs=128000000 if=/dev/mapper/ubuntu--vg-data of=/dev/mapper/ubuntu--vg--new-data`
1. Initialize the new swap space, though I don't use it.
   * `mkswap /dev/mapper/ubuntu--vg--new-swap_1`
1. Close the old device.
   * `dmsetup remove /dev/mapper/ubuntu--vg-root`
   * `dmsetup remove /dev/mapper/ubuntu--vg-data`
   * `cryptsetup close sda3_crypt`
1. Disconnect the old device from USB.
1. Rename the new LVM volume group to match the old one.
   * `lvm vgrename ubuntu-vg-new ubuntu-vg`
1. Close the new device.
   * `dmsetup remove /dev/mapper/ubuntu--vg--new-root`
   * `dmsetup remove /dev/mapper/ubuntu--vg--new-data`
   * `cryptsetup close nvme0n1_crypt`
1. Replace the UUID of the new LUKS device with the old one, so that
   the initramfs can find the device. The alternative to this is
   running `update-grub`, but I think this is easier. Again, having
   dupliate UUIDs are bad if you ever connect the same disks to the
   same computer again.
   * `blkid /dev/sda3` to note the UUID of the old LUKS device. This
     should have `TYPE="crypto_LUKS"` and a `UUID=...`. Ignore the
     `PARTUUID`.
   * `cryptsetup luksUUID --uuid=$theolduuid /dev/nvme0n1p3`, where
     you have to type in the UUID manually, or write a script to
     extract it from the above.
1. `sync` is always a good idea when dealing with raw devices.

Now reboot the system. You should be able to use it as normal. At
least; I was, at this stage.

It somewhat depends on what your Grub configuration, `/etc/crypttab`
and `/etc/fstab` says. In my case, `fstab` references file system
UUIDs, which we have cloned with `dd`. The Grub configuration used the
LUKS UUID, which we cloned manually. My `crypttab` also references the
LUKS UUID, and names the device `sda3_crypt` rather than the more
appropriate `nvme0n1p3_crypt`.

## Resize File Systems

1. I'm using Ext4 file systems for both root and data, and it supports
   resizing while mounted. The default is to enlarge to all available
   space.
   * `resize2fs /dev/mapper/ubuntu--vg-root`
   * `resize2fs /dev/mapper/ubuntu--vg-data`
1. Optionally update `/etc/crypttab` with a new name for the
   device. I'm not going to bother with this since LVM auto-detects
   its PVs without me having to reference them by device name.

## Thoughts

This mostly went according to plan. I was expecting to have to clone
more UUIDs, but it was fine. I also upgraded the RAM while I had the
machine open. Typing this on the laptop, it's nice to see 30 GiB free
on the root device, rather than the usual 1.5 GiB. Oh, and 650 GiB
free in `/home`, more than twice the previous total device size.

<img alt="A screenshot of my typing this post" src="/assets/2022-04-17-final.png" class="small">
