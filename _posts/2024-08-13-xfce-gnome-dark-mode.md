---
title: GNOME Applications Using Light Mode Under XFCE With Dark Mode
category: [gnome, xfce, linux, accessibility]
---

Your GNOME applications (e.g. Software Center) shows light, even though you've selected a dark theme in XFCE?

Me too.

Stock Xubuntu 24.04 had this issue for my wife.
She prefers the Software Center over Synaptic, because they don't show a confusingly long list of packages.

## Updates

* @smcv responded on the #1358 issue.
  Updated the suggested file name accordingly.
* I filed Ubuntu bug [2076999](https://bugs.launchpad.net/ubuntu/+source/xfce4-session/+bug/2076999).

## Summary

* Check the `color-scheme` key in GSettings.
* Add an `xfce-portals.conf` that forces the `gtk` implementation.
  * This file is installed by default with `xfce4-session` at 4.18.4 or newer, but Ubuntu 24.04 is at 4.18.3.
    Debian Testing is at 4.18.4.

<figure markdown="1">
<figcaption markdown="1" class="filename">
$HOME/.config/xdg-desktop-portal/xfce-portals.conf
</figcaption>
```ini
[preferred]
default=gtk;
```
</figure>

## GSettings

First, I checked the obvious things, the theme setting:

```console
$ gsettings list-recursively | grep theme
org.gnome.desktop.interface cursor-theme 'Adwaita'
org.gnome.desktop.interface gtk-key-theme 'Default'
org.gnome.desktop.interface gtk-theme 'Greybird-dark'
org.gnome.desktop.interface icon-theme 'ubuntu-mono-dark'
org.gnome.desktop.sound theme-name 'freedesktop'
org.gnome.desktop.wm.preferences theme 'Adwaita'
```

Adwaita is the default theme, and is light.
Changing them made no difference.
Seems the `gtk-theme` key is what matters.

Next, [(color) schemes](https://askubuntu.com/questions/1403585/ubuntu-22-04-dark-theme-from-command-line):

```console
$ gsettings list-recursively | grep scheme
org.gnome.desktop.interface color-scheme 'prefer-dark'
org.gnome.desktop.interface gtk-color-scheme ''
org.gnome.shell.ubuntu color-scheme 'prefer-dark'
```

The `gtk-color-scheme` is supposed to be a [list of colors](https://ubuntuforums.org/showthread.php?t=1952769), so that should probably be empty.
Everything also seems right.

## XDG Desktop Portal

Flatpak has introduced something called the Desktop Portal, which is an abstraction over different desktop environments, for package managers to use.
Among other things, you can read the color scheme from [settings](https://flatpak.github.io/xdg-desktop-portal/docs/doc-org.freedesktop.portal.Settings.html).
It turns out the newest GNOME UI library, libadwaita, [prefers to use this source](https://github.com/GNOME/libadwaita/blob/168574d0053a9fd551eebd23835318256558947b/src/adw-settings.c#L214) over gsettings.
Ok, so what's that doing?

The portal is split into a main process that is a proxy, deciding [which backend](https://github.com/flatpak/xdg-desktop-portal?tab=readme-ov-file#using-portals) to use.
We're interested in the GTK backend, since XFCE is GTK-based.

After some digging through StackOverflow and documentation:

```console
$ dbus-send --print-reply --session \
    --dest=org.freedesktop.portal.Desktop \
    /org/freedesktop/portal/desktop \
    org.freedesktop.portal.Settings.ReadAll \
    array:string:\*
Error org.freedesktop.DBus.Error.UnknownMethod: No such interface “org.freedesktop.portal.Settings” on object at path /org/freedesktop/portal/desktop
```

That can't be right.
I checked the log files.
I ran `/usr/libexec/xdg-desktop-portal -vr`.
Nothing stood out.

The GTK backend actually responds correctly:

```console
$ $ dbus-send --print-reply --session \
    --dest=org.freedesktop.impl.portal.desktop.gtk \
    /org/freedesktop/portal/desktop \
    org.freedesktop.impl.portal.Settings.ReadAll \
    array:string:\*
method return time=1723575573.316082 sender=:1.158 -> destination=:1.164 serial=51 reply_serial=2
...
```

So the problem is that the main process isn't talking to the GTK backend.

The configuration for the GTK backend actually says:

<figure markdown="1">
<figcaption markdown="1" class="filename">
/usr/share/xdg-desktop-portal/portals/gtk.portal
</figcaption>
```ini
[portal]
DBusName=org.freedesktop.impl.portal.desktop.gtk
Interfaces=org.freedesktop.impl.portal.FileChooser;org.freedesktop.impl.portal.AppChooser;org.freedesktop.impl.portal.Print;org.freedesktop.impl.portal.Notification;org.freedesktop.impl.portal.Inhibit;org.freedesktop.impl.portal.Access;org.freedesktop.impl.portal.Account;org.freedesktop.impl.portal.Email;org.freedesktop.impl.portal.DynamicLauncher;org.freedesktop.impl.portal.Lockdown;org.freedesktop.impl.portal.Settings;
UseIn=gnome
```
</figure>

Which suggests that it matches against the desktop name with the `UseIn` key.
Since we're on "XFCE", "gnome" isn't going to match.
Adding XFCE made no difference.

## Source Code Digging

After checking the `xdg-desktop-portal` [source code](https://github.com/flatpak/xdg-desktop-portal/blob/c8359eadb7248107ac9dd79c157c81f078234bc9/src/xdg-desktop-portal.c#L163), I noticed that "No skeleton to export" was logged once.
So that indicates there are no settings backends being picked up.
I already saw that the GTK backend was running, and that the main process was really finding that it supported `Settings`.
But the process never logs "Using gtk.portal for org.freedesktop.impl.portal.Settings (config)", and that really is the only way a `Settings` could be added...

As for the `UseIn`, it's not used for `Settings`, unlike all the other interfaces.
And [it's deprecated](https://github.com/flatpak/xdg-desktop-portal/blob/c8359eadb7248107ac9dd79c157c81f078234bc9/src/portal-impl.c#L635) anyway.

So I added the configuration listed above, logged out and in again, and now Software Center is dark!

## Discussion

If you search for [`portals.conf`](https://packages.ubuntu.com/search?suite=noble&arch=any&searchon=contents&keywords=portals.conf) on packages.ubuntu.com, it seems that desktop environments are supposed to have a file they define.
The `gnome-session-common` package contains a file with `default=gnome;gtk;`, which makes sense.
There doesn't seem to be any for XFCE.

I guess we could just install the `gnome-session-common` package.
But it adds a bunch of systemd service units for the session manager, with dangling command lines (the session manager isn't installed).

However, I don't really understand how this is supposed to work on machines where different users use different desktop environments.
This is just one global configuration.
The `UseIn` helps with multiple desktop environments, so why is that deprecated?

Why is settings initialized differently from all the other interfaces?
Well, there is [xdg-desktop-portal#1358](https://github.com/flatpak/xdg-desktop-portal/pull/1358) which would make it work the same.

### Update: GitHub #1358

@smcv [explained](https://github.com/flatpak/xdg-desktop-portal/pull/1358#issuecomment-2288489933) that the new backend `portals.conf` files actually are per-desktop environment, because the prefix (marked as asterisk in the synopsis) actually match against desktop name.
He filed Debian bug [#1050802](https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=1050802) for it a year ago.
And it is in `xfce4-session` [since version 4.18.4](https://gitlab.xfce.org/xfce/xfce4-session/-/tags/xfce4-session-4.18.4).
Unfortunately, Ubuntu's `xfce4-session` is [at 4.18.3](https://packages.ubuntu.com/noble/xfce4-session).
Unlucky, I guess.

Debian Testing (Trixie) has 4.18.4.
So I filed Ubuntu bug [2076999](https://bugs.launchpad.net/ubuntu/+source/xfce4-session/+bug/2076999) to ask for a backport or upgrade.

## Conclusion

This is why I'm on open source software.
I can solve issues.
Sure, it's sad I had to do it, but all software has bugs and compatibility issues, and I prefer being able to fix it right away.

Admittedly, I could have spent that hour (or two) in a different way.
But, sometimes, I rather like spending an hour solving a program mystery, as opposed to just watching a fake mystery being solved on the TV.
