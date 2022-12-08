---
title: The Version Control System I Yearn For
categories: [git, vcs, hg, perforce]
---

Ever since I left Google two years ago, I have been wondering how to use Git to build a good version control system.
Don't get me wrong; for small codebases, Git is perfectly fine, but when you care about not downloading all code locally, it's not enough.
Perhaps the code size is too large, or access control says someone shouldn't be able to access some parts.
In the end, it feels like Git is the assembly language of a VCS, and we need a BASIC on top of it.
That said, whether it is actual Git at the bottom, or some other versioned hierarchical document store doesn't matter much.

Here is what I think I want, in terms of Git:

* Splitting directories into submodules is as transparent as splitting files into directories.
  There is high-level command line tooling so that I never have to care about the individual submodules.
  Repositories for Go code should probably only have one Go module per repository.
  Git realities shouldn't force me to do something else.
* There is one Git repository per build unit, and it only contains Git submodule mounts.
  Each build unit has a HEAD, automatically moved forward as integration tests in the CI pipeline for that unit passes.
* There is a file system that allows me to access any repository in any build unit by just changing directory.
  It allows access to any previous version of the build unit as well as a `HEAD` symlink.
  It transparently handles local caching.
* Bazel should not have to care about Git commit hashes, or Git repositories in workspace files.
  All that is handled as Git submodules.
  Bazel just runs on top of the file system and is happy.
* Something that allows branching build units while maintaining consistency (all-or-nothing) across submodules.
  I.e. when asking for a merge to main, the CI pipeline guarantees it will use "at least" those versions of each individual submodule.
  It should probably be possible to say that "any build unit using these repositories together must make this guarantee."
  Not sure what this would look like in terms of Git... Maybe a commit message tag like "commit together with" or a fake submodule tree.
* Asking for a merge doesn't require a separate pull request command.
  It's just a merge to some branch.
* Pull request review requirements (i.e. code ownership) are controlled by files in the repositories.
* The Git server has two access levels per repository: `--depth=1` enforced, and allowing access to all history.
  Or perhaps blacklisting of individual commits as a way to quickly scrub history for when you commit that private key you shouldn't.
  And a way to propagate that blacklisting to individual client caches.

Here is what I dream of in wider terms of development environment:

* Mercurial's way of handling branches is much more user-friendly than Git (or rather; than GitHub pull requests.)
  You can design a commit structure, and redesign it.
  Modifying history in commits not yet merged to main is not a "force push" that breaks PR diffs.
  And `hg absorb` and interactive splitting are awesome commands.
* Version sequence numbers (a.k.a. version tagging) should be the CD pipeline's reponsibility.
  When some version is being used, it should be tagged.
  E.g. the VCS could tag any version that is being downloaded by specific roles.
  If I wrote a commit message saying the minor or major number needs to be incremented, it should do so.
* Numeric identifier allocation should happen at build time.
  Enum values and Protobuf field numbers really don't matter, as long as they are consistent across builds.
  I want the build pipeline to allocate numbers for me, write those to some version-controlled place and keep applying them consistently for future builds.
  Naturally, this location should be observable, but thinking about "what should the next field number number in this Protobuf message be" is a meaningless task.
* I would love a web IDE that is simply doing what `mosh + tmux + {emacs, bazel}` does now, but as a (self-hosted) cloud service.
  Maybe it's running as usual on some server.
  Maybe tmux and Emacs is compiled to WebAssembly and running in my browser using a virtual file system.
  I can edit code and run the tests on my build farm.
  Either way, I'd love to not have to check out proprietary code on every developer laptop.
