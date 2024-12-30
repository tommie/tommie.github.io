---
title: Arc Intersections for a Nice Bow
categories: [maths, programming, javascript, js, algebra, trigonometry]
---

As part of rebuilding the [Numsolar](https://numsolar.com/) 3D editor to make it easier to use, I was researching rotate/scale/translate widgets.
I mean the small visual tool that lets you manipulate objects:

<figure>
  <div style="text-align:center">
    <a href="/assets/2024-12-30-f360-gadget.png"><img width="40%" style="border-radius:6px; border:2px solid white; box-shadow:3px 3px 8px rgba(0,0,0,.35)" src="/assets/2024-12-30-f360-gadget.png"></a>
  </div>
  <figcaption style="font-style:italic; text-align:center">An example from <a href="https://www.youtube.com/watch?v=-z_REUYier8">Fusion 360 How To Rotate</a>.</figcaption>
</figure>

This is from Fusion 360.
See that nice bow shape with tapered ends?
I want that!

I'm writing this blog post, because it serves as a useful example of the level of mathematics that is good to know as a general software engineer.
Now, if I write 3D parametric CAD, you're probably thinking this will be a post intersecting 3D solids, and computing bounding surfaces.
But my point here is that even something as mundane as a good looking cursor can contain interesting problems that "requires maths."
Do you have to solve it mathematically this way?

Well, you would probably use a vector drawing program, export an SVG and load that as your cursor.
But what if you were asked to make it configurable?
Perhaps you can export to SVGs?
Perhaps you can linearly extrapolate between the two.
Maybe you could draw to circles and take the difference?
Or we solve a bit of maths.

## Tearing It Down

I use OnShape for my CAD needs, but Fusion 360 sure has more eye candy and bright colors.
This widget is essentially the same 2D shape instantiated for the three axes:

- The pivot point at the center.
- The arrow to move along one axis.
- The square to slide along a plane.
- The bow and circle for rotating around the pivot.

Notably, the arrow and pivot are actually sprites that are always angled towards the camera, while the rest are stuck in their plane.
This makes total intuitive sense as the arrow is the only 1D modifier and the pivot is a point.
Let's skip computing the outline and making that a contrasting color, as it is a topic for a whole other blog post.

What I'll focus on here is the bow, which tapers off so nicely at the ends.
It's really the difference between two circle sectors of different diameters, slightly offset.
Looks more like a video game than a CAD tool, and it's great.
We can reproduce that in Three.js, but how do we find the arc coordinates to do so?

## Modelling

The first question is: which parameters *could* we be dealing with?
For this, we'll note it doesn't matter which direction the circles are offset.
We'll use the *x*-axis.
And they are symmetric around the *x*-axis, so we'll only care about the first quadrant.

- Two diameters or radii
- The distance from circle centers to intersection
- Two angles to the point of intersection; one for each circle (since they different centers)
- An offset between the circles along the axis
- The *x* and *y*-coordinates of the intersection, from each circle center
- The maximum thickness of the bow, which is the difference of where each arc intersects the axis

That's ten parameters.
We'll immediately note the diameter and distance to intersection must be the same, so really eight.
Which ones are inputs, and which do we want to compute?

What I care about visually is the length of the bow, and the thickness.
So to me, it makes sense that one of the angles and the thickness should be inputs.
What do we need for outputs?

To draw arcs with [`Path.arc`](https://threejs.org/docs/#api/en/extras/core/Path.arc), we need the center coordinates, radius and start/end angles:

    Path.arc(x, y, radius, startAngle, endAngle, clockwise)

The first center is arbitrary (let's say the origin,) and the second center is at a small offset.
Can we compute the rest from the two inputs, or do we have to make more assumptions?

## Intermezzo

My dad told me about a mathematics school teacher who was confronted with this question from a pupil:

> Why do I need to learn this!? I'm going to be laying bricks!

Of all the questions in mathematics, the "why" is probably the most difficult to answer.
It's just so personal.
Mathematics is just a tool to explain the world, and to communicate it to others.
Whether it's a tool you need depends on what you want to accomplish.
Like, I haven't learned to use a dosimeter.
Why?
Because if I am ever in a situation where I need to care about radiation levels, exact measurement is probably the least of my concerns.
I'll stick to "if it beeps annoyingly, I'll run" for now.

The teacher responded with

> You arrive at the job site, and are given drawings of the width, height and depth of the wall.
> How many bricks and how much mortar do you have to buy?

You don't need to learn everything about mathematics to make it useful.
No one simply "knows maths."
But tools are useful to be aware of.

## Finding a Solution

The first order of business is to invent some names:

<figure style="text-align:center;">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-0.1 0.4 1.7 0.5" style="height:12rem; width:20rem; font-family: Verdana, sans-serif; font-size:0.1px;" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="0.01" stroke="none">
    <defs>
      <clipPath id="a"><path d="M 0,1 L 0.7071067811865476,0.29289321881345254 V 1 Z" /></clipPath>
      <clipPath id="b"><path d="M 0.5180576773729098,1 L 0.7071067811865476,0.29289321881345254 V 1 Z" /></clipPath>
    </defs>
    <path d="M 0.7071067811865476,0.29289321881345254
             A 1,1 0 0 1 1,1
             h 0.25
             A 0.7319423226270902,0.7319423226270902 0 0 0 0.7071067811865476,0.29289321881345254" fill="rgb(255, 200, 200)" />
    <line x1="-1" y1="1" x2="2" y2="1" stroke="black" />
    <line x1="0" y1="-1" x2="0" y2="2" stroke="black" />
    <circle cx="0" cy="1" r="1" stroke="gray" />
    <circle cx="0.5180576773729098" cy="1" r="0.7319423226270902" stroke="gray" />
    <line x1="0" y1="1" x2="0.7071067811865476" y2="0.29289321881345254" stroke="gray" />
    <line x1="0.5180576773729098" y1="1" x2="0.7071067811865476" y2="0.29289321881345254" stroke="gray" />
    <circle cx="0" cy="1" r="0.03" fill="black" />
    <circle cx="0.5180576773729098" cy="1" r="0.03" fill="black" />
    <circle cx="0.7071067811865476" cy="0.29289321881345254" r="0.03" fill="black" />

    <text x="0.23" y="0.65" fill="black">R</text>
    <circle cx="0" cy="1" r="0.15" clip-path="url(#a)" stroke="gray" />
    <text x="0.2" y="0.95" fill="black">ɑ</text>
    <text x="0.52" y="0.7" fill="black">r</text>
    <circle cx="0.5180576773729098" cy="1" r="0.15" clip-path="url(#b)" stroke="gray" />
    <text x="0.7" y="0.9" fill="black">β</text>

    <text x="0.27" y="1.1" fill="black">d</text>
    <text x="1.11" y="1.1" fill="black">t</text>
  </svg>
  <figcaption style="font-style:italic;">Names for the model</a>.</figcaption>
</figure>

To set up the equation system, we need to think about what relationships are the same, expressed in more than one way.
The easiest to me is that the *y*-coordinate of the intersection must be the same for the two circles.
The *x*-coordinates are the same, except with the added offset.
That leads to

<div>
  $$
  \left\{\begin{array}{ll}
    R \sin \alpha &= r \sin \beta \\
    R \cos \alpha &= r \cos \beta + d \\
    R             &= d + r - t
  \end{array}\right.\tag{1}
  $$
</div>

where \\(R\\) and \\(r\\) are the radii, \\(\alpha\\) and \\(\beta\\) are the intersection angles, for the respective circles, \\(d\\) is the distance between the circle centers and \\(t\\) is the bow thickness.

With a bit of thought into what happens for really small and large circles, we realize that the larger diameter circle must be the inner arc of the bow.
This suggests \\(R\\) and \\(\alpha\\) is our origin circle, since that makes \\(d\\) positive.
Thus, we want to solve for \\(r\\), \\(\beta\\) and \\(d\\).
Luckily, that means we have three equations and three unknown.
Using the trigonometric identity, we turn this into

<div>
  $$
  \left\{\begin{array}{ll}
    R + t - r   &= R \cos \alpha - r \sqrt{1 - \left(\frac{R}{r}\right)^2 \sin^2 \alpha} \\
    \sin \beta  &= \frac{R}{r} \sin \alpha \\
    d           &= R - r + t
  \end{array}\right.\tag{2}
  $$
</div>

Of course, the top one is annoying, and the others are fine.
Rearranging to solve for \\(r\\), and squaring, the second degree term actually vanishes and we're left with a unique-ish solution.
We only care about intersections in the first quadrant, and I'm pretty sure the solution we're discarding due to the squaring is in the second quadrant.

<div>
  $$
  \left\{\begin{array}{ll}
    r           &= \frac{R^2 \sin^2 \alpha + (R(1 - \cos \alpha) + t)^2}{2(R(1 - \cos \alpha) + t)} = \frac{R^2 \sin^2 \alpha + k^2}{2k} \\
    k           &= R(1 - \cos \alpha) + t \\
    \sin \beta  &= \frac{R}{r} \sin \alpha \\
    d           &= R - r - t \\
  \end{array}\right.\tag{3}
  $$
</div>

where I introduced $$k$$ to reduce clutter.

And there we have all unknown expressed only in terms of known (if you read them in order.)

## Coding the Solution

So how do we code this up?

All the pieces are there, so let's just write some code that outputs an SVG:

<figure>
  <div id="example" style="background-color:rgba(0,0,0,.01); border-radius:6px; border:2px solid white; box-shadow:3px 3px 8px rgba(0,0,0,.35)"></div>
  <figcaption style="font-style:italic; text-align:center">An interactive example with Preact generating an SVG.</figcaption>
</figure>

If you take $$\alpha$$ all the way towards 85°, it will shift out of place.
This is the SVG [sweep parameter](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths#arcs) that needs to be flipped.
The same thing happens if you increase thickness beyond about 0.4.
That's the long-arc paramter that needs flipping.
Both are left as an exercise for the reader.

<script type="module">
import { html, render, useMemo, useState } from "https://unpkg.com/htm/preact/standalone.module.js";

function App() {
  const [rbig, setRBig] = useState(1);
  const [alpha, setAlpha] = useState(45);
  const [t, setT] = useState(0.1);
  const alphaRad = useMemo(() => alpha / 180 * Math.PI, [alpha]);
  const c = useMemo(() => rbig * (1 - Math.cos(alphaRad)) + t, [rbig, alphaRad, t]);
  const rsmall = useMemo(() => (Math.pow(rbig * Math.sin(alphaRad), 2) + Math.pow(c, 2)) / (2 * c), [alphaRad, rbig, c]);
  const sinbeta = useMemo(() => Math.sin(alphaRad) * rbig / rsmall, [alphaRad, rbig, rsmall]);
  const d = useMemo(() => rbig - rsmall + t, [rbig, rsmall, t]);

  return html`<div style="display:flex;">
    <form style="display:flex; flex-direction:column; justify-content:center; margin:2rem 2rem">
      <table style="text-align:left">
      <tr>
        <th><label for="rbig">Inner Radius (<i>R</i>)</label></th>
        <td><input id="rbig" type="number" disabled value=${rbig} min="0.1" max="10" step="0.1" onChange=${e => setRBig(parseFloat(e.target.value))} /></td>
      </tr>

      <tr>
        <th><label for="alpha">Half-Angle (ɑ)</label></th>
        <td><input id="alpha" type="number" value=${alpha} min="0" max="90" step="5" onChange=${e => setAlpha(parseFloat(e.target.value))} />°</td>
      </tr>

      <tr>
        <th><label for="t">Thickness (<i>t</i>)</label></th>
        <td><input id="t" type="number" value=${t} min="0.01" max="1" step="0.01" onChange=${e => setT(parseFloat(e.target.value))} /></td>
      </tr>

      <tr>
        <th>Outer radius (<i>r</i>)</th>
        <td>${rsmall.toFixed(1)}</td>
      </tr>

      <tr>
        <th>Half-Angle (<i>β</i>)</th>
        <td>${(Math.asin(sinbeta) * 180 / Math.PI).toFixed(1)}°</td>
      </tr>

      <tr>
        <th>Offset (<i>d</i>)</th>
        <td>${d.toFixed(1)}</td>
      </tr>
      </table>
    </form>

    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -0.5 2 1" style="height:20rem; width:20rem;" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="0.01" stroke="none">
      <circle cx="0" cy="0" r=${rbig} fill="rgba(100, 100, 0, .1)" />
      <circle cx=${d} cy="0" r=${rsmall} fill="rgba(100, 100, 0, .1)" />
      <path d="M ${rbig*Math.cos(alphaRad)} ${rbig*Math.sin(alphaRad)}
               A ${rbig} ${rbig} 0 0 0 ${rbig*Math.cos(alphaRad)} ${-rbig*Math.sin(alphaRad)}
               A ${rsmall} ${rsmall} 0 0 1 ${rbig*Math.cos(alphaRad)} ${rbig*Math.sin(alphaRad)}" fill="rgb(255, 0, 0)" stroke="rgb(100, 0, 0)" />
    </svg>
  </div>`;
}

render(html`<${App} />`, document.getElementById("example"));
</script>

<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
