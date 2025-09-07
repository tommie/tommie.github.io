---
title: Helical Spring Calculator Using Claude Code
categories: [tools, engineering, vue, bootstrap, mechanical]
---

I needed to calculate spring constants for compression springs I was buying from AliExpress, but the listings only show which material there is, and physical dimensions.
The [spring constant](https://en.wikipedia.org/wiki/Hooke%27s_law) requires running through some mechanical engineering formulas that I didn't want to calculate by hand every time.

This turned into my first addition to what will hopefully become a growing collection of useful engineering tools on this site: a [helical compression spring calculator](/tools/helical-spring.html).

<!--more-->

The approach of single-file HTML tools with CDN dependencies keeps them simple to maintain and share, while Vue provides enough interactivity for a good user experience.

Now when I'm browsing AliExpress spring listings, I can quickly plug in the dimensions and material to see if the spring will work for my application - and more importantly, how much force it will actually take to compress it the distance I need.

## AliExpress Spring Listings

AliExpress sellers typically provide:

- Material (304 stainless steel, or 65Mn)
- Wire diameter
- Outer diameter
- Free length

What they don't provide is the spring constant (_k_), which tells you how much force you need to compress the spring by a given amount.
For mechanical design work, that's usually what you actually need to know.

The relationship involves several formulas:

- Spring index _C = D/d_ (mean diameter over wire diameter)
- Spring constant _k = Gd⁴/(8D³N)_ where _G_ is the shear modulus
- Compression force _F = k × δ_ (deflection)

Rather than using some manufacturer datasheet I found on the web and calculate it manually, I decided to build a proper web tool.
It's a beautiful example of what Claude Code is great at.

## Implementation with Claude Code

I used Claude Code to quickly prototype this using Vue 3 and Bootstrap 5, both loaded from CDN.
The entire calculator is a single HTML file that can run standalone - no build process needed.

An excerpt of the prompts:

> Build an HTML page using Vue and Bootstrap from CDN that computes the compression force (and hence spring constant) for a helical compression spring given some material properties, length diameters and number of coils.

This gave a good starting point with correct computations and even listed the formulas (that match what I found in that datasheet.)

> Use a select box to use common materials: 304 stainless steel, 65Mn, EN 10270-1 (and other common spring materials).
> Separate material properties from mechanical properties.
> The material property fields are disabled unless \"Manual\" is selected.
> Show compression force as a range.
> Also list the compression forces in kg (and g is an input).

The formulas weren't being rendered very nicely, and there was "Whal factor" showing up, instead of the common `K`.
So I spent some time fixing the formula card:

> Render the formulas using a proper vertical fraction style. Whal's Factor should be named `K`.
> It should say "K = ..."
> Align the formulas vertically (i.e. even the equal sign is in its own column.)
> Don't right align the headers (and make the heading use th isntead of strong.)

I also noticed it had actually set `step="0.1"` for an integer:

> Number of Active Coils should have step=1

Now we're into polishing, and making it user friendly:

> Add a copyright footer.
> Add lightly tinted background colors to separate inputs from output cards.
> Add JS code to automatically set color mode based on `prefers-color-scheme`.

Claude Code has a tendency to not understand color value, especially in combination with opacity, so it had selected a too low an opacity.

> The tint is barely visible in dark mode.

It had originally created a form input for the Compression deflection, but we can easily compute a maximum value for that:

> Compute the compression deflection from d and N.

This didn't update the form input, but only added a hint under it.
It also turns out Claude Code made this far more complex than it had to be.
It took 75% of the actual maximum deflection, instead of just computing the most obvious maximum.
So I removed that manually.

And that gave me the first JS error:

> vue.global.js:2301 [Vue warn]: Template compilation error: Unnecessary value binding used alongside v-model. It will interfere with v-model's behavior.

Solved.
Now to make it actually compute the value:

> Auto-update delta unless the user has modified it manually. If the field is cleared, start auto-updating again.

For some reason, Claude Code decided to switch to manual mode both on input *and* on merely focusing the input.
This took some pursuation and fixing to make it happen:

> Remove the focus handler
> It doesn't reset when I clear the field
> input handler cannot unconditionally set it to true. the watch shouldn't be needed.

And a second error:

> Uncaught SyntaxError: Unexpected identifier 'handleDeflectionInput' (at spring-calculator.html:289:17)

## Writing a Blog Post

Of course, I also wanted to use Claude Code to generate this blog post:

> Write a blog post about tools/helical-spring.html.
> I needed it because AliExpress listings have material and dimensions, but not spring constants.
> I used Claude Code to code it up quickly using Vue and Bootstrap from CDN. This is the first tool I'm adding to the site, but will be starting a collection.

That gave a rough outline based on those instructions, the content guidelines I had in `CLAUDE.md`, and what the generated tool looked like.

After that, I went through and added the Claude Code prompts above, and removed some useless details.
Claude has a tendency to add useless details, and not be able to write rationales for the higher level stuff.
Not surprising.
It's akin to someone who is "dinner smart," i.e. has a really good memory for trivia facts, but is completely unable to use them to solve problems other than sounding smart.
And that's the reason the only people who use Claude straight-up to generate web content are the click farms, and why web search is now barely useful.

I don't find it worth iterating with Claude on this blog post, since its writing style is fine, if verbose.
So after the initial generation, I went into manual editing mode.

All-in-all, I think this required an hour.
Most of that time was spent writing this blog post.

## The Tool

Key features I implemented:

**Material Database**: Pre-loaded shear modulus values for common spring materials

**Smart Deflection Calculation**: The tool auto-calculates a maximum compression deflection, but allows manual override when you know the specific deflection you need.

The claimed "smart" here is Claude applauding my idea to auto-calculate the deflection.
Claude ended up writing here that it used 75% of the maximum, and that's how I learned it had overcomplicated things in a way that was far from obvious.
Maybe it was that heuristic it later found "smart?"

**Real-time Validation**: Shows warnings when spring index is outside optimal range (4-12) - too low causes manufacturing issues, too high makes the spring unstable. (Ok, cool, that sounds useful.)

**Multiple Unit Display**: Shows compression force in both Newtons and equivalent mass in kg, accounting for different gravity values (Earth, Moon, Mars). (Yeah, well, okay.)

**Formula Reference**: Displays the actual mechanical engineering formulas being used, so you can verify the calculations or understand the relationships.

The Vue.js reactive system handles all the real-time calculations nicely.
When you change any input parameter, everything updates immediately.
I tend to prefer Vue over React, as I feel it's less likely to accidentally ruin performance or miss updates because I forgot to use `useState`.

I use dark mode everywhere, and if implementing that takes ten seconds, there's no reason to not include it.

The math itself uses standard mechanical engineering formulas with the Wahl correction factor for accurate shear stress calculations.
Spring index warnings help avoid designs that won't manufacture well or perform reliably.
