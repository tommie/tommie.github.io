---
title: The Economics of a Home Alarm
categories: [economics, personal finance, insurance, statistics, security]
---

Home alarms are pretty common, but there's a huge difference between having sensors that alert you and scare the intruder away, and one that's connected to a call center.
This call center is being sold in terms of trust and safety, not in terms of finance, and we'll soon see why.

I was just quoted 4,995 kr setup and **549 kr/month** for a Verisure alarm in Sweden's ninth largest city.
The US Dollar is currently worth about 9.2 Swedish Crowns (kr), if you're curious.
Insurance companies that still offer the discount typically take around 5% off home insurance for an alarm-center-connected, SSF-approved alarm.
[Folksam][folksam-discount] and [Länsförsäkringar][lf-discount] both publish such terms; [Larmkollen][larmkollen-overview] aggregates the rest.
On a typical premium, that works out to roughly **60 kr/month**, which is what we'll use below.
The relevant question is what those flows look like compared to the actual cost of break-ins and fires.

<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>

## The cash flows over 45 years

Assume I live in this house for the rest of my life, say 45 years.

| Item | Total |
|---|---:|
| Setup | 4,995 kr |
| Subscription, \\(549 \times 12 \times 45\\) | 296,460 kr |
| **Gross cost**{:.summary} | **301,455 kr** |
| Insurance discount, \\(60 \times 12 \times 45\\) | -32,400 kr |
| **Net cost**{:.summary} over 45 years | **269,055 kr** |
{:.datatable}

Note this is in today's currency value: inflation and price increases will cause the actual number to be higher.

## Event rates

[Brå][bra-stats] reports **85 residential burglaries** in Jönköping municipality in 2025, 115 in 2024, and 234 in 2014. The national [halving since 2015][svt-2026] is mirrored here.
The municipality has roughly [72,000 dwellings][jonkoping-kbfp].
Using 100/year as a round recent average:

<div>
$$p_b = \frac{100}{72{,}000} \approx 0.139\%/\text{yr}$$
</div>

There is also the [NTU self-reported burglaries][bra-stats] statistic, including those that were never reported to the police. It's at 1.3% nationally over a year, ten times higher than our number.
It also covers break-ins to storage rooms and garages that aren't "homes", and incidents too small to bother reporting.
[_If_ suggests][if-morkertal] about 40% of everyday crimes are never reported.
With this in mind, let's triple the probability of a burglary:

<div>
$$p_b = 3 \cdot \frac{100}{72{,}000} \approx 0.417\%/\text{yr}$$
</div>

[MSB][msb-stats] records about 6,000 residential fires per year that the rescue service responds to, on Sweden's [5,260,876 dwellings][scb-bostader]:

<div>
$$p_f = \frac{6{,}000}{5{,}260{,}876} \approx 0.114\%/\text{yr}$$
</div>

This means each house here has roughly a 4-in-1,000 chance of being burglarized every year.
I couldn't find fire statistics for Jönköping, but I can't imagine the rate being higher than the national average.
Combined, that's about a **5-in-1,000 chance** per home per year of either a burglary or a non-trivial fire.

## Probability of an event over 45 years

Let's just have a quick look at what I can expect in terms of insurance events.

<div>
$$\begin{aligned}
P(\text{at least one burglary}) &= 1 - (1-p_b)^{45} \approx 17.13\% \\
P(\text{at least one fire}) &= 1 - (1-p_f)^{45} \approx 5.00\% \\
P(\text{at least one of either}) &= 1 - (1-p_b)^{45}(1-p_f)^{45} \approx 21.28\%
\end{aligned}$$
</div>

Somewhat complicated, because we know the probability of one event per year, but to compute "at least one event" over multiple years, we have to look at the probability of it not happening at all, and then compute the complement of that.

So roughly a **1-in-5 chance** of at least one insurance event over my life in this house.
Put another way, if I have four neighbors my age, I'd expect one of us to ever experience a break-in or a fire in the future.

## Expected fees per event

Expected events over 45 years: \\(45 p_b \approx 0.188\\) burglaries, \\(45 p_f \approx 0.051\\) fires, which means about 0.239 of either.
Dividing the cash flows from the first table by these:

| Per expected... | Gross alarm fees | Insurance discount | Net alarm cost |
|---|---:|---:|---:|
| burglary | 1.6 Mkr | -170 kkr | 1.4 Mkr |
| fire | 5.9 Mkr | -630 kkr | 5.2 Mkr |
| either | **1.3 Mkr**{:.summary} | **-140 kkr** | **1.1 Mkr** |
{:.datatable}

In other words, paying Verisure for the rest of my life is equivalent to self-insuring a **1.3&nbsp;Mkr loss**, against an event with about 21% lifetime probability.
That's on the same order of magnitude as the entire insured home.
As we'll see, the average insurance event isn't taking out your entire home.
The insurance discount alone, summed over 45 years, would only cover one event if it were worth 140,000&nbsp;kr, comfortably below the household's full insurance sum.
The alarm itself would have to deflect a roughly 1.3&nbsp;Mkr loss in expectation to break even.

## What an event actually costs me

A typical Swedish deductible is **3,000 kr** per claim.
On top, insurers apply age depreciation, deducted from the payout:

- **Movables** (electronics, bikes etc.): ~10%/year after the first year, capped at 80% deduction ([Konsumenternas][kons-vard]).
- **Building parts**: 2–10 years free, then 5–10%/year, with an aggregate cap of 15,000–100,000 kr per claim depending on policy ([Konsumenternas][kons-villa], [If][if-aldersavdrag]).

[Svensk Försäkring][svfor-fire] reports an average **158,000 kr** villa fire payout (ersättning) in 2024.
Adding back the 15,000 kr age cap and 3,000 kr deductible gives a typical loss of around 175,000 kr.
There's no separately published "average loss" figure I can find.
For burglary, industry guides put a typical loss at 50,000–80,000 kr with payouts of only 25,000–40,000 kr, so the holder bears about half ([Smoke-Defender][smoke-defender]).

| Event | Typical loss | Insurance pays | Deductible | Holder pays |
|---|---:|---:|---:|---:|
| Burglary | 60 kkr | -30 kkr | 3 kkr | 33 kkr |
| Villa fire | 175 kkr | -160 kkr | 3 kkr | 18 kkr |
| Weighted average | 85 kkr | -58 kkr | 3 kkr | **30 kkr**{:.summary} |
{:.datatable}

The weighted-average row uses event-rate weights \\(p_b/(p_b+p_f) \approx 0.785\\) and \\(p_f/(p_b+p_f) \approx 0.215\\).

Even if the alarm prevented every single break-in and fire, the maximum it can save in expectation is

<div>
$$E[\text{savings}] = E_\text{either} \cdot \text{holder cost} = 0.239 \cdot 30{,}000 \approx 7{,}200 \text{ kr}$$
</div>

That's the absolute ceiling on the alarm's value, and it's about **37× less** than the 269,055 kr I'd pay net.
The alarm can't break even. There simply aren't enough expected events for any subscription at this price to recover its cost.

## The business of emotion

Verisure listed on Nasdaq Stockholm in 2025 ([VSURE][verisure-investors]), so the unit economics are now public.
From the [2024 annual report][verisure-ar-2024]:

- **Portfolio EBITDA margin: 72.7%**, i.e. the steady-state economics of an existing subscriber, before customer-acquisition cost is amortised in.

Of the 549 kr/month I'd be paying, roughly **150 kr covers the marginal cost of monitoring**; the remaining ~400 kr funds customer acquisition, corporate overhead, and profit.

If we run the numbers on 150&nbsp;kr/month, the picture shrinks accordingly:

| Item | Total |
|---|---:|
| Setup | 4,995 kr |
| Subscription, \\(150 \times 12 \times 45\\) | 81,000 kr |
| Insurance discount, \\(60 \times 12 \times 45\\) | -32,400 kr |
| **Net cost over 45 years**{:.summary} | **53,595 kr** |
{:.datatable}

The 7,200 kr expected-savings ceiling doesn't change with the subscription price.
It's set only by the event rate and the holder cost.
At 150 kr/month the net cost is 53,595 kr, so:

<div>
$$\frac{53{,}595}{7{,}200} \approx 7.5\times \text{ more than the alarm can possibly save in expectation.}$$
</div>

Better than 37×, but still no break-even; the underlying event rate is just too low.
This tells me the business model is based not on insurance statistics, but on human emotion.

An equilibrium subscription that exactly offsets expected loss after the insurance discount would land around

<div>
$$F^\star = \frac{E_\text{either} \cdot \text{holder cost} + \text{discount}_{45} - \text{setup}}{12 \cdot 45} = \frac{0.239 \cdot 30{,}000 + 32{,}400 - 4{,}995}{540} \approx 64 \text{ kr/month}.$$
</div>

Roughly equal to the insurance discount itself.

**Side-note:** EBIT margin was 22%.
This is definitely a company I'd like to own.
Playing on emotion is a great business opportunity (you'll understand if you've seen their sales material)!

## The path forward

Let's start with saying the price of the hardware is definitely not the problem.
It's the monthly subscription that is _way_ too high for the added value.

I'll wholeheartedly believe that an alarm is a great deterrent.
In the one burglary I've experienced, it seemed the siren was a strong deterrent that made the offender leave without stealing.
The indoor siren and window were the only things to replace, at a cost barely higher than the deductible.
Do I really get 1&nbsp;Mkr of benefit from having a call center attached to it?
Verisure didn't really get close to answering that.

[_If_ has even removed its alarm discount entirely][svt-if-removed], on the grounds that it isn't risk-motivated. Their actuaries don't see the alarm as reducing expected loss enough to justify a premium cut.

For myself, I'll stick to cameras, smoke detectors, and a home-automation solution to alert me, with sirens to deter the offender.

Finally, note that this is all based on averages, so it doesn't account for whether you're more likely than average to be a victim.
I'd imagine a smoker or a Lamborghini owner is at (slightly) greater risk.

[bra-stats]: https://bra.se/amnen/bostadsinbrott
[svt-2026]: https://www.svt.se/nyheter/lokalt/jonkoping/rekordfa-inbrott-forra-aret-minskning-i-de-flesta-av-lanets-kommuner
[jonkoping-kbfp]: https://www.jonkoping.se/download/18.611776d718af4a06d15769c8/1766414217491/Kommunalt%20bostadsf%C3%B6rs%C3%B6rjningsprogram%20(KBFP)%202025-2030.pdf
[msb-stats]: https://www.msb.se/sv/amnesomraden/skydd-mot-olyckor-och-farliga-amnen/raddningstjanst-och-raddningsinsatser/statistik-om-olyckor-brander-och-skador/statistik-raddningstjanstens-insatser/
[scb-bostader]: https://www.scb.se/hitta-statistik/statistik-efter-amne/boende-bebyggelse-och-mark/bostader-och-boende/bostadsbestand/pong/statistiknyhet/bostadsbestandet-31-december-2024/
[kons-vard]: https://www.konsumenternas.se/forsakringar/boendeforsakringar/hemforsakringar/vardering-av-dina-saker/
[kons-villa]: https://www.konsumenternas.se/forsakringar/boendeforsakringar/villaforsakringar/aldersavdrag/
[if-aldersavdrag]: https://www.if.se/privat/kundservice/guider/ordlista/aldersavdrag
[svfor-fire]: https://www.svenskforsakring.se/statistik/skadeforsakring/hem--villa-foretags--och-fastighetsforsakring/brand-och-aska2/
[smoke-defender]: https://www.smoke-defender.com/sv/inbrott-forsakring-hur-mycket-ersattning/
[folksam-discount]: https://www.folksam.se/forsakringar/rabatter-och-formaner/forebygg-inbrott
[lf-discount]: https://www.lansforsakringar.se/vasterbotten/privat/om-oss/erbjudanden/skadeforebyggande-rabatter-och-erbjudanden/larmrabatt/
[larmkollen-overview]: https://www.larmkollen.se/hemlarm/forsakringsbolagen-hemlarm/
[svt-if-removed]: https://www.svt.se/nyheter/lokalt/jonkoping/fler-larmar-sitt-hem-for-att-stoppa-tjuven
[verisure-investors]: https://www.verisure.com/investors
[verisure-ar-2024]: https://www.verisure.com/system/files/private_pdf/2025-08/verisure-midholding-ab-annual-report-2024.pdf
[if-morkertal]: https://via.tt.se/pressmeddelande/stort-morkertal-i-anmalningar-av-vardagsbrott?publisherId=391729&releaseId=3248878
