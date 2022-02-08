---
title: Making Docker and UFW play well together
categories: [sysadmin, devops, networking, debian, linux, docker, container, ufw, firewall, iptables, netfilter, xtables]
---

This week, I realized I wanted to gather metrics from `dockerd` into a
[Prometheus](https://prometheus.io/) instance running as a Docker
container. As luck has it, Docker [supports a Prometheus-compatible
HTTP server](https://docs.docker.com/config/daemon/prometheus/) since
a few years back. However, because the server has a public interface,
I didn't really want to make Docker listen to all
interfaces. Preferably, it would only be on the `docker0`
interface. The `--metrics-addr` flag doesn't support interface names,
of course, so that got me thinking it's time to set up a
firewall. While filing a [feature
request](https://github.com/moby/moby/issues/42816) to support a magic
hostname in ´--metrics-addr`, of course.

## Summary

UFW and Docker fight about IPTables rule ordering, and UFW
loses. Existing solutions use the `DOCKER-USER` chain to partially
work around the issue. My solution was to move all the UFW rules from
`FORWARD` to `DOCKER-USER` as a UFW post-processing step.

I had to give Docker Compose bride network interfaces nice names to
use in UFW.

## Choosing a Firewall Framework for Debian

I'm used to a simple `iptables-{save,restore}` setup from Gentoo, but
Debian doesn't come with any of this pre-installed, which suggests I
should do some research. At first, I found
[wiki/DebianFirewall](https://wiki.debian.org/DebianFirewall), which
just runs a shell script with iptables commands (and some
others). This would have been fine, except I didn't feel like meddling
with Systemd and "no sane defaults". Next was
[wiki/Firewalls](https://wiki.debian.org/Firewalls), which is *a few*
years old, but generally had useful information about the universe.

Looping back to Gentoo, the package
[`iptables-persistent`](https://packages.debian.org/iptables-persistent)
is listed as an alternative, but with Docker running, it's probably
not a great idea to just dump/restore. I need a more authoritative
configuration framework.

I looked at the 2017 popularity numbers, and noted

1. **UFW**, Ubuntu's default firewall tool.
2. **Shorewall**
3. **fwbuilder**, a GUI tool.
4. **Ferm**
5. **Firewalld**, RedHat's default firewall tool. Notably, this is the
   [only](https://github.com/moby/moby/tree/2b70006e3bfa492b8641ff443493983d832955f4/libnetwork/iptables)
   firewall framework that Docker
   [supports natively](https://docs.docker.com/network/iptables/#integration-with-firewalld). I
   think the benefit is limited. In the end, Docker still injects its
   own IPTables rules.
6. **FireHOL**
7. **AIF**, or arno-iptables-firewall.
8. Further down: **uruk**, which would fit the Gentoo way of giving
   [sh-script variable names a grammar](http://mdcc.cx/pub/uruk/uruk-latest/doc/rc).

I've used [Ferm](http://ferm.foo-projects.org/) previously, and didn't
really like it. Felt like a pointless contextual language for raw
iptables. FireHOL was a fresher take on this. It's just a shell-script
that allows contextual rules to avoid repeating yourself. In the end,
it's still a complex piece of software (conceptually far from
iptables), and I couldn't figure out if all
[Docker integration-related issues](https://github.com/firehol/firehol/issues/114)
had been resolved. Lastly, looking at
[the size of the default configuration of AIF](https://github.com/arno-iptables-firewall/aif/blob/master/etc/arno-iptables-firewall/firewall.conf)
made me click back pretty quickly. It's difficult to tell if you
promote sane defaults when I have to read through something like
that. Same thing with
[firewalld's documentation](https://firewalld.org/). It has a DBus
interface, which is probably why it's the only thing Docker supports
natively. (Plus, you know, RedHat-sponsored.)

This led me (back) to looking at UFW. It's the most popular, and the
[code is easily graspable](https://git.launchpad.net/ufw/tree/). One
of the reasons I originally kept looking was because of
[Docker issues](https://github.com/docker/for-linux/issues/777) (and
[moby/moby#4737](https://github.com/moby/moby/issues/4737)) with at
least [two](https://github.com/chaifeng/ufw-docker)
[fixes](https://p1ngouin.com/posts/how-to-manage-iptables-rules-with-ufw-and-docker)
available. More on this later. At least I could work with the code. It
doesn't add a lot of abstraction on top of iptables, and I can drop
down to adding custom rules if need be. It creates a ton of IPTables
chains, and many are empty. But that's a minor issue. In the end, the
selling points were:

1. **Uncomplicated** Firewall seems to be true. The code is relatively
   easy to understand. Mixing Python and sh perhaps isn't the nicest
   thing, but whatever.
2. It's widely used (and on Debian).
3. It adds just enough abstraction that I can feel it promotes sane
   defaults.
4. Multiple people have already started tackling the Docker issue.

## The Problems with Docker and IPTables Frameworks

So what are the issues with Docker and firewall frameworks? Docker is
a heavy user of the `FORWARD` IPTables chain. This is what drives
access to published ports, and isolation between Docker networks.

Here is an example with the Docker default bridge network, and a
Docker Compose bridge network:

```shell
$ iptables -nvL

Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target                    prot opt in              out              source               destination
    0     0 DOCKER-USER               all  --  *               *                0.0.0.0/0            0.0.0.0/0
    0     0 DOCKER-ISOLATION-STAGE-1  all  --  *               *                0.0.0.0/0            0.0.0.0/0
    0     0 ACCEPT                    all  --  *               docker0          0.0.0.0/0            0.0.0.0/0            ctstate RELATED,ESTABLISHED
    0     0 DOCKER                    all  --  *               docker0          0.0.0.0/0            0.0.0.0/0
    0     0 ACCEPT                    all  --  docker0         !docker0         0.0.0.0/0            0.0.0.0/0
    0     0 ACCEPT                    all  --  docker0         docker0          0.0.0.0/0            0.0.0.0/0
    0     0 ACCEPT                    all  --  *               br-36805a67e4f2  0.0.0.0/0            0.0.0.0/0            ctstate RELATED,ESTABLISHED
    0     0 DOCKER                    all  --  *               br-36805a67e4f2  0.0.0.0/0            0.0.0.0/0
    0     0 ACCEPT                    all  --  br-36805a67e4f2 !br-36805a67e4f2 0.0.0.0/0            0.0.0.0/0
    0     0 ACCEPT                    all  --  br-36805a67e4f2 br-36805a67e4f2  0.0.0.0/0            0.0.0.0/0

Chain DOCKER (3 references)
 pkts bytes target     prot opt in               out              source               destination
    0     0 ACCEPT     tcp  --  !br-36805a67e4f2 br-36805a67e4f2  0.0.0.0/0            172.18.0.2           tcp dpt:8081
    0     0 ACCEPT     tcp  --  !br-36805a67e4f2 br-36805a67e4f2  0.0.0.0/0            172.18.0.2           tcp dpt:8080

Chain DOCKER-ISOLATION-STAGE-1 (1 references)
[... irrelevant]

Chain DOCKER-ISOLATION-STAGE-2 (3 references)
[... irrelevant]

Chain DOCKER-USER (1 references)
 pkts bytes target     prot opt in     out     source               destination
    0     0 RETURN     all  --  *      *       0.0.0.0/0            0.0.0.0/0
```

What's the problem? If I enabled UFW now, it would add its rules to
`FORWARD` last, and thus Docker wouldn't be protected by UFW rules. As
long as you trust your Docker's published ports, that's fine. You can
see `DOCKER` containing explicit rules for the published ports. That's
a POLA (policy of least astonishment) violation, but not the end of
the world for my needs. But solving this inversion of control is now a
challenge, and it must be accepted.

What if UFW starts before Docker? Well, Docker does a
[prepend](https://github.com/moby/moby/blob/2b70006e3bfa492b8641ff443493983d832955f4/libnetwork/iptables/iptables.go#L651)
for the
[`DOCKER-ISOLATION-STAGE-1`](https://github.com/moby/moby/blob/2b70006e3bfa492b8641ff443493983d832955f4/libnetwork/drivers/bridge/setup_ip_tables.go#L192)
and
[`DOCKER-USER`](https://github.com/moby/moby/blob/2b70006e3bfa492b8641ff443493983d832955f4/libnetwork/firewall_linux.go#L42),
so at least it's probably consitently wrong...

### Docker Isolation Chains

The two chains above are there to ensure Docker networks are isolated
from each other. Together, for each network, they essentially say "if
this is routed to another interface, it must not be a Docker network
interface." The rules in `FORWARD` can then deal only with safe pairs
of networks, the way you'd normally split ingress/egress rules. Docker
allows anything out, but only published ports in from the
outside. This, combined with the UFW ordering issue, is a big no-no if
you want to enforce egress rules. Remember that Docker relies on the
`FORWARD` chain rather than `OUTPUT`.

## Previous Work

I mentioned above two proposed fixed. Let's also mention that you can
disable Docker's IPTables modifications with `--iptables=false`. I
wouldn't call that "integration". More like forced arbitration. Ugly,
and would probably bite my behind at some point.

I'll discuss two of the first solutions I found. Neither of them
support IPv6, but the generalization is trivial.

### chaifeng/ufw-docker

The [`chaifeng/ufw-docker`](https://github.com/chaifeng/ufw-docker)
repository has a great explanation of the background and rationale for
its existence. It also has links to previous discussions. The solution
proposed here is to inject the main UFW custom chain
(`ufw-user-forward`) into `DOCKER-USER`. `DOCKER-USER` is always added
first by Docker, exactly to allow user rules to override Docker's
rules. So this seems like a great plan. My one complaint is that it
hard-codes a bunch of IP-subnets for private networks, and some port
numbers. This means a host running on a private network, and running
on the Internet will be treated differently.

Another issue is that only the `ufw-user-forward` chain is linked
in. UFW has several other chains it uses to provide sane defaults, and
they're still left after the Docker rules. This means we can no longer
guarantee that UFW actually works. We're into whitebox territory:

```shell
$ iptables -nvL FORWARD
Chain FORWARD (policy DROP 0 packets, 0 bytes)
 pkts bytes target                     prot opt in      out      source               destination
    0     0 DOCKER-USER                all  --  *       *        0.0.0.0/0            0.0.0.0/0
    0     0 DOCKER-ISOLATION-STAGE-1   all  --  *       *        0.0.0.0/0            0.0.0.0/0
    0     0 ACCEPT                     all  --  *       docker0  0.0.0.0/0            0.0.0.0/0            ctstate RELATED,ESTABLISHED
    0     0 DOCKER                     all  --  *       docker0  0.0.0.0/0            0.0.0.0/0
    0     0 ACCEPT                     all  --  docker0 !docker0 0.0.0.0/0            0.0.0.0/0
    0     0 ACCEPT                     all  --  docker0 docker0  0.0.0.0/0            0.0.0.0/0
    0     0 ufw-before-logging-forward all  --  *       *        0.0.0.0/0            0.0.0.0/0
    0     0 ufw-before-forward         all  --  *       *        0.0.0.0/0            0.0.0.0/0
    0     0 ufw-after-forward          all  --  *       *        0.0.0.0/0            0.0.0.0/0
    0     0 ufw-after-logging-forward  all  --  *       *        0.0.0.0/0            0.0.0.0/0
    0     0 ufw-reject-forward         all  --  *       *        0.0.0.0/0            0.0.0.0/0
    0     0 ufw-track-forward          all  --  *       *        0.0.0.0/0            0.0.0.0/0

Chain DOCKER-USER (1 references)
 pkts bytes target                    prot opt in     out     source               destination
[... irrelevant]
 0     0 ufw-user-forward             all  --  *      *       0.0.0.0/0            0.0.0.0/0
[... irrelevant]
```

The `ufw-user-forward` is normally invoked from `ufw-before-forward`,
and that's being circumvented.  It also means we're potentially
invoking `ufw-user-forward` twice, which isn't really a problem with
UFW, but also not clean. This is problematic as we also want the
Docker isolation rules to take effect, especially for internal
traffic. Essentially, this battles wanting to say

    Docker-internal || (UFW && Docker) -> ACCEPT

where both UFW and Docker wants to do `ACCEPT` early without
conferring with the other. Instead, we end up with expressing

    User-UFW || Docker || UFW -> ACCEPT

Arguably, we don't want UFW to handle Docker-internal traffic, but
that's a matter of preference.

### p1ngouin

[This blog post](https://p1ngouin.com/posts/how-to-manage-iptables-rules-with-ufw-and-docker)
uses a similar approach, but only runs the rules for hardcoded,
external, interfaces. This has roughly the same problems as outlined
above, but also uses `ufw-user-input` instead of `ufw-user-forward`,
which the previous author talks about. It's a tradeoff between
correctness and risk of a user-misconfiguration, and this author made
a different call. The solution also touches more files, and is thus a
bit more complex.

If you add a new (real) interface, it won't be protected by UFW until
you remember to update the rules. This is a POLA violation, and a
security concern.

The one thing this solution does really wrong is the changes to
`before.init`. UFW itself is careful
[not to remove rules](https://git.launchpad.net/ufw/tree/src/ufw-init-functions#n95)
it's added to built-in chains. We (from the PoV of UFW) should now
consider `DOCKER-USER` a built-in chain, so flushing that without
requiring `$MANAGE_BUILTINS` feels wrong. Deleting `ufw-user-input` is
wrong for the same reason.

### Ferm

Ferm has the benefit of being lower-level than UFW, and
[this Lullabot post](https://www.lullabot.com/articles/convincing-docker-and-iptables-play-nicely)
explores that.

## Solution

UFW should be first, because that's what any sysadmin would
expect. Docker should be first, because UFW shouldn't limit what
happens within Docker, as any sysadmin would expect. (If Docker
containers are hostile against each other in a given network, they
shouldn't be on the same network. It's a controlled environment. Just
don't open ports you don't use...)

I can see two ways of using UFW, for ingress traffic:

1. **UFW allows** and it doesn't matter what ports Docker have
   published; UFW must explicitly allow.
2. **UFW denies** where it's enough for Docker to publish a port, but
   UFW may explicitly deny it.

In the first scenario, UFW user rules will have allow rules for each
externally available Docker port. In the second, it will normally be
empty, but may contain deny/reject rules for exceptions. I prefer (2)
here, because I have control over port publishing through Docker
Compose already. In a setting with protecting against mistakes, or
where security is more important than simplicity, I would prefer (1).

When it comes to egress traffic, Docker doesn't have a preference,
since it allows anything. In this case, either (1) or (2) makes sense,
depending on your security circumstances. So this ends up being the
same as for ingress traffic.

### Coming Up With a Merged Rule Ordering

Let's look more closely at what Docker and UFW do with IPTables, and
come up with sensible orderings for each scenario.

#### Docker

If we categorize what Docker creates according to dependency on UFW,
we might end up with

```bash
# Always first.
-A FORWARD -j DOCKER-USER

# Should override UFW.
-A FORWARD -j DOCKER-ISOLATION-STAGE-1
   -A DOCKER-ISOLATION-STAGE-1 -i docker0 ! -o docker0 -j DOCKER-ISOLATION-STAGE-2
   -A DOCKER-ISOLATION-STAGE-2 -o docker0 -j DROP

# Should maybe override UFW (if Docker publish is enough).
-A FORWARD -o docker0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A FORWARD -o docker0 -j DOCKER
   -A DOCKER -d 172.23.0.15/32 ! -i docker0 -o docker0 -p tcp -m tcp --dport 25 -j ACCEPT

-A FORWARD -i docker0 ! -o docker0 -j ACCEPT
-A FORWARD -i docker0 -o docker0 -j ACCEPT
```

There are three parts:

1. **Isolation**, which should override whatever UFW does, because
   it's essential to the contract Docker provides.
2. **Ingress routing**, which depends on your preference. Either (1)
   these shouldn't be allowed to match, or (2) they're okay.
3. **Egress routing**, which Docker for some reason splits into two
   cases. UFW has nothing similar to these, so either (1) UFW user
   rules must be added explicitly, or (2) we trust Docker.

One thing to note is that the jump to `DOCKER` is inserted once per
interface, but all rules in the `DOCKER` chain already matches on
interface. Docker could just insert it once. I was trying to figure
out if this was legacy from before there were multiple networks, but
GitHub repositories have been
[renamed](https://github.com/moby/moby/commit/9714bcac8737724433fe2bbf13a85b61df751a35),
and I wasn't able to follow it all the way.

#### UFW

And now for the UFW rules:

```bash
# Should not override Docker.
-A ufw-before-forward -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A ufw-before-forward -p icmp -m icmp --icmp-type 3 -j ACCEPT

# Should override Docker.
-A FORWARD -j ufw-*-forward
   -A ufw-before-forward -j ufw-user-forward
   -A ufw-user-forward -p tcp -m tcp --dport 22 -m comment --comment "\'dapp_SSH\'" -j ACCEPT
   -A ufw-user-forward -p tcp -m tcp --dport 25 -m comment --comment "\'dapp_SMTP\'" -j DROP

# Should not override Docker. Not used in default configuration, or by user rules, so dead code.
-A ufw-skip-to-policy-forward -j DROP
```

My appologies for the wonky order there, but it's to preserve order
while reducing the number of logical groups:

1. **Ingress established**, where I think it's okay for UFW to
   override Docker, *provided* that the network isolation is
   upheld. The ICMP rules only matter for external ingress, since
   egress would be allowed by Docker rules anyway. I think it's fine,
   since there'll likely not be any routing rules for unrelated ICMP
   messages anyway.
2. **Ingress new**, again depending on preferences. UFW *can* be
   overriding in scenario (1) and *must* be overriding in (2).
3. **Helper rules** that are unused. This pattern is used in the
   `INPUT` chain to essentially `RETURN` to the policy. The issue here
   is that we'd want to run Docker rules rather than just drop
   out. But since this isn't used, I won't bother.

### Making UFW Authoritative

So if we do some thinking, especially around network isolation, about
my preferred semantics, I think we arrive at

```bash
-A FORWARD -j DOCKER-USER
-A FORWARD -j DOCKER-ISOLATION-STAGE-1
-A FORWARD -o docker0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A FORWARD -o docker0 -j DOCKER
   -A DOCKER -d 172.23.0.15/32 ! -i docker0 -o docker0 -p tcp -m tcp --dport 25 -j ACCEPT
-A FORWARD -i docker0 ! -o docker0 -j ACCEPT
-A FORWARD -i docker0 -o docker0 -j ACCEPT

-A DOCKER-USER -j DOCKER-ISOLATION-STAGE-1
-A DOCKER-USER -j ufw-*-forward

-A ufw-before-forward -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A ufw-before-forward -p icmp -m icmp --icmp-type 3 -j ACCEPT
-A ufw-before-forward -j ufw-user-forward
   -A ufw-user-forward -p tcp -m tcp --dport 25 -m comment --comment "\'dapp_SMTP\'" -j DENY
```

Notice that the `FORWARD` chain is exacly like Docker does it. UFW
rules have been moved into `DOCKER-USER`, and we run the network
isolation drop rules first. We must allow UFW user deny rules before
Docker ingress-new rules:

```bash
{% include 2021-09-04-ufw-after-init.sh %}
```

And now we can do the example entry used above with

```shell
$ ufw route deny SMTP
```

to e.g. temporarily deny a Docker-published SMTP port.

#### Restricting Docker Published Ports

If you don't want Docker published ports to auto-allow, it's almost
the same, except we need to avoid the `-j DOCKER` rules matching:

```bash
-A FORWARD -j DOCKER-USER
-A FORWARD -j DOCKER-ISOLATION-STAGE-1
-A FORWARD -o docker0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A FORWARD -o docker0 -j DOCKER
   -A DOCKER -d 172.23.0.15/32 ! -i docker0 -o docker0 -p tcp -m tcp --dport 25 -j ACCEPT
-A FORWARD -i docker0 ! -o docker0 -j ACCEPT
-A FORWARD -i docker0 -o docker0 -j ACCEPT

-A DOCKER-USER -j DOCKER-ISOLATION-STAGE-1
-A DOCKER-USER -j ufw-*-forward

-A ufw-before-forward -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A ufw-before-forward -p icmp -m icmp --icmp-type 3 -j ACCEPT
-A ufw-before-forward -j ufw-user-forward
   -A ufw-user-forward -p tcp -m tcp --dport 25 -m comment --comment "\'dapp_SMTP\'" -j ACCEPT
   -A ufw-user-forward -i eth0 -j DROP
```

This last rule means none of the `-j DOCKER` rules will ever matter
for external traffic. Sadly, your UFW rules now need to know about all
external interfaces, which isn't nice. We could drop "non-Docker
interfaces", but that means UFW would be circumvented by adding a new
Docker network. Now we only have the risk when adding an external
interface, which isn't as likely to happen by accident.

Now we need e.g.

```shell
$ ufw route allow SMTP
$ ufw route deny in on eth0
```

to create our user rules.

### Docker (Compose) Bridge Network Interface Names

In case you need to reference Docker bridge networks, it might be
useful to make them easier on the eye. As we saw at the beginning, the
default Docker bridge network is called `docker0`. Docker Compose
creates a separate network for each project (directory), and they're
named like `br-36805a67e4f2` by default. (The hex string is the
abbreviated Docker network identifier, see `docker network ls`.)  This
isn't particularly nice to spread across configuration files. We need
a better API.

Luckily, Docker allows us to provide an interface name. In a Compose
file, this looks like

```yaml
networks:
  default:
    driver_opts:
       com.docker.network.bridge.name: "dockercompose_default"
```

You can of course rename interfaces for other networks too. And we end
up with

```shell
$ docker network ls
NETWORK ID     NAME                         DRIVER    SCOPE
36805a67e4f2   myproject_default            bridge    local
ccb7ac11e501   bridge                       bridge    local
0b1d3ac6b355   host                         host      local
ef53bdd559b0   none                         null      local
```

Note that we did nothing about the Docker network's name, so it's
prefixed by the project name here. You can change that with the `name`
option. The `36805a67e4f2` here is the one that uses interface
`docker0`.

### Egress Rules (Unsolved) {#egress-rules}

Because Docker runs behind NAT on a bridge interface, it only ever
uses the host's `FORWARD` chain, which means there are both ingress
and egress rules in the same chain.

I don't have any problem with the wildcard acceptance of output in my
case. Because UFW's abstraction on top of IPTables limited and
structured, I wouldn't use it with Docker if I wanted control over
both ingress and egress. It's possible, but the UFW grammar would be
confusing, not helping.

### UFW Reject and Drop

It should be noted how UFW treats "deny" (IPTables calls it "DROP")
and "reject" differently when it comes to rule ordering. For "reject",
it actually
[terminates chain processing early](https://git.launchpad.net/ufw/tree/src/ufw-init-functions#n256),
while for "drop", it relies on the chain policy. This makes life more
complicated when trying to make these softwares collaborate. Think
about what would happen if anything after `DOCKER-USER` is never
invoked: all of Docker egress would stop working.

If you do this, be sure to add your own egress rules for each Docker
interface in UFW.

### Monitoring

I also set up
[`iptables_exporter`](https://github.com/inscyt-ngreen/iptables_exporter/tree/v0.2.0/iptables)
(the one written in Go) to make rule metrics available in
Prometheus. I was staring a lot at the kernel log and IPTables
counters before finally changing the chain policies to `DROP`. I
figured I should make it more easily accessible.

![IPTables Rejections](/assets/2021-09-04-grafana-iptables-rejections.png)

![UFW User Rule Triggers](/assets/2021-09-04-grafana-ufw-user-rules.png)

This also allows me to monitor Fail2Ban rejections for free, which is
a cool bonus.

![Fail2Ban Traffic](/assets/2021-09-04-grafana-fail2ban-traffic.png)

This ended up being another can of worms opened, because I wanted it
running as non-root in a Docker container. Apparently, there's
`iptables-legacy-save` and `iptables-nft-save`. The old program
`iptables-save` is able to guess which one to use when run as root,
but when only having `CAP_NET?ADMIN`, it incorrectly picks legacy,
which shows up empty (aside from the built-in chains). Changed the
exporter to use the NFTables version directly. Plus, I needed to use
`setcap(8)` when building the image to allow non-root users to make
use of `--add-caps`. Would have been nice if `iptables-save` tried on
its own. This all took a few hours to figure out, but it's running
fine now. I hope I don't have to touch it again.

### Systemd

Finally, I noticed that `docker.service` comes `After` many firewall
frameworks, but `ufw.service` is missing. I used `systemctl edit
docker.service` to add it. It shouldn't really matter, but I like
determinism.

## Conclusions

Super-frustrating. I should have picked another solution. As always.

### My Preferred Docker IPTables Layout

```bash
-A FORWARD -j docker-forward

-A docker-forward -j docker-forward-user
-A docker-forward -j docker-isolation
   -A docker-isolation         -i docker0 ! -o docker0 -j docker-isolation-stage-2
   -A docker-isolation         -j RETURN
   -A docker-isolation-stage-2 -o docker0 -j DROP
   -A docker-isolation-stage-2 -j RETURN
-A docker-forward -j docker-ingress
   -A docker-ingress -d 172.23.0.15/32 -o docker0 -p tcp -m tcp --dport 25 -j ACCEPT
   -A docker-ingress -o docker0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
-A docker-forward -j docker-egress
   -A docker-egress -i docker0 -j ACCEPT
```

* Only ever add one rule to a built-in chain.
* Remove redundant rules. (Including the pointless `RETURN` from
  `DOCKER-USER`.
* Split rules into logical chains. This would allow us to go to Docker
  rules early from other frameworks. It's not always possible to
  return when you're deep into chains (like UFW does, for good or
  bad).
* Use lowercase chain names to simplify reading. Both UFW and Fail2Ban
  use lowercase, which helps distinguish them from built-ins.
* Provide an [IPSet](https://ipset.netfilter.org/ipset.man.html) with
  all the Docker-managed subnets, so it could be used to say "has to
  do with Docker" without having to reference interface names. Or add
  a (configurable) rule to `-j MARK` packets early.

### Other Suggestions for Upstream Projects

* UFW also to only add a single rule to each built-in chain.
* UFW chains should really be named the same across address
  families. It only adds code complexity that we have
  `ufw-user-forward` and `ufw6-user-forward`, respectively.
* UFW to make the distinction between reject and deny/drop more clear.
* UFW to prune empty chains.
* Docker (and Fail2Ban) to add `After = ufw.service` to the Systemd unit, just like they do for other firewall frameworks.
* Docker to support `--metrics-addr=host-gateway:9323`!
