---
title: Proof of Content at Point In Time
categories: [software, hashing, archive, data hoarding, right to repair, fulu]
---

Louis Rossmann in [How lying companies damage the Rossmann brand](https://www.youtube.com/watch?v=C8lJnS7fD7c) asks the question how to prove that a web page had some specific content at some point in time, even when companies can ask for content to be removed from web archives for copyright reasons.
The same also applies to Right to be forgotten in the EU.

There were enough comments about "blockchain!" in the Youtube comments that I wanted to give my view.
I think Mr Rossmann is on a crusade I can fully back: if I receive hardware from you, in exchange for money, and we have not entered into a rental/lease agreement, then I am now the owner of that hardware and can do as I please with it.
What you do with your SaaS/cloud, etc. is up to you, but the hardware needs to be a simple transaction.
Right to repair is a **really** strong requirement for me to purchase anything from you.

Using any of the existing blockchains is not a solution to this problem.
The applicable issue with blockchains is, and has always been, that they cannot help with proving anything outside the chain.
If you are making a smart contract on Ethereum that sends ETH in exchange for an [ERC-721 NFT](https://en.wikipedia.org/wiki/ERC-721), that's something that can be proven, because both happen on the same blockchain:
Either both sides of the transaction happened, or none.

But uploading some kind of signature to a blockchain still requires *trust* that the uploader always acts in good faith and that a signature covers what we expect it to cover.
I.e. the blockchain adds nothing, because the *trust* in the uploader (a service or individual) is the weakest link.
The uploader might have just as well stored it in their own service and made a web site (or used BitTorrent.)

The various web archiving solutions solve the problem of trust by being well-respected services that do their own scraping given a URL.
This works well until companies can ask for their content to be removed because of copyright infringement.
Current blockchains make it impossible to remove data, but that doesn't solve any problem, since people with guns (the police and judicial system) still win over technical solutions any day.
They'll simply just seize, censor and punish whatever blockchain is used for this.

## Using Hashes

A [hash](https://en.wikipedia.org/wiki/Hash_function) is simply a short summary of the content.
It's used where the content is long, but what's needed is just something that (pseudo-)uniquely identifies that content.
The common ones today are 256 bits, or 16 bytes.
The chance of an accidental collision is thus 2<sup>-256</sup>, so it's very unlikely to happen even if every atom on Earth decides to start generating SHA-256 hashes.

For a bit of fun:
Fermilab suggests there are [10<sup>50</sup> atoms in/on Earth](https://www.fnal.gov/pub/science/inquiring/questions/atoms.html), which is about 2<sup>163</sup>.
So we have to generate 2<sup>92</sup> hashes for every atom of Earth to find one collision on average.
When every atom of Earth generates hashes, I'll be so impressed that I stop caring about right to repair.
The point is that even though "256" looks like a reasonable number, exponentiating that number makes it **really really** large.

The solution is an archiving service that

1. Allows the user to input a URL
2. The service scrapes the URL to guarantee its authenticity both of source and point in time
3. The service generates a hash of the page content, perhaps based on an image rendering of the page, or a zip-file of HTML
4. The user can retrieve the hash and the underlying web content (image or zip-file,) which must include a scraping timestamp
5. Even if the service takes down the actual page content, it still retains the hash so users can prove authenticity.
   The hash itself has no corporate value, and I'd venture to guess it falls under fair use of the original data to generate it.
   Especially so if it turns out LLM models trained on copyrighted data are not infringing copyright!

The point of the hashes is that you can store a lot of them in very little space, compared with full web contents.
And you are not going to accidentally show a hash as authentic if it wasn't.
A user would still have to download terms and conditions, and do it through an archiving service, but the authenticity wouldn't be in question.

Perhaps it would be legally possible to retain the data, but only make it accessible if given the hash.
With these long hashes, it's practically impossible for anyone to guess a right value without actually already knowing the content.
Would there really be copyright infringement if you have to know the (hash of the) content to access the content?

## Using Signatures

A slightly more elegant solution would an archiving service that signs the hashes using cryptography.
Sure, that could be on a blockchain, but I see no benefit to that.
A signature means that the archiving service publishes a public key that you can use to prove that a signature over a hash and timestamp is authentic.
This means the archiving service doesn't even have to retain the hashes; but instead it gives the user signed web content.
This could e.g. be a PNG screenshot in a [PGP](https://en.wikipedia.org/wiki/Pretty_Good_Privacy) file.

At this point, the archiving service wouldn't even need to be archiving anything for it to be useful to prove that a site had some information.

Of course, if the archiving service has a data breach where the private signing key is stolen, it can no longer be guaranteed that existing signatures aren't forgeries.
But with modern [Hardware security modules](https://en.wikipedia.org/wiki/Hardware_security_module), key rotation and multi-key signatures, this is hopefully unlikely to affect more than a few signatures per breach.

## Who Holds the Data?

In practical terms, the question is who holds the data, because users will be users, and just click away the Terms check box.
However, the problem here is the publically accessible archives, not the content itself.
I'm sure there will be foundations and individuals in the data hoarder community who would gladly keep this type of data, for research purposes.
They would only be making it accessible if you present the hash, also known as [Content Addressable Storage](https://en.wikipedia.org/wiki/Content-addressable_storage).

## The Legal Angle

As Mr Rossmann in a previous video suggested that legal problems shouldn't be solved with technical means, I'd also like to cover that angle.
The old school way of solving this problem is to rename the "archiving service" I used above to [Notary public](https://en.wikipedia.org/wiki/Notary_public) and require that all terms/contracts are notaried.
In the old days, this was a stamp and an archiving of a copy someplace the parties couldn't tamper with the copy.
Today, we can use hashes and signatures to accomplish the same thing.

The question is just if the companies send the data willingly to a notary, or if it has to be scraped by an archiving service.
Both ways could be made a legal requirement for operating a public business.
