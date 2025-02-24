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
| Extreme |  250 |  25 |   25 |    5 |

There is an entry for Evil, which was the old name for Extreme.
They have the same values.

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

## Bottom Line

The best strategy is to enter the next correct digit within five seconds of the last.
For each level, you are nine steps from reaching the minimum, so if you take longer than \\(5 \cdot 9 = 45\\) seconds to enter the next digit, you might as well take a coffee break from the important task.

Completion combos don't seem to matter, since you'd get the same multiplier regardless of when the base score is produced.
It is best to always do completions when the base-derived score is at a maximum, so within five seconds of the previous entry.

If you have waited more than 45 seconds, using a hint allows you to circumvent the time deductions, but you miss out on completion bonuses.

## Implementation

This is of course fully implemented in Javascript running in your browser.

The actual implementation is a bit more involved, using a timer to do the stepping down.
The \\(C\\) coefficient doesn't use a maximum, but a fallback to 1 if it would have otherwise used a zero.

<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
