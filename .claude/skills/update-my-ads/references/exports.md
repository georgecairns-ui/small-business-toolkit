# Exporting a daily campaign report

Use this when an account isn't connected, or the connection can't be used. Ask the person to follow the clicks, save the file into `files/04-marketing/ads/exports/` and name it with the platform and the date, for example `2026-10-21 meta daily.csv`.

Every click and column name below is written from memory of how these screens usually look. Menus move, so none of it has been checked against the screens as they are today. Each is marked **to check** and you should ask the person what they actually see, then correct this file if it's wrong.

You need **one row per campaign per day**. A report with one row per campaign for the whole period isn't enough: the app can't draw a trend or compare this week with last from it.

## Meta Ads Manager

Sign in at https://adsmanager.facebook.com/ with your Facebook business login. (To check.)

1. Choose the right ad account at the top left. (To check.)
2. Open the **Campaigns** tab.
3. Set the date range at the top right to the period you want, for example the last 90 days. (To check.)
4. Click **Breakdown**, then **By time**, then **Day**. The table now has one row per campaign per day. (To check.)
5. Click **Columns**, then **Customize columns**, and tick the ones in the table below. (To check.)
6. Click **Reports** at the top right, then **Export table data**, and choose **.csv**. Don't pick the Excel option. (To check.)
7. Save the file into `files/04-marketing/ads/exports/`.

Columns to include (all to check):

| Meta column | Becomes | Note |
|---|---|---|
| Day | `date` | Already `YYYY-MM-DD`. (To check.) |
| Campaign name | matches `campaigns[].name` | |
| Campaign ID | matches `campaigns[].platformId` | If it isn't offered, match on the name and say so. (To check.) |
| Delivery (or Campaign delivery) | `campaigns[].status` | Active is `on`, Inactive or Paused is `paused`, Completed or Archived is `ended`. (To check.) |
| Amount spent | `spend` | In the account's currency. The heading often carries the currency, such as "Amount spent (GBP)". (To check.) |
| Results | `results` | Meta counts the result that suits each campaign's objective: leads for a lead campaign, purchases for a sales one. Different campaigns can count different things. Ask which result they care about and check each campaign's objective. (To check.) |
| Purchase conversion value (or Purchases conversion value) | `value` | Only present for campaigns that track purchases with a value. Leave `value` as `null` for the rest. (To check.) |
| Link clicks (or Clicks (all)) | `clicks` | Prefer Link clicks. Say which you used. (To check.) |
| Impressions | `impressions` | |

Ignore Reach, Frequency, CPM, CTR and the cost-per-result columns: the app works its own out.

## Google Ads

Sign in at https://ads.google.com/ with the Google account that manages the ads. (To check.)

1. Choose the right account if you have more than one. (To check.)
2. Click **Campaigns** in the left menu. (To check.)
3. Set the date range at the top right, for example the last 90 days. (To check.)
4. Click the **Segment** button (the icon with 3 stacked bars above the table), then **Time**, then **Day**. The table now has one row per campaign per day. (To check.)
5. Click **Columns**, then **Modify columns**, and tick the ones in the table below. (To check.)
6. Click the **Download** icon (an arrow pointing down, above the table), and choose **.csv**. (To check.)
7. Save the file into `files/04-marketing/ads/exports/`.

Columns to include (all to check):

| Google column | Becomes | Note |
|---|---|---|
| Day | `date` | May show as `2026-10-14`, `14 Oct 2026` or `14/10/2026` depending on the account's settings. Change it to `YYYY-MM-DD` and say which form you saw. (To check.) |
| Campaign | matches `campaigns[].name` | |
| Campaign ID | matches `campaigns[].platformId` | It isn't shown by default: add it under Modify columns, then Attributes. (To check.) |
| Campaign status | `campaigns[].status` | Enabled is `on`, Paused is `paused`, Removed is `ended`. (To check.) |
| Cost | `spend` | In the account's currency. (To check.) |
| Conversions | `results` | Counts the conversion actions the account has marked as primary. Fractions are normal. Ask what those actions are, and write them in `context/ads.md`. (To check.) |
| Conv. value | `value` | Only when the conversion actions carry a value. Otherwise `null`. (To check.) |
| Clicks | `clicks` | |
| Impr. | `impressions` | |

Google's file starts with 2 title lines (the report name and the dates) and may end with total rows such as "Total: Account" or "Total: Campaigns". Skip the title lines and every total row. Never copy a total into `figures`. (To check.)

## How to read either file

1. Find the header row (the first row that has the campaign and spend columns). Skip anything above it and every total row.
2. Turn each remaining row into one `figures` row. Numbers lose their currency signs and thousands commas. Empty means 0 for spend, results, clicks and impressions, and `null` for `value`.
3. Never add rows together. If the file has several rows for the same campaign and day (for example split by device), say so and ask the person to export again without the extra split, because the app keeps only one row for each.
4. Say which platform, which dates and how many rows you read, and anything you had to guess.

## If the export looks wrong

- No Day column: the table isn't split by day. Give the person the steps above again from the breakdown or segment step.
- Spend but no results: ask whether results are tracked in that account. Don't make one up.
- A currency that isn't pounds: say so. The app shows pounds, so don't pretend the numbers are pounds. Ask what they want to do.
