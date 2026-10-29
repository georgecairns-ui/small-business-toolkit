# Privacy and safety

Plain answers to the questions people ask before connecting an ad account.

## Where is my information kept?

In this folder on your computer. Ads OS has no account, no server and no database. Your ads data (your platforms, campaigns and their ads, daily figures, predictions, analyses, drafts, summaries, suggestions and the changes you've approved) is one file, `apps/ads/data/ads.json`. Claude's notes about your business are in `context/`. You can open, read and edit all of it yourself.

If this folder sits inside Google Drive, OneDrive or Dropbox, it's backed up there like any other folder. If that folder is shared with other people, they can read your ad figures and notes too, so keep it in a private part of your drive.

## What can Claude do in my ad account?

| | Meta | Google Ads |
|---|---|---|
| **Read** your campaigns, their ads and daily figures | Yes, through Meta's own connection | Yes, through Google's own connection, which only reads |
| **Create** a new campaign | Yes, but only after you approve a draft and ask for it, and only switched off (paused) | No. Claude writes a file you import into Google Ads Editor, and it arrives paused |
| **Switch a campaign on** | Only when you press Switch on in the app and confirm that exact change | No. You switch it on in Google Ads, with a link and steps from Claude |
| **Pause** a campaign or an ad, or **change a daily budget** | Only when you press its button in the app and confirm that exact change | No. You make it in Google Ads, with a link and steps from Claude |
| **Delete** anything | Never | Never |
| **Act on its own** | Never | Never |

After Claude creates a campaign on Meta, it reads it back and checks every part is paused. If any part isn't, it stops and tells you in plain words and nothing else happens. On Meta you switch it on by pressing Switch it on in the app. On Google you switch it on yourself in Google Ads, and then press "I've switched it on" in the app.

## How does a change on Meta work?

You press the button in the app (Switch on, Pause campaign or Change daily budget). A pop-up says the exact change in one sentence, for example "Switch on Christmas gift vouchers in your Meta account. It starts spending up to £6 a day from 15 Nov.", and shows whether it fits your limits. You press **Yes, do it**, or Cancel.

Claude then does that one change and nothing else, reads it back, and the app shows what it found. If the change would take you over your daily limit, weekly limit or monthly budget, the button is blocked and Claude refuses. Claude never acts without your click, and it never deletes anything.

Meta's connection can also do more than that, such as edit live campaigns in other ways. Claude only uses the part that does the one change you approved. The connection is in open beta, so Meta may change what it does: Claude checks the list of what it can do, and what each part needs, every time it's used.

## Will Claude ask before it touches my account?

Yes, every time. No Meta or Google tool is pre-approved in `.claude/settings.json`, so Claude Code stops and asks you before each call, and Claude says what it's about to do first. For a change on Meta that means you approve twice: in the app, then in Claude Code. When you press Yes in the app, it saves your yes in a separate record that Claude can't change without asking you, then opens Claude on screen with the job typed in. Claude only makes a change that matches your recorded yes. Don't change that. When you press "Trust this folder" you are not giving Claude permission to use your ad accounts.

## Will Claude spend my money?

No. A campaign Claude builds is switched off. Nothing spends until you say yes: on Meta, until you press Switch it on and confirm, and on Google, until you switch it on yourself. Claude also won't draft or build a campaign that would take you over the daily limit, weekly limit or monthly budget you set, once the campaigns already running are counted. The app flags any day or week that goes over a limit, whoever switched the campaign on. A daily budget change on Meta that would take you over is blocked in the app, and Claude refuses it too.

## What about passwords and tokens?

Claude never asks for a password or a token, and none should ever go into this folder or into the chat. When you connect Meta or Google, you connect through Claude's Connectors: you sign in on their own screen and the connection keeps the sign-in. This folder never sees it, and setup never uses a key. If there's no Claude connector for your account, Claude reads your figures from a CSV or PDF report you download and drop in the files folder, whenever you ask.

## Does it run when I'm not there?

No. Ads OS has no scheduled run. Claude reads your ad accounts only when you ask, or when you press a button such as Refresh figures in the app, and Claude Code asks you before each call to Meta or Google. No ad account tool is pre-approved, not even one that only reads, so nothing reads your accounts while you're away.

## What about the details of people who fill in my lead forms?

If Pipeline OS is attached and Meta's connection returns the details of people who filled in a lead form, Claude can turn each into a suggested deal in Pipeline OS, which waits for your click. The details go there and nowhere else: Ads OS never keeps them. If Pipeline OS isn't attached, Claude doesn't use them at all. Claude never uploads a customer list to Meta or Google, for any reason.

## Where do my photos and videos go?

When you add a photo or video to an ad (by dragging it from a folder onto the ad, or with the Add from your computer button), a copy is saved in `apps/ads/data/media/` inside this folder, on your computer. Your ads file only lists their names. Nothing is uploaded by the app, and they're never part of the Ads OS download.

"Remove from ad" only takes the picture off that ad. The file stays in the media folder, and nothing in the app can delete it. If you want a file gone, delete it in the folder yourself. The app only saves pictures and videos (JPG, PNG, WebP, GIF, MP4, MOV and WebM, up to 200 MB each) and never replaces a file that's already there.

When Claude writes your ad words it can look at your photos (not watch videos) to describe what's really in them. That happens through your own Claude account, in the usual way. If Claude builds a campaign on Meta and Meta's connection can take pictures, the pictures you added are sent to your own ad account. If it can't, Claude tells you and you add them in Meta's own tools. When Claude reads your ads back from your account, it saves an ad's picture in the same folder only if the connection hands it over. If it doesn't, the ad shows its words only.

## Where do the numbers come from?

From the platforms: Claude copies the raw daily figures from your connected accounts, or from a report you download, into your ads file. The app then works out every total, cost per result, return and light itself. Claude never types one, and it only quotes a number in its summaries and suggestions if the app shows it.

Google and Meta count a result differently (Meta counts some results from people who only saw an ad, Google mostly counts clicks), so judge each against its own target rather than against each other. A return worked out from your own estimate of what a customer is worth is marked "estimated".

## What is claude-ads?

A free set of ad-planning skills by AgriciDaniel, under the MIT licence. Setup installs a tested copy from George's fork, at a fixed version, into this folder only: `.claude/skills` (the folders starting `ads`) and `.claude/agents`. Its licence is kept beside it in `.claude/skills/ads/`. Claude uses it to plan and draft. It never uses it to change an ad account. The installer doesn't add any other software to your computer. If you'd rather not have it, delete those folders yourself: Ads OS still works from its own basics.

## Will Claude make things up?

It's told never to invent a result, a price, an offer, a review, a number or a customer's name. If an ad needs one, it asks you. You should still read every draft before you approve it: that's what the approval step is for. UK advertising rules (the Advertising Standards Authority's code) apply to your ads whoever wrote them, and Claude isn't a lawyer.

## Does it send anything anywhere?

No. It doesn't send emails, messages or posts. Your ads data is saved in files on your computer. The only things that leave your computer are what you've set up: Claude's calls to the connections you added, and the public web pages Claude opens when you ask it to look something up, which go through your own Claude account in the usual way. There's nothing for Get AI Powers to see.

## What is the helper?

Your app runs from a small program in your Small Business Toolkit folder, so it opens like a web page at http://localhost:4747. It only listens on your own computer: nothing on the internet or your network can reach it. It only shows the app and only ever saves your ads file (keeping a backup before every save) and the photos and videos you add to ads, which it never replaces or deletes. It can't read an ad account. When you press Refresh figures, New campaign or another Claude button in the app, it can start Claude Code on your computer to do that one job, and only when the app itself asks.

## Who sees my information?

You, and Claude while you're working with it. Your conversations with Claude are covered by your Claude account's privacy settings, which you can check in the Claude app. Meta and Google see what they always do in your ad accounts. Get AI Powers, who made Ads OS, can't see your folder or your data.

## The approve button

Nothing is built without you. Every draft needs your Approve before Claude will build it, and every change to a live campaign needs your click and your confirm in the app. That's deliberate: your money and your name are on the ads, so you stay in charge of them.
