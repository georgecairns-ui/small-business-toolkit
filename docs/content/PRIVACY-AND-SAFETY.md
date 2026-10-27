# Privacy and safety

Plain answers to the questions people ask before running the research.

## Where is my information kept?

In this folder on your computer. Content Machine OS has no account, no server and no database. Your plan (your platforms, research, ideas and posts) is one file, `apps/content/data/content.json`. Claude's notes about your business are in `context/`. You can open, read and edit all of it yourself.

If this folder sits inside Google Drive, OneDrive or Dropbox, it's backed up there like any other folder. If that folder is shared with other people, they can read your plan and notes too, so keep it in a private part of your drive.

## Where do my photos and videos go?

When you add a photo or video to a post (by dragging it from a folder onto the post, or with the Add from your computer button), a copy is saved in `apps/content/data/media/` inside this folder, on your computer. Your plan file only lists their names. Nothing is uploaded anywhere, and they're never part of the Content Machine OS download.

"Remove from post" only takes the picture off that post. The file stays in the media folder, and nothing in the app can delete it. If you want a file gone, delete it in the folder yourself. The app only saves pictures and videos (JPG, PNG, WebP, GIF, MP4, MOV and WebM, up to 200 MB each) and never replaces a file that's already there.

When Claude writes a caption it can look at your photos (not watch videos) to describe what's really in them. That happens through your own Claude account, in the usual way. If this folder sits in Google Drive, OneDrive or Dropbox, large videos sync like any other file.

## Does Claude post for me?

No. Claude never posts, publishes, schedules, comments, follows, likes or messages anyone, on any platform, for any reason, and it never logs in to one. It writes the words and suggests a picture or video. You copy each post and post it yourself with the Copy and Open buttons, then tell it "I've posted it".

**Automatic** on a post means Claude finishes it without waiting for you to approve it. It does not mean Claude posts it. **Ask me first** means it waits for your Approve. Either way, you are the only one who posts.

## What does the research read?

Public web pages, found with a web search: what people search for and ask (search suggestions and "people also ask" questions), public forums and communities (such as Reddit and Mumsnet), local news, and your competitors' public websites and public profiles.

It never logs in to anything, never uses your personal accounts, never joins a group and never follows, likes, messages or comments on anyone. If a platform won't show a page without signing in, Claude says so and leaves it out rather than guessing. It records where each finding came from, in plain words, so you can check it.

Nothing leaves your computer except what Claude searches for and the public pages it opens, which go through your own Claude account in the usual way.

## What does Claude store about competitors?

What's publicly visible: the business's name and website, which platforms they use, what they post and what seems to work for them, in a few plain sentences, with an example or 2. It doesn't store private individuals' details, such as the names of people who commented, and it doesn't copy anyone's posts into yours. Competitors' words are for learning from, not for copying.

## Will Claude make things up?

It's told never to invent a result, a number, a statistic, a customer's words or a customer's name. If a post needs one, it asks you for it on your To do list, or leaves the post as an idea until you've given it. You should still read every post before you post it: that's what the approval step is for.

## What about the skill Claude builds about my business?

It's a small file about your audience and your industry, saved in `.claude/skills/` and in `skills-to-upload/`. It stays on your computer. If you add it to the Claude app, it goes into your own Claude account, and it's yours alone. It's never part of the Content Machine OS download.

## What about passwords and keys?

Content Machine OS doesn't need a sign-in to anything. It never asks for a password or a key, and none should ever go into this folder or into the chat.

## Does it send anything anywhere?

No. It doesn't send emails, messages or posts. Your plan is saved in files on your computer. There's nothing for Get AI Powers to see.

## What is the helper?

Your app runs from a small program in your Small Business Toolkit folder, so it opens like a web page at http://localhost:4747. It only listens on your own computer: nothing on the internet or your network can reach it. It only shows the app and only ever saves your plan file (keeping a backup before every save) and the photos and videos you add to posts, which it never replaces or deletes. When you press Plan, Refresh research or Ask Claude in the app, it can start Claude Code on your computer to do that one job, and only when the app itself asks.

## Who sees my information?

You, and Claude while you're working with it. Your conversations with Claude are covered by your Claude account's privacy settings, which you can check in the Claude app. Get AI Powers, who made Content Machine OS, can't see your folder or your plan.

## The approve button

Nothing waits to go out without you. Every post you've set to **Ask me first** needs your Approve before it counts as ready, and every post, approved or automatic, needs you to post it. That's deliberate: your name goes on what you post, so you stay in charge of it.

## Email and the law

If you send a newsletter, the rules on marketing emails apply to you (in the UK, mainly that people agreed to hear from you and that every email has a working way to unsubscribe). Claude can remind you, but it isn't legal advice. Check the Information Commissioner's Office guidance (ico.org.uk) for your own situation. Claude never sends the email: you do.
