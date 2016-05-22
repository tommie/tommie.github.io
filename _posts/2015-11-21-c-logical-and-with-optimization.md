---
title: C Logical-And With Optimization
categories: [programming, valgrind, xppaut]
---
I have been working on refactoring a software called
[XPPAUT](http://www.math.pitt.edu/~bard/xpp/xpp.html) for a while
now. Whenever I run it with Valgrind, there is a warning about a
conditional based on an uninitialized value. It has been working well
anyway, and it is in a part of the code I have not refactored yet, so I
have been ignoring it. Today, I got tired of seeing this noise, so
took the time to fix it. What I found was surprising, to say the
least.

Running Valgrind and opening the `ode/doubpend.ode` sample file, I
see

    Conditional jump or move depends on uninitialised value(s)
       at 0x42A6AA: do_new_parser (form_ode.c:1337)
       by 0x42C250: get_eqn (form_ode.c:360)
       by 0x42C63C: form_ode_load (form_ode.c:145)
       by 0x4049CA: main (main.c:178)

during start. The offending line is
[`src/form_ode.c:1337`](https://github.com/tommie/xppaut/blob/603ca3f4fd89250d830b377d6e39c8d48c7dbfb2/src/form_ode.c#L1337),
and I note it is a rather boring pair of lines:

{% highlight c++ %}
if (v.type == COMMAND && v.lhs[0] == 'S' && v.lhs[1] == 'P' &&
    v.lhs[5] == 'A') {
{% endhighlight %}

But, it does indeed seem to be a conditional worthy of our
attention. Note the array indices, jumping from 1 to 5 suddenly. That
cannot be good. Add a `printf` and notice there is no statement that
starts in `SP`. In fact, the warning is emitted when
[`lhs` is `PAR`](https://github.com/tommie/xppaut/blob/603ca3f4fd89250d830b377d6e39c8d48c7dbfb2/ode/doubpend.ode#L8). So,
why is the program looking at index 1 when not even the first
character is right? Have I been wrong about logical-and
[short-circuit evaluation](https://en.wikipedia.org/wiki/Short-circuit_evaluation)
this whole time?

Looking through the Internet, I find the
[C99 specification](http://www.open-std.org/jtc1/sc22/wg14/www/docs/n1256.pdf),
which also happens to be linked from the Wikipedia article on
short-circuit evaluation. Section 6.5.13, paragraph 4, talks about the
logical-and operator:

> Unlike the bitwise binary `&` operator, the `&&` operator guarantees
> left-to-right evaluation; there is a sequence point after the
> evaluation of the first operand. If the first operand compares equal
> to 0, the second operand is not evaluated.

This all sounds excellent, but certainly does not help our search. At
least now I know my understanding of C is not to blame in this
case. Next step is a disassembly of the portion around this line:

{% highlight console %}
$ objdump -Sl src/form_ode.o | less
{% endhighlight %}

And everything becomes obvious, because the result reaching my eyes is:

{% highlight c-objdump %}
/* take care of special form for special */

if (v.type == COMMAND && v.lhs[0] == 'S' && v.lhs[1] == 'P' &&
57b0: 48 ba ff ff 00 00 00  movabs $0xff000000ffff,%rdx
57b7: ff 00 00
57ba: 48 23 94 24 a0 21 00  and    0x21a0(%rsp),%rdx
57c1: 00
57c2: 48 b9 53 50 00 00 00  movabs $0x410000005053,%rcx
57c9: 41 00 00
57cc: 48 39 ca              cmp    %rcx,%rdx
57cf: 0f 84 3b 0e 00 00     je     6610 <do_new_parser+0x1e70>
/.../src/form_ode.c:1347 (discriminator 1)
{% endhighlight %}

Apparently, `gcc -std=c99 -O2` (GCC 5.2.0) has transformed the
if-statement into

{% highlight c++ %}
if (v.type == COMMAND && (*(int *)v.lhs & 0xFF000000FFFFl) ==
    ('A' << 40) | ('P' << 8) | 'S'))
{% endhighlight %}

which the specification clearly says is not an equivalent form. The
first term has probably been optimized away from here since multiple
if-statements use it. Compiling with GCC 4.8.3 on another x86-64
machine seems to cause three `cmpb` instructions to be output, so I
wonder if this is new behavior in GCC 5.

In the end, this is likely benign. The address looks properly
aligned. Note this is on a 64-bit machine, so it is even unlikely to
cause a page-fault. Especially with the string located on the
stack. It seems equivalent in terms of processing results, but means I
will need to create a Valgrind supressions file for bad-ass GCC
optimizations.
