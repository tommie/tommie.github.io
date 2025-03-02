---
title: The Scoring of sudoku.com
categories: [sudoku, scoring, reverse engineering, software]
---

My wife asked me about the scoring system used on sudoku.com, and that seemed like an interesting question to research.
Here is what I found.

On sudoko.com, there are five difficulty levels.
These use the same scoring system, and the differences are encoded in a table:

|  Level  | Base | Min | Step | Time |
|---------|------|-----|------|------|
| Easy    |   50 |   5 |    5 |    5 |
| Medium  |  150 |  15 |   15 |    5 |
| Hard    |  210 |  21 |   21 |    5 |
| Expert  |  230 |  23 |   23 |    5 |
| Master  |  250 |  25 |   25 |    5 |
| Extreme |  250 |  25 |   25 |    5 |
{: .center}

Master is called Evil in the code.
It has the same values as Extreme.

The way this is used is that for each correctly entered digit, the score is updated with

<div>
  $$
  \begin{aligned}
  score_0 &= 0 \\
  score_i &= score_{i-1} + C \cdot \max(min, base - step * \text{floor}(dt, time)) \\
  \end{aligned}
  $$
</div>

Where \\(floor(v, m)\\) rounds \\(v\\) down to the nearest multiple of \\(m\\), and \\(dt\\) is the time, in seconds, since the last score update.

The \\(C\\) coefficient is a completion multiplier, comprised of

<div>
  $$
  \begin{aligned}
  C &= \max(1, C_R + C_C + C_B) \\
  C_R &= \begin{cases}
    5& \text{if a row was completed} \\
    0& \text{otherwise} \\
  \end{cases} \\
  C_C &= \begin{cases}
    5& \text{if a column was completed} \\
    0& \text{otherwise} \\
  \end{cases} \\
  C_B &= \begin{cases}
    5& \text{if a box was completed} \\
    0& \text{otherwise} \\
  \end{cases}
  \end{aligned} \\
  $$
</div>

As far as I can tell, there is no extra score added at the end, or based on historical games.

### Hints

If you use a hint, the level's base value is used without any multipliers or time deductions.
Using the hint resets \\(dt\\) to zero, like any correctly entered digit.

Note that the \\(C\\) coefficient is 5, 10 or 15, and the min value is 10% of the base.
Using a hint without triggering a completion would be slightly worse than using the minimum score, and completing two entities with it.

## Bottom Line

The best strategy is to enter the next correct digit within five seconds of the last.
For each level, you are nine steps from reaching the minimum, so if you take longer than \\(5 \cdot 9 = 45\\) seconds to enter the next digit, you might as well take a coffee break from the important task.

Completion combos don't seem to matter, since you'd get the same multiplier regardless of when the base score is produced.
It is best to always do completions when the level-derived score is at a maximum, so within five seconds of the previous entry.

Using a hint may be better than doing a single completion at the minimum digit score, if you have some to spare.

## Implementation

This is of course fully implemented in Javascript running in your browser.

The actual implementation is a bit more involved, using a timer to do the stepping down.
The \\(C\\) coefficient doesn't use a maximum, but a fallback to 1 if it would have otherwise used a zero.

> There is a [part two]({% post_url 2025-03-01-sudoku-com-max-score %}) about the maximum score.
{: .callout-note}

> * Added Master level, which I seem to have missed.
> * I seem to have misspelled the page URL. Appologies.
{: .callout-update}

<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
