---
title: Disabling TouchPad Buttons On A Lenovo ThinkPad P16s
category: [thinkpad, ubuntu, linux, touchpad, accessibility]
---

My wife got a new laptop recently, a ThinkPad P16s.
Like the previous computer, we run Xubuntu, with the idea that XFCE changes less than GNOME between releases.
So far, so good.
However, the ThinkPad has both a trackpoint, with buttons under the space bar, and a touchpad with built-in buttons on the lower side.
Since my wife often uses wrist supports, the pressure she puts on the touchpad is higher than normal wrists, causing undue clicking.
Disabling "touch tap" and scrolling is easy enough in Ubuntu, but disabling the buttons is harder.

## XInput

The easiest way to disable buttons for a single device is by clearing the button map with the [xinput](https://linux.die.net/man/1/xinput) command.

Finding the device:

```console
$ xinput list
⎡ Virtual core pointer                          id=2    [master pointer  (3)]
⎜   ↳ Virtual core XTEST pointer                id=4    [slave  pointer  (2)]
⎜   ↳ ELAN0688:00 04F3:320B Mouse               id=9    [slave  pointer  (2)]
⎜   ↳ ELAN0688:00 04F3:320B Touchpad            id=10   [slave  pointer  (2)]
⎜   ↳ TPPS/2 Elan TrackPoint                    id=12   [slave  pointer  (2)]
⎣ Virtual core keyboard                         id=3    [master keyboard (2)]
    ↳ Virtual core XTEST keyboard               id=5    [slave  keyboard (3)]
    ↳ Video Bus                                 id=6    [slave  keyboard (3)]
    ↳ Power Button                              id=7    [slave  keyboard (3)]
    ↳ Sleep Button                              id=8    [slave  keyboard (3)]
    ↳ AT Translated Set 2 keyboard              id=11   [slave  keyboard (3)]
    ↳ ThinkPad Extra Buttons                    id=13   [slave  keyboard (3)]
```

Then showing the current button mapping:

```console
$ xinput get-button-map 10
1 2 3 4 5 6 7
```

Seven buttons.
And here I thought it only had three.
The additional four are normally [used for scrolling](https://manpages.ubuntu.com/manpages/noble/en/man4/libinput.4.html#button%20mapping).
Since she only wants the touchpad to move the cursor, we can disable all of them by setting them to zero:

```console
$ xinput set-button-map 10 0 0 0 0 0 0 0
```

If you only want to disable the buttons, and leave scrolling:

```console
$ xinput set-button-map 10 0 0 0
```

Cool, that wasn't too hard.
Now let's make it a bit more user-friendly.

## Robustness

It's always good to think about the assumptions you make about the system while automating a process.
Here, there aren't too many moving parts, but let's talk about two possibilities.

First, I'm sure most devices use the seven buttons we saw here, but we might as well first get the button mapping, count the buttons and set as many zeros.
I've seen examples online of twelve buttons.
The limit is 32.

Second, I have no idea how stable the numerical ID is in xinput, and since it supports name, that is probably more robust:

```console
$ xinput get-button-map 'ELAN0688:00 04F3:320B Touchpad'
0 0 0 0 0 0 0
```

## User Interface

There is another possibility for setting the button mapping, and that's the libinput driver section in Xorg configuration:

```
Section "InputDevice"
  Identifier "devname"
  Driver "libinput"
  Option "Device"   "devpath"
  Option "ButtonMapping" "0 0 0 0 0 0 0"
EndSection
```

The drawback of this approach is that it's system-wide, and it doesn't help with changing the setting after boot.
Since it might be useful to change back-and-forth, it seems better to just run `xinput set-button-map` on login, and have a script that allows changing it.
The user script can store the latest configuration, and the login script can apply that same setting.

## Script

Here is the script, using the device name above as selector:

<figure markdown="1">
<figcaption markdown="1" class="filename">
/usr/local/bin/touchpad-buttons
</figcaption>
```bash
#!/bin/bash

TPBCONFIG="${TPBCONFIG:-$HOME/.config/touchpad-buttons}"

dev='ELAN0688:00 04F3:320B Touchpad'

set -euo pipefail

function repeat() {
    for i in $(seq $1); do
        echo $2
    done
}

function store() {
    if [ ! -r "$TPBCONFIG" ]; then
        echo "$(basename "$0"): creating $TPBCONFIG"
    fi
    echo "$1" >"$TPBCONFIG"
}

function control() {
    numbuttons=$(xinput get-button-map "$dev" | wc -w)

    case "${1:-}" in
    on|en*|1)
        xinput set-button-map "$dev" $(seq $numbuttons)
        store on
        ;;

    off|dis*|0)
        xinput set-button-map "$dev" $(repeat $numbuttons 0)
        store off
        ;;

    load)
        if [ -r "$TPBCONFIG" ]; then
            control "$(<$TPBCONFIG)"
        fi
        ;;

    control)
        if [ -z "${DISPLAY:-}" ]; then
            echo "$(basename "$0"): no Xorg running" >&2
            exit 1
        fi

        if type -p zenity >/dev/null; then
            if button=$(zenity --question \
                               --title 'TouchPad Buttons' \
                               --text 'Change the TouchPad buttons' \
                               --ok-label Enable \
                               --extra-button Disable \
                               --cancel-label Cancel); then
                control on
            else
                case "$button" in
                '')
                    ;;

                Disable)
                    control off
                    ;;

                *)
                    echo "$(basename "$0"): unknown response from zenity" >&2
                    return 1
                    ;;
                esac
            fi
        else
            xmessage \
                -buttons 'Disable,Enable' \
                -default Disable \
                -nearmouse \
                'Control TouchPad Buttons' \
                || action=$(($?-101))
            control $action
        fi
        ;;

    *)
            cat >&2 <<EOF
usage: $(basename "$0") {on|off|load|control}
EOF
            exit 1
        ;;
    esac
}

control "$@"
```
</figure>

- If you give it `on` or `off`, it will do that.
- If you give it `control`, it uses [Zenity](https://help.gnome.org/users/zenity/stable/) or [xmessage](https://manpages.ubuntu.com/manpages/xenial/man1/xmessage.1.html) to interactively ask the user.
- If you give it `load`, it will load the latest setting from `$TPBCONFIG`.

If neither Zenity nor xmessage is to your liking, [yad](https://github.com/v1cont/yad), [gxmessage](https://savannah.gnu.org/projects/gxmessage/), or [kdialog](https://develop.kde.org/docs/administration/kdialog/) might do it.
The Zenity programming interface is a bit ugly compared to `xmessage`, but the graphical interface is much nicer.

## Application Menu

That script requires a command line interface to run, which isn't very user friendly.
We can build an application file, which gets picked up by the desktop environment (XFCE in this case,) and placed in the menu.

The XDG desktop/application file format is pretty simple:

<figure markdown="1">
<figcaption markdown="1" class="filename">
/usr/local/share/applications/touchpad-buttons.desktop
</figcaption>
```ini
[Desktop Entry]
Name=TouchPad Buttons
Comment=Enable or Disable TouchPad Buttons
Exec=touchpad-buttons control
Type=Application
Terminal=false
Categories=Settings;DesktopSettings;
```
</figure>

After a logout+login, the _TouchPad Buttons_ should show up under Settings.

## Loading on Login

For running the script with the `load` parameter on login, we need an almost identical application file:

<figure markdown="1">
<figcaption markdown="1" class="filename">
/etc/xdg/autostart/touchpad-buttons.desktop
</figcaption>
```ini
[Desktop Entry]
Name=TouchPad Buttons
Comment=Load TouchPad Buttons Control State
Exec=touchpad-buttons load
Type=Application
Terminal=false
Categories=Settings;DesktopSettings;
```
</figure>

After a logout+login, you should be able to see it in your Session Settings, and potentially disable it, if you'd like.

In some forums, I've seen others having issues with the setting not being applied after suspend+resume, but that doesn't seem to be a problem with this solution.
