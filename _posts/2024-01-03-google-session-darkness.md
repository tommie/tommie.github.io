---
title: Google Session Length Darkness
category: [google, saas, web]
---

[Itergia](https://itergia.com) has had a Google account since two years, paying $20 a month for two users barely using it.

During this time, I've been annoyed that I have to re-authenticate web sessions very often.
My Android phone stays signed in forever, and I barely ever have to re-authenticate my private gmail.com account, so this seemed like a configuration issue.
While working for Google, this Just Worked.

Reading [Set Session Length for Google Services](https://support.google.com/a/answer/7576830]), it seemed like this could indeed be changed.
The same link also exists on the related [Session Control for Google Cloud](https://admin.google.com/ac/security/reauth/admin-tools) page.
But when navigating to the console link, all I get is a HTTP 400.

Opening a support case in September, I never got an explanation, or help.
("Try logging out and in again.")

I tried support again two days ago.
At this point, I had measured it to be exactly two weeks and not just "oddly short."

This time, support explained it quickly and well (emphasis added):

> Kindly note that users with Google Workspace **Business Standard** licenses have the fixed web session duration of 14 days.
> This setting does not affect native mobile applications and some mobile browser sessions.
> A new duration setting applies when the user signs out or when the current session expires.
>
> The reason the link is not accessible to you is because the setting is not available for your subscription.
> In order to unlock the feature, you will need to switch your license to any of the following:
>
> Frontline Standard; Business Plus; [---]

This explains why the previous case ended with "log out and in again."
After reading that, I realized the support page actually states this in italics at the top.
It never occurred to me that my former employer would charge extra for configuring session length.

This seems to be an instance of a [dark pattern](https://en.wikipedia.org/wiki/Dark_pattern): up-sell through being annoying.
I have two thoughts against this.

First, those using Google Workspace less frequently is actually affected more by a short session:
Since I mostly use the account in response to calendar notifications or emails, I rely on push notifications to Just Work.
But they don't.
And so, I have to baby-sit the session.
Someone using the account daily, arguably in a position to pay more, is less affected, since they'll know immediately to log in again.

Second, the end result is that I'll just change the password from something that is hard to guess, to something easy to remember.
Arguably, Google is actively undermining customer security with this product decision.
