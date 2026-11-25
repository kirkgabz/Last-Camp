# Last Camp

An endless survival strategy game. Keep the fire burning and your survivors alive for as many nights as you can. Every night is harder than the last.

## How to run

- **Quick play (no accounts):** double-click `index.html`. Progress is saved in that browser only.
- **With online accounts on your computer:** `npm install`, then `npm run dev`, and open http://localhost:3000.
  This uses a temporary built-in database, so accounts reset when the server stops.
- **For real players:** deploy to Vercel (below). Players open your Vercel link, create an account,
  and their latest camp loads on any device they sign in from.

## Online accounts and saves

The game has its own small backend in `/api`:

| Route | What it does |
|---|---|
| `POST /api/auth` | `signup`, `signin`, `signout` (passwords hashed with scrypt, 60-day session tokens, lockout after 8 wrong passwords in 15 min) |
| `GET /api/save` | returns the signed-in player's current run and permanent progress |
| `PUT /api/save` | stores them (called automatically at the start of every day and dusk, on game over and on ember purchases) |

Data lives in a **Neon Postgres** database. The tables (`lc_users`, `lc_sessions`, `lc_saves`, `lc_login_fails`) are created automatically on first use.
Neon's free plan sleeps when nobody is playing and **wakes up by itself** on the next request, so nothing ever has to be restarted by hand.
If a player loses internet, the game keeps saving on their device and uploads when they are back online.

### Deploying (one time)

1. Push this folder to a GitHub repository (`.gitignore` already excludes `node_modules` and `preview`).
2. On vercel.com: **Add New → Project → import the repo → Deploy.** No build settings needed.
3. In the Vercel project: **Storage → Create Database → Neon (Postgres) → Create**, then connect it to the project.
   This adds the `DATABASE_URL` environment variable.
4. **Deployments → Redeploy** (so the API picks up the database).
5. Open your Vercel link and create an account. That's it.

Optional: to let people play from a downloaded `index.html` with online saves, set `DEPLOYED_URL` in `js/cloud.js`
to your Vercel address.

Note: the backend doesn't send email, so there is no "forgot password" reset yet.

## How to play

- **Day:** give each survivor a job: chop wood, hunt, fletch arrows, scavenge ruins, or rest.
- **Dusk:** spend resources on the fire, wall repairs, watchtowers, spike traps, tents, the armory and upgrades.
- **Night:** the dead attack. Click a survivor, then click the ground to move them or a watchtower to station them.
  Click the fire or press **F** to add wood. **If the fire goes out, the run ends.**
- Every 3 nights you pick a perk. Every 10th night a boss comes. Seasons change every 7 days.
- Dying gives you **embers**. Spend them in the main menu on permanent upgrades.

Keys: `F` feed the fire · `Space` pause · `1` `2` `3` game speed · `M` sound · `Esc` deselect

Progress saves automatically at the start of each day and dusk, on this device and to the player's account when signed in.

## Code layout

| File | Purpose |
|---|---|
| `js/util.js` | helpers, safe storage, synthesized sound effects |
| `js/data.js` | all tuning numbers: roles, enemies, perks, events, upgrades |
| `js/game.js` | run state, stats, camp geometry, save/load |
| `js/day.js` | day jobs, events, dusk building |
| `js/night.js` | night combat simulation and AI |
| `js/draw.js` | procedural drawing of people, creatures and buildings |
| `js/render.js` | scene rendering, lighting, particles, weather |
| `js/ui.js` | menus, panels, modals |
| `js/main.js` | game loop, input, game flow |
| `js/cloud.js` | accounts and online save sync (talks to `/api`) |
| `api/` | backend: `auth.js`, `save.js`, `_lib/db.js` (Neon / local PGlite), `_lib/http.js` |
| `dev-server.mjs` | local server for `npm run dev` |

To rebalance the game, start with `js/data.js` (`LC.ENEMIES`, `LC.ROLES`) and `N.budget` in `js/night.js`.
