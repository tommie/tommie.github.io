---
title: Google Chrome Breakpoint Trap on Ubuntu/Linux
categories: [xdg, x11, wayland, ubuntu, linux]
---

I haven't been able to run Google Chrome normally for a few days on my desktop computer (running Ubuntu 22.04.)
Any time I try to run it, it would just terminate with "Trace/breakpoint trap (core dumped)".
The error message coming before it seemed irrelevant, so it was basically just dying.
AFAIK, the APT repository for Google Chrome doesn't have a debug symbol package, so no luck there.

Today, I upgraded to Ubuntu 24.04, but the issue persisted.
Ok, time to spend a Saturday debugging Chrome, because it's annoying not having a synchronized browser.

I was using strace to try to find a syscall that failed, or something.
Suddenly, I managed to get it running!
This worked:

    sudo strace -u $LOGNAME -f google-chrome --user-data-dir=/tmp/chrome-testing

while the one I had been using up until that point didn't:

    strace -f google-chrome --user-data-dir=/tmp/chrome-testing

Chrome had been complaining about ptrace permissions this whole time, and I figured it was time to try it out.
However, cause and effect is not always what it seems.
Ptrace shouldn't affect whether Chrome opens a window, or crashes...

So what has really changed?
Looking at the strace output, I noticed the bad one had a much longer `PATH` (by the number of attempted `newfstatat(2)` calls failing to find the executable.)
Trying to prune my `PATH` didn't help.
So... what other environment variables does `sudo` reset...

I dumped my environment into a shell script, and started removing a few lines at a time.
Eventually, it came down to this line:

    XDG_DATA_DIRS=/usr/share/ubuntu:/usr/share/gnome:$HOME/snap/steam/common/.local/share::/usr/local/share/:/usr/share/:/var/lib/snapd/desktop

Looks fine, but wait there is a double-colon there.
And indeed, removing that "empty" item made Chrome start.

It was due to a sloppily authored `environment.d`:

    XDG_DATA_DIRS=$HOME/snap/steam/common/.local/share:${XDG_DATA_DIRS:+:$XDG_DATA_DIRS}

Probably my fault.
Whatever library failed to parse that could have issued a better error message, though.
