---
title: Making It Look Easy
categories: [software development]
---

You: *"I built this app that lets you dot your Is and cross your Ts!"*

Friend: *"Yeah, well that's easy. I had that idea ten years ago. I even built a prototype."*

Why are ideas considered cheap?
How do I explain it took substantial effort to make it?

## It Begins

![Bell Curve](/assets/bell-curve.svg){:.center}

I'll assert that engineering a project has a complexity-time curve that looks like a bell shape.
This post is about software, but I think buildings are the same.
You start out with a simple idea.

**I need to cross some Ts!**

This is [O(1)](https://en.wikipedia.org/wiki/Big_O_notation): the project is based on, and described by, a constant number of ideas.
Probably just one, really.
The idea is more of a notion of an emotion of a situation, and a will to do something about it.
Your brain is probably already skipping ahead to the next phase as you read this, but really, the essence of a product is just a tiny seed.
Perhaps a conversation where you both stopped, stared at each other and said **are you thinking the same thing?**

Now it's time to brainstorm features:

* a canvas to draw on,
* a pen and an eraser,
* storing and retrieving,
* permissions to read others' crossed Ts,
* backups,
* monitoring,
* graphical design,
* and so on.

You take this to a friend, or potential customer.
You explain your idea and how it has a list of features.
Your friend asks you to speak slower, because you're all over the place with things you could add.
Not to speak of the possibilities if *everyone* could dot their Is with this app.
Your feature list is O(*n*): you have an unbounded list of features, but they are all explained one-by-one.

You start writing, code or a specification.
With machine learning, perhaps it'll soon be the same thing.
The app should be purple, and the pen should be 3px wide.
Easy enough.

A few days in, you realize that the graphical design dictates how easy it is to find the eraser.
And the button for loading should perhaps look different if it's a crossed-T shared by someone else.
The canvas... Well, it's affected by the graphical design, the pen, the eraser, and the storage layer.
If my customers want to share this over Bookface, maybe I should just store all the data with their cloud service?
In the third phase, your beautiful one-liner idea just became O(*n²*), because interactions between features suddenly matter.

You have a matrix, the complexity exploded in your head, and you just hope you don't ever have to explain this to someone.
If you are really unlucky, it became O(*n²t*), because *when* something happens in a sequence also matters.
(Let's not go so far as having to backtrack...)

## Reaching the Summit

By some miracle, you work out the kinks.
The unknowns suddenly become knowns, and clear as glass.
The forest was there all along, and it's actually glorious, now that the trees are in full bloom, so you can't see them anymore.
You are happy.
You are poor, because you haven't sold the app yet.
But you are happy.

And so starts the next phase, wondering how to actually explain this to your potential leads...
How do you make this quadratic complexity implementation look intuitive?

Well, if we simplify the relationship between the canvas and the pen to first explain the awesome canvas, and then explain the cute pen, that might do it?
The list grows, but at least the weird relationships between features can be buried in the documentation.
You don't have to write about that in your benefits list.
Keeping it simple, stupid.

After days of deliberation, you end up with

* Your Is: like you've never experienced them before.
* Your neighbor envies your crossed Ts, but doesn't dare touch them!
* Easy with the pen and canvas from *AwesomeIT*!
* Share with friends---and your neighbor!
* Buy your crossed-T-shirt here to support the project!

That's clearly enough for the front page.
The actual data sheet and user manual might need some more nuance, but the benefits list is the first thing customers will see, and it's brilliant now.
After all, making something difficult look simple sells well.
Speaking of which, YouTube is full of people doing tedious things, throwing away 95% of the raw footage and making it look so easy.
In this first phase after implementation, your complexity is once again down to O(*n*).
You still know all the complexity, but you must: Never. Tell. Anyone.

And, finally, we go full circle with your friend:

You: *"Hey, my neighbors tried my app to cross Ts, and now I'm pretty jealous of their Ts. So it works!"*

Friend: *"What was it you're building again?"*

You: *"The T-crossing and I-dotting app. You remember?"*

Friend: *"A yes, right. The T-crosser..."*

----

At this point, you realize that the elevator pitch can't be a five bullet list.
You realize you need some sort of slogan.
Something you can mention in passing to pique a curiosity, or casually add to your mail footer.
It needs to be catchy, desirable, unique and memorable.
It needs to feel like someone whispered magic words, and *anyone* who hears it must understand the awesomeness.
It needs to be more of a feeling than a product.

In some thread about an intelligent subject, you reply:

>> ... It's crazy that we keep calling it T-crossing.
>
> I agree with what you're saying, but OP referred to it as
> "T-crossing," so I used the same phrase to avoid confusion.
>
> BTW, I built an app for this: Dotting Is vs Crossing Ts -- The Eternal Battle

Just as your friend summarized it in your last encounter, you realize that a single phrase is where everything starts.
It's how you attract attention, which you need before anyone will even listen to benefits.
You can say something beautiful, something crazy, something stupid, something smart.
What you say doesn't matter as long as it creates emotions.
An emotion, that's where we want to go.
We want to give the other person an idea, and a desire to explore that idea.

> Dotting Is vs Crossing Ts -- The Eternal Battle

And there we have it, the tail end of the bell curve.
The O(1) complexity.
The idea, distilled from a feature matrix back to simplicity.
*You* still know all the complexity, but you must never tell anyone.
