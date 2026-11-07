# Site-56 Archive setup (GitHub + Railway)

How it fits together:
- **The site** is hosted on GitHub Pages. Every file is stored there encrypted, so without a key the site shows only the login screen.
- **The bot** runs on Railway, 24/7. It handles the Discord commands and has its own web address that the site sends new files and requests to.
- **New keys and files:** the bot hands them to GitHub, and GitHub updates the site. Nothing secret is ever in the website code.

You'll make **two** GitHub repos: a public one for the site and a private one for the bot.

## 1. Site repo (public)

1. Make a new **public** repo called `halcyon`.
2. Upload `index.html`, `keys.json`, `files.json`, `requests.json` and the `scripts` folder.
3. **Add file → Create new file**, name it `.github/workflows/data.yml`, and paste that file's contents in exactly as they are.
4. **Settings → Pages**: Deploy from a branch, **main**, **/ (root)**.
5. **Settings → Actions → General → Workflow permissions**: **Read and write permissions**.

Your site address is `https://YOUR-NAME.github.io/halcyon/`.

## 2. GitHub token

GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**:
- Repository access: only `halcyon`
- Permissions: **Contents: Read and write**

Copy the token. It starts with `github_pat_`.

## 3. Discord bot

1. https://discord.com/developers/applications → **New Application** → **Bot** tab → **Reset Token**, then copy the token.
2. **OAuth2 → URL Generator**: tick `bot` and `applications.commands`, then open the link to add the bot to your server.
3. Make a staff channel for logs and file requests, for example `#halcyon-log`.
4. Turn on Developer Mode (**Settings → Advanced**), then copy your **server ID** and the **log channel ID**.

## 4. Bot repo (private)

Make a new **private** repo called `halcyon-bot` and upload what's in the `bot` folder: `index.js`, `vault.js`, `make-secrets.js`, `package.json` and `.gitignore`.
Never upload a `.env` or `secrets.json`.

## 5. Railway

1. Railway → **New Project → Deploy from GitHub repo** → `halcyon-bot`.
2. **Variables** tab. Add each of these:

| Variable | Value |
|---|---|
| `DISCORD_TOKEN` | bot token from step 3 |
| `GUILD_ID` | your server ID |
| `GITHUB_TOKEN` | token from step 2 |
| `GITHUB_REPO` | `YOUR-NAME/halcyon` |
| `SITE_ORIGIN` | `https://YOUR-NAME.github.io` (no `/halcyon`, no slash at the end) |
| `LOG_CHANNEL_ID` | log channel ID |
| `WRITE_LEVEL` | `3`, the lowest level that can add files |

3. Let it deploy once. It will stop on purpose and print a line starting with `{"1":` in the **Deploy Logs**. Copy that whole line:
   - add it as a variable called `LEVEL_SECRETS`
   - **save a copy somewhere safe**, like a password manager

   This holds the passwords every file is encrypted with. Lose it and no file can ever be opened again. Anyone who has it can read everything.
4. Railway redeploys. The logs should say `commands ready` and `Upload endpoint listening`.
5. **Settings → Networking → Generate Domain**. You get an address like `https://halcyon-bot-production.up.railway.app`.

## 6. Connect the site to the bot

Open `index.html`, find `CONFIG` near the bottom, and paste your Railway address with `/submit` on the end:

```js
var CONFIG = {
  endpoint: "https://halcyon-bot-production.up.railway.app/submit",
  writeLevel: 3
};
```

`writeLevel` must match `WRITE_LEVEL` on Railway. Upload the edited `index.html` to the `halcyon` repo.

## 7. Test it

1. In Discord, press **Keycards** on the config menu, pick yourself and Level 5, and press **Give keycard** (or type `/key give member:@you level:5`).
2. After a minute or two, log in on the site with the key the bot DMs you.
3. Add a file under **New File**, wait a minute, and press **Refresh**.

## Agents, requests and the key list

- `/key give member:@someone level:3 agent:true` makes an **agent** key. Agents get a **Requests** tab on the site with Approve and Deny buttons.
- Requests also appear in Discord with **Approve** and **Deny** buttons. Agents, admins and anyone with `KEY_ROLE_ID` can press them.
- **Approve** makes a new key at the requested level for that person, DMs it to them, and turns off their old key. **Deny** DMs them that it was denied.
- The bot keeps one **KEYCARD REGISTRY** message at the bottom of the key info channel. It's edited in place when something changes. If anyone posts under it, the bot moves it back to the bottom a few seconds later and deletes the old copy, so there's only ever one. It shows every keycard by level, who holds it, which personnel file it's linked to, expiry dates, keycards running out this week, requests waiting, departments with their heads and headcount, and how many keycards have no personnel file yet.
- Every sign in and sign out goes to the sign-in channel: who, which keycard, what level, and how long they were signed in. Refreshing the page doesn't count as a new sign in. Logging out with the button and the 15 minute auto-lock both show up. Closing the tab without logging out can't be told apart from a refresh, so that one isn't logged.
- To make an existing key an agent, give a new key with `agent:true` and remove the old one.

Optional Railway variables:

| Variable | What it does |
|---|---|
| `REQUEST_CHANNEL_ID` | Post requests here instead of the log channel |
| `REGISTRY_CHANNEL_ID` | Key info channel. Default `1566302242020003840` |
| `SIGNIN_CHANNEL_ID` | Sign in / sign out channel. Default `1568091633096990750` |
| `CONFIG_CHANNEL_ID` | Where the config menu lives. Default `1568096195920920647` |
| `ADMINISTRATOR_ID` | The only Discord account that can grant, renew or revoke Level 6. Default `1322966690127937546` |
| `ACTIVITY_CHANNEL_ID` | New files, edits, department changes, deletions and the weekly summary go here instead of the log channel. Use a staff channel: it shows file names and titles (never what's inside) |
| `AGENT_ROLE_ID` | Role that gets pinged when a request has waited 24 hours. People with it can also press Approve/Deny. Falls back to `KEY_ROLE_ID` |
| `SITE_URL` | Where "Open on site" buttons go. Only needed if it isn't `https://<owner>.github.io/<repo>/` |
| `REMINDER_HOUR_UTC` | Hour (UTC) for expiry reminders and the Monday summary. Default 15, which is 10am Toronto in winter, 11am in summer |
| `FAILED_SCAN_LIMIT` | Wrong keycards from one connection within 10 minutes before the log gets a warning. Default 5 |

The bot needs **Send Messages**, **Embed Links** and **Read Message History** in all of those channels, plus **Manage Messages** in the key info channel and the config channel, so it can delete the old copy when it moves the registry or the menu back to the bottom. Without it they stay where they are and the log channel tells you.

## The config menu

The bot keeps one **CONFIG MENU** message at the bottom of the config channel. Like the keycard list, it's edited in place, and if anyone posts under it the bot moves it back down and deletes the old copy. It has four buttons:

- **Keycards:** pick a member, a level and how long, then **Give keycard**. **Remove**, **Renew** and **Look up** ask for a keycard ID or the holder's name. **List all** shows every keycard.
- **Roles:** pick a Discord role, then choose what it gives: a keycard level, a department folder and whether it counts as a rank. Press **Save**. **Check everyone now** fixes anyone missing or extra.
- **Departments:** pick one to change who can see it, add or remove heads, or delete it. **New department** makes one.
- **Archive:** file names by category, stats, delete a file (it asks you to confirm) and the secrets backup.

Everything opens privately, so only the person who pressed it sees it. Only admins, people with `KEY_ROLE_ID` or `AGENT_ROLE_ID`, and RAISA agents can use it. The same things work as slash commands too (see Commands below).

## Department servers

The bot can run in a separate Discord server for each department. They're listed in `servers.js` next to the bot's `index.js`: each one's server ID, name, chain of command forum, and which department from `hierarchy.js` that forum shows. The main server (`GUILD_ID`) keeps full control.

**How roles work across servers:** someone's roles in every server count together. Their keycard is the highest level any of their roles gives, wherever that role is. Leaving one server only takes away what that server gave them. Leaving every server takes their keycard, and their folder moves to Unassigned.

**Setting up a server** (only the Administrator can do this): in that server, type `/menu` and press **Server setup**.
- **Director role:** people with it can use `/menu` there and set up that server's roles: keycards up to Level 4 (`maxLevel` in `servers.js`), folders in that server's departments, and ranks. They also become heads of those departments on the site, so they can edit their people's personnel files. Losing the role takes the head spot away again. Heads you set by hand are never touched.
- **Departments:** which archive departments this server runs. Directors can only put folders in these.
- **Uploader role:** people with it can add files in the picked categories (Objects by default in the Scientific server) on the site without RAISA review, even below Level 3. They still need a keycard, from a role or given by hand.

**Department server menus** only have Roles, Update chain of command, and Server setup (shown only to the Administrator). Keycards, Departments and Archive stay in the main server. RAISA agents can use `/menu` in any department server too.

**Ranks:** if someone has rank roles in more than one server, their title comes from the server that runs their department, then the main server.

The main server's Roles screen lists every server's roles, grouped by server. **Archive, Update every server's chain of command** posts or updates each department server's forum in one go.

## Chain of command

The bot can post the Site-56 chain of command (order of authority, special authority, then every department with its ranks and divisions) as a set of embeds. In the config menu press **Archive** and pick a channel under "Post the chain of command in..." (or `/archive hierarchy channel:`). Picking the same channel again edits the copy that's already there, so nobody gets notified twice.

**In a forum** (recommended) every department gets its own post, and an **Order of Authority** post with the tiers and special authority rules is pinned at the top. Posts get tags (Leadership, Oversight, Operations, Science, Support, set by `group` in `hierarchy.js`), and the bot sets the forum to sort by Creation date so they stay in order. Posting again edits each post in place, so comments under them are kept. A department whose name changed has its post renamed. A new department gets a new post. A department you removed from the file keeps its post, and the bot tells you which ones so you can delete them. The bot needs **Create Posts**, **Send Messages in Posts** and **Manage Threads** (for the pin) in the forum, plus **Manage Channels** if you want it to make the tags and set the sort order. Without those it tells you what to do by hand.

The text lives in `hierarchy.js` next to the bot's `index.js`. To change a rank or add a department, edit that file, redeploy, and post it again.

## Keycards from Discord roles

Instead of granting every member a keycard, set up their Discord role once:

1. **Turn on Server Members Intent** (one time): Discord developer portal, your bot's app, **Bot**, **Privileged Gateway Intents**, switch on **Server Members Intent**, save, then redeploy the bot on Railway. Without it the bot still runs, but role keycards stay paused and the Roles screen tells you.
2. In the config menu press **Roles**, pick @MTF Theta-56, set Keycard to Level 2 and press **Save** (or `/role set role:@MTF Theta-56 keycard:2`). Everyone with that role gets a Level 2 keycard by DM straight away.
3. From then on it's automatic:
   - Someone gets the role: they're DMed a keycard.
   - Someone loses the role or leaves the server: their keycard is turned off.
   - Someone moves to a role with a higher level: they get a new keycard, the old one stops, and their personnel file link and head spots move over.
   - Someone has two linked roles: they get the higher level.
   - Someone already has a keycard you granted by hand at that level or higher: they're left alone.
4. If someone has DMs closed, no keycard is made (so there's never a keycard nobody has). The log channel says who. Once they open DMs, press **Check everyone now** on the Roles screen (or `/role sync`).

| Command | What it does |
|---|---|
| `/role set role: keycard: department: rank: agent:` | Set what a role gives. Anything you leave out stays as it is. Keycard levels go from 1 to 5, Level 6 is never handed out by role. `keycard:No keycard` or `department:No department` turns that part off |
| `/role remove role:` | Stop the role giving anything. Keycards from it are turned off, folders move to Unassigned |
| `/role list` | Every role and what it gives, in your server's role order |
| `/role sync` | Check every member now. The bot also does this every time it starts |

Role keycards show "from role" in the key info channel and on the Admin tab. The role links are saved in `role-levels.json` in the site repo.

## Why new things show up straight away

The site reads keys, files and images straight from the newest commit in the repo (it asks the bot which commit that is). So a new keycard or file works as soon as the bot saves it, without waiting for GitHub Pages to redeploy. If the bot can't be reached, the site falls back to the published copy, which can lag behind by a few minutes. Changes to `index.html` itself still go through GitHub Pages as usual.

## Department folders

Every personnel file is that person's **folder**. Below their profile it lists every file they've filed (with any keycard they've had), and a button finds every other file that mentions them by name. Anywhere a file says "Filed by", the name links to that person's folder.

To make folders automatic, give a Discord role a department (Roles in the config menu, or `/role set`):

- `/role set role:@Security department:Site Security`. Everyone with the role gets a personnel file in that department, named after their server nickname, linked to their keycard, and filed by "R.A.I.S.A. (automatic)". Heads and agents can fill in the rest with Edit.
- **Someone gets the role:** they get a folder (or their existing one moves to that department).
- **Someone loses the role or leaves the server:** their folder moves to Unassigned. It's never deleted.
- **Someone with two linked roles** stays in the department they're already in. New people go to the first one linked. Several roles can point at the same department.
- **Hidden departments:** a folder in a Level 4 department is made at Level 4.
- **Ranks:** set Rank to yes on each rank role (or `/role set role:@Sergeant rank:true`). Someone's title becomes the highest rank role they have, in your server's role order, so roles like Booster or Verified are ignored. Promotions update the title. Losing every rank clears it. A title someone typed by hand is kept if they have no rank role.
- **Discord username** shows on the folder and updates if they change it (picked up when their roles change or the bot restarts).
- Setting a role's department to No folder unlinks it. People already in it move to Unassigned.
- A role can give a folder, a keycard, a rank, or any mix. They're set together in the same place.
- If someone already has a personnel file you made by hand, link their keycard on it first (Edit, Linked keycard), so the bot uses that file instead of making a second one.

## Who can do what

- **Level 1:** read files at their level, send clearance requests.
- **Level 2:** everything above, plus **Submit file**. Their files go to RAISA first. Agents see them in the Requests tab with a **Read it** button that shows the whole file, then Approve or Deny. Discord gets a card too, with no file text in it. The person gets a DM either way, and approved files show who sent them and who approved them. Level 2 authors can't edit their files directly afterwards. They send RAISA a new version.
- **Level 3 and up:** add and edit their own files directly (change this with `WRITE_LEVEL` on Railway).
- **Level 5 and 6:** RAISA agents automatically, with no `agent:true` needed. Lower levels only become agents if granted with `agent:true`.

## Departments

RAISA manages departments in the Admin tab on the site, with Departments in the config menu, or with `/dept` in Discord.

- **Delete:** press Delete on the department, then Confirm delete. People in it become Unassigned. Their files stay.
- **Hide it from lower levels:** pick a level when you register it, or change it with Set visibility. Anyone below that level can't see the department at all. It doesn't show in the filter, the Personnel list or the RAISA tab, and the name is locked with that level's code, so it isn't hidden in the page either.
- So a personnel file doesn't give the department away, anyone in a Level 4 department needs a Level 4 or higher file. The site only lists departments the file's level allows, and the bot refuses anything else. To raise a department's level, raise the files of the people in it first (it tells you which ones).
- Agents can only see and manage departments up to their own level. Level 6 departments can only be made or changed by the Administrator.
- Departments made before this update count as visible to everyone.

## Level 6

Level 6 can only be granted, renewed or revoked by the Administrator's Discord account, from Discord or from the site. Agents can't touch it, and requests can't ask for it.

To switch it on, Level 6 needs its own secret:

1. Open the bot's logs on Railway. When it starts without Level 6 it prints a line like `,"6":"abc...="`.
2. Edit the `LEVEL_SECRETS` variable and paste that line in just before the closing `}`, so it ends `..."5":"...=","6":"abc...="}`.
3. Redeploy, then give yourself one: `/key give member:@you level:6`.
4. Make a new secrets backup (Archive in the config menu, or `/archive backup`) so it includes level 6.

Level 6 files and `[[6: text]]` redactions only open for Level 6 keycards. Level 6 holders see a ▮6 redaction button in the editor.

## Commands

The config menu does all of this with buttons. If you'd rather type, there are four commands. Anything that needs a keycard, department or file autocompletes, so start typing a name instead of pasting IDs.

| Command | What it does |
|---|---|
| `/key give member: level:` | Makes a keycard and DMs it. Add `agent:true` for RAISA, `days:14` for a temporary one |
| `/key remove keycard:` | Turns a keycard off |
| `/key renew keycard: days:30` | Valid for 30 days from today. `permanent:true` removes the expiry. `level:4` issues a new keycard at that level, DMs it, turns the old one off, and moves their personnel file link and department head spots over |
| `/key info keycard:` | Holder, level, expiry, linked personnel file and what they head |
| `/key list` | Keycards grouped by level. `level:` to show one |
| `/role set` · `remove` · `list` · `sync` | What Discord roles give (see Keycards from Discord roles) |
| `/dept list` · `create` · `delete` · `visibility` · `head` | Departments, same as the Admin tab on the site. `create visible_to:4` or `/dept visibility` hides a department from anyone below that level. `/dept head remove:true` takes a head off |
| `/archive files` | File names by category, never what's inside. `category:` to narrow it |
| `/archive stats` | Files per category, people per department, keycards per level, this week's requests |
| `/archive delete file:` | Deletes a file |
| `/archive hierarchy channel:` | Posts the chain of command in a channel or forum, or updates what's already there |
| `/archive backup passphrase:` | DMs you an encrypted backup of `LEVEL_SECRETS` |

The old commands (`/grantkey`, `/rolekeys`, `/whois` and so on) are gone. Discord removes them when the new bot starts.

What the bot does on its own:

- **Request cards** update in place when someone approves or denies, and lose their buttons. If a request waits 24 hours it pings agents once.
- **Expiry reminders:** 3 days and 1 day before a temporary keycard runs out, the holder gets a DM and the log channel gets a list. Expired ones are turned off within the hour.
- **Approving a request** keeps the same expiry as the old keycard and moves their personnel file link and head spots to the new keycard.
- **Weekly summary** every Monday: new and updated files, keycards granted, requests.
- **Failed scans:** lots of wrong keycards from one connection gets a warning in the log. Someone could fake these pings, so treat it as a heads-up, not proof.
- **Status:** shows "Watching 42 files · 18 keycards".
- **Open on site** buttons go straight to the file (or the Requests tab for requests). The site opens it after you scan in.

Changes take 1 to 2 minutes to show on the site while GitHub rebuilds it. You can watch progress under the `halcyon` repo's **Actions** tab.

## On the site

- **Editing files.** The person who filed it, any RAISA agent, and the head of a Personnel file's department get an **Edit** button. Redacted parts show up as `[[3: text]]` so you can change them. You can only edit a file if you can read every redaction in it. Only RAISA can move someone to another department.
- **PENDING.** New files, edits and department moves show straight away with a PENDING tag and the site checks every 20 seconds until GitHub has caught up.
- **Search.** Tick **Also search inside files** to search the text of every file your key can open. The first search downloads them, so it takes a moment.
- **Links.** Any file name mentioned in another file (like SCP-5641) becomes a link.
- **Linked keycard.** Personnel files can be linked to an 8-character keycard ID. The file then shows that keycard's level and expiry, and history and requests show the person's name instead of a bare ID.
- **RAISA tab.** Agents can register departments, set heads, grant keycards (optionally temporary or DM'd by Discord user ID) and revoke them. A new keycard made on the site is shown once, so copy it.
- **Auto-lock.** After 15 minutes with no activity the terminal closes itself. Change `idleMinutes` in `CONFIG` at the top of the script.
- **Your requests.** The Request tab lists requests sent from that device and whether they were approved.

Files are now stored as a small summary in `files.json` plus the full text in `files/<id>.json`, so the list loads fast even with a lot of files. Old files still work, and the first edit moves them to the new format.

## Backing up LEVEL_SECRETS

If `LEVEL_SECRETS` is lost, every key and file stops working. Make a backup (Archive, Secrets backup in the config menu, or `/archive backup`) with a long passphrase and keep the file it DMs you plus the passphrase in a password manager. To restore, on your own computer in the bot folder:

```
node restore-secrets.js site56-secrets-backup.json
```

It asks for the passphrase and prints the line to paste into Railway as `LEVEL_SECRETS`.

## Good to know

- **The Railway address is fine to be public.** It only accepts uploads encrypted with a real key, it only answers your GitHub site, and it limits each person to 10 submissions a minute.
- **Revoking a key** stops it logging in. Someone technical who already used it could have kept the level passwords from their browser, but for roleplay that's fine.
- **Starting over:** to wipe everything, delete `LEVEL_SECRETS` on Railway, let it print a new one, and empty `keys.json` and `files.json`. Old keys and files stop working.
