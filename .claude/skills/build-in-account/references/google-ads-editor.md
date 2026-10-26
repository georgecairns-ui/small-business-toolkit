# Google Ads Editor import file

For `build-in-account` on Google. Google's own connection reads only, so Claude writes a file the owner imports into Google Ads Editor (Google's free desktop program for building campaigns). Everything in the file is Paused, so the campaign arrives switched off.

Every column name, value and click below is written from memory of how Google Ads Editor usually works. None of it has been checked against today's version, so it is all **to check**. Test the file by importing it into an empty test account before you trust a change, and correct this page from what you find.

## The file

A CSV (comma separated, text in double quotes where it contains a comma), UTF-8, saved as `files/04-marketing/ads/<build-name>-google-ads-editor.csv`. Each row is one thing: a campaign, an ad group, a keyword, a negative keyword, an ad or a location. Columns that don't apply to a row are left empty. (To check.)

Header row, in this order (to check each one):

```
Campaign,Campaign Status,Campaign Type,Budget,Budget type,Bid Strategy Type,Networks,Start Date,End Date,Ad Group,Ad Group Status,Keyword,Criterion Type,Status,Ad type,Headline 1,Headline 2,Headline 3,Description 1,Description 2,Description 3,Description 4,Final URL,Location
```

| Row | What it carries |
|---|---|
| Campaign | `Campaign` (the build name), `Campaign Status` Paused, `Campaign Type` Search, `Budget` (the build's daily budget as a number, such as 15.00), `Budget type` Daily, `Bid Strategy Type`, `Networks` Google search, `Start Date`, `End Date` (empty when ongoing) |
| Ad group | `Campaign`, `Ad Group` (the service name), `Ad Group Status` Paused |
| Keyword | `Campaign`, `Ad Group`, `Keyword` (the words only, without the quote marks or brackets), `Criterion Type` (Phrase or Exact), `Status` Paused |
| Negative keyword | `Campaign` (and `Ad Group` when it belongs to one), `Keyword`, `Criterion Type` Negative Phrase or Negative Exact |
| Ad | `Campaign`, `Ad Group`, `Ad type` Responsive search ad, `Headline 1` to `Headline 3`, `Description 1` to `Description 4`, `Final URL`, `Status` Paused. The words map exactly as below |
| Location | `Campaign`, `Location` (a place name, such as "Marlow, England, United Kingdom") |

Rules for filling it in:

- **Paused everywhere.** `Campaign Status`, `Ad Group Status` and every ad and keyword `Status` say Paused. Check this when you read the file back. A single Enabled row is a failure: fix it before telling the owner it's ready.
- **Bid strategy.** `Maximize conversions` when the owner says results are being counted in the account (`context/ads.md` says so), otherwise `Maximize clicks`. (To check the exact names Editor accepts.)
- **Dates.** `YYYY-MM-DD` unless the test import shows Editor wants another form. (To check.)
- **Radius.** A radius around a town ("15 miles") isn't set in the file. Leave it to the build sheet: it tells the owner to add the radius in Editor. (To check whether the file can carry it.)
- **The words, exactly.** A Google build has 3 ads. Ads 1 and 2 have a headline, main words (`primaryText`) and description. Ad 3 has a headline only. Map them like this, with headlines 30 characters at most and descriptions 90 at most:
  - `Headline 1` = ad 1's `headline`, `Headline 2` = ad 2's `headline`, `Headline 3` = ad 3's `headline`
  - `Description 1` = ad 1's `primaryText`, `Description 2` = ad 1's `description`
  - `Description 3` = ad 2's `primaryText`, `Description 4` = ad 2's `description`
  - If the build has more words than the file can hold (more than 3 ads, words in ad 3's `primaryText` or `description`, or a 4th headline or description), stop and tell the owner what doesn't fit. Never drop any, and never merge two into one.
- **Words.** Use the build's words exactly. Never lengthen a headline to fill space and never cut one mid-word. If a headline is over 30 characters, shorten it and say you did.
- **Quote marks.** A comma in any value means the value goes in double quotes. A double quote inside a value is written twice.
- **Never** put an account id, a login or a customer list in the file.

## The build sheet

`files/04-marketing/ads/<build-name>-build-sheet.md`, in plain words for someone who doesn't know Google Ads. It has these parts:

1. **What's in it:** the campaign name, the daily budget and what a month would cost (daily x 30.4), the dates, where it shows, the keywords and negatives, and the ads in full. All from the build.
2. **Import it with Google Ads Editor** (the way Claude has written the file). Each click is to check:
   1. Download Google Ads Editor from https://ads.google.com/home/tools/ads-editor/ and sign in with the Google account that manages the ads.
   2. Download your account: choose it from the list and press Get recent changes (or Download).
   3. Open the **Account** menu, choose **Import**, then **From file**, and pick the CSV.
   4. Press **Process**, read what it says it will add, and press **Finish and review changes**. (To check the button names.)
   5. Open each tab on the left (Campaigns, Ad groups, Keywords, Ads, Locations) and check it against the "What's in it" part. Check every status reads Paused.
   6. Add the radius around the town, if the build has one (Locations tab, add a location, set the radius). (To check.)
   7. Press **Post** to send it to Google Ads. It arrives paused. (To check.)
3. **Check it in Google Ads:** open https://ads.google.com/, Campaigns, and check the new campaign says Paused.
4. **Switch it on** when you're happy: click the status next to the campaign and choose Enabled. Then press "I've switched it on" in Ads OS. (To check.)
5. **Or build the same campaign by hand in Google Ads**, instead of Editor, step by step: Campaigns, the + button, New campaign, choose the goal and Search, the settings from "What's in it", the keywords, the ads, then the budget. Say plainly: in the web version a new campaign is switched on when you publish it, so set the start date to the day you want it to begin, and check the campaign's status afterwards. Pause it yourself straight away if you want to look first. (To check each click and that behaviour.)
6. **If something looks wrong**, don't switch it on. Tell Claude what you see.

Keep the sheet short. Use real numbers from the build. Never put the owner's account id or login in it.
