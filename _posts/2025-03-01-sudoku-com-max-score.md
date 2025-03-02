---
title: The Max Scoring of sudoku.com
categories: [sudoku, scoring, reverse engineering, software]
---

In [part 1]({% post_url 2025-02-24-sudoko-com-scoring %}), I explained the scoring model used by sudoku.com.
This post is a short note about the maximum score.
There are two additional metrics we need for that:

1. How many cells can we get points for? (The \\(i\\) in the score equation from part 1.)
2. How many points do we get for each cell? (Related to \\(C\\) in the score equation.)

The number of cells to fill out is decided when the boards are generated, so we can't judge that from the Javascript code.
I had a look at a few boards, and they seem to be constant by level:

|  Level  | Empty (\\(E\\)) |
|---------|-----------------|
| Easy    |              43 |
| Medium  |              45 |
| Hard    |              51 |
| Expert  |              49 |
| Master  |              54 |
| Extreme |              59 |
{: .center}

Note that even though Master and Extreme share the same scoring parameters, they are generated differently.

## Points Per Cell

Since each 5x multiplier per completed row, column or box is added independent of other completed objects, at first it seems combos don't matter.
And that's what I wrote in part 1.
Well, that's not quite true, as it turns out.

<figure>
    <figcaption>A Scenario</figcaption>

    <table class="sudoku center">
      <tbody>
        <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
        <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
        <tr><td>&nbsp;</td><td>&alpha;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&beta;</td><td>&nbsp;</td><td>&nbsp;</td></tr>

        <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
        <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
        <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>

        <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
        <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
        <tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td> <td>&gamma;</td><td>&nbsp;</td><td>&nbsp;</td></tr>
      </tbody>
    </table>
</figure>

<style>
figcaption {
  text-align: center;
}

table.sudoku {
  border-collapse: collapse;
}

table.sudoku td {
  border: 1px solid black;
  height: 2em;
  width: 2em;
  text-align: center;
  vertical-align: center;
}

table.sudoku tr:nth-child(3) td {
  background-color: #ff8;
}

table.sudoku tr td:nth-child(7) {
  background-color: #f8f;
}

table.sudoku tr:nth-child(3) td,
table.sudoku tr:nth-child(6) td {
  border-bottom-width: 2px;
}

table.sudoku tr td:nth-child(3),
table.sudoku tr td:nth-child(6) {
  border-right-width: 2px;
}
</style>

Let's imagine a row with two empty cells, \\(\alpha\\) and \\(\beta\\).
Let's also say that \\(\beta\\)'s column (\\(C_\beta\\)) has another empty cell, \\(\gamma\\).
(\\(C_\alpha\\) is full aside from \\(\alpha\\).)
How does the order of completion of the row and \\(C_\beta\\) affect the score?

Let's look at each permutation:

|           Sequence          | Completions |    Multiplier   |
|-----------------------------|-------------|-----------------|
| \\(\alpha\ \beta\ \gamma\\) | 0 + 1 + 1   | 1 + 5 +  5 = 11 |
| \\(\beta\ \alpha\ \gamma\\) | 0 + 1 + 1   | 1 + 5 +  5 = 11 |
| \\(\beta\ \gamma\ \alpha\\) | 0 + 1 + 1   | 1 + 5 +  5 = 11 |
| \\(\gamma\ \beta\ \alpha\\) | 0 + 1 + 1   | 1 + 5 +  5 = 11 |
| \\(\alpha\ \gamma\ \beta\\) | 0 + 0 + 2   | 1 + 1 + 10 = 12 |
| \\(\gamma\ \alpha\ \beta\\) | 0 + 0 + 2   | 1 + 1 + 10 = 12 |
{: .center}

If we do \\(\beta\\) last, completing both the row and column at the same time, we score an extra point, because the 5x multiplier discarded the 1x we would gain if we didn't complete anything!

So depending on the order we fill cells, which depends on the layout of the board, the maximum achievable score differs.
Technically, I guess it's the non-linearity of the \\(C = \max(1, C\ldots)\\) function that causes the issue.
But anyway.

At the low end, completing each row, column and box each with its own cell, we have 27 cells that yield 5x, plus \\(E - 27\\) single points.
At the high end, completing one row, one column and one box in per cell, we have 9 cells that yield 15x, plus \\(E - 9\\) single points.
Clearly, we score more in the second case.

## Find an Upper and Lower Bound

The maximum score is

$$
score_{high} = base \cdot (9 \cdot 3 \cdot 5 + (E - 9)) = base \cdot (126 + E)
$$

Though, depending on board layout, it might not be possible to solve one column, row and box for each completing cell.
So a lower bound is

$$
score_{low} = base \cdot (3 \cdot 9 \cdot 5 + (E - 27)) = base \cdot (108 + E)
$$

And computing that yields

|  Level  | Empty (\\(E\\)) | Base |  Low  |  High |
|---------|-----------------|------|-------|-------|
| Easy    |              43 |   50 |  7550 |  8450 |
| Medium  |              45 |  150 | 22950 | 25650 |
| Hard    |              51 |  210 | 33390 | 37170 |
| Expert  |              49 |  230 | 36110 | 40250 |
| Master  |              54 |  250 | 40500 | 45000 |
| Extreme |              59 |  250 | 41750 | 46250 |
{: .center}

## Conclusion

So we have to modify the strategy the first part concluded with.

> ~~Completion combos don't seem to matter, since you'd get the same multiplier regardless of when the base score is produced.~~

It's better to do combos.

A more complete high-scoring strategy is to:

1. Solve the board completely using notes.
2. Find nine "completion" cells that each solve a row, a column and a box.
3. Use a hint so your first move doesn't have a time penalty.
4. Enter the digits for the cells not picked in (2), within five seconds of the previous.
   (If the hint in (3) took out one of your picked completion cells, you have to rethink on the spot.)
5. Enter the picked completion cells.

<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
