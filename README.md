# AWAKEN — Fitness System

A fitness tracker for your 6-week training and nutrition block that works like an RPG. It runs in the phone's browser, works offline, and **all data stays on your device**. Everything exports as `.txt` files you can drop straight into the Claude app for coaching.

## Game mechanics

| System | What it does |
|---|---|
| **Daily Quests** | Steps, protein, fibre, water, sleep, plus a workout on training days (or 10 min of mobility on rest days). +10 XP each, +50 XP bonus for clearing them all. |
| **Dungeons** | Workouts. Start one from your plan and it pre-fills the sets with this week's progression and your last weights. XP for every working set and cardio minute. Each lift has a **rest timer** set from the plan's rest time; it vibrates when rest is over. |
| **New Records** | An estimated 1RM (Epley) above your previous best triggers a PR alert and +25 XP. |
| **Penalty Quest** | Missed yesterday's quests? You get a 20-minute brisk walk worth +20 XP. |
| **Routine Quests** | Your daily habits (wake time, no-phone, sun, deep work, Top 3 MVPs, reading, screens off), each with its own streak. +10 XP each, +30 for clearing them all. Edit them in Profile and settings → Settings. |
| **Today's schedule** | Time-blocked day plan for the kind of day it is (run, strength or rest), with the current block highlighted. During the wake-time ramp (08:00 → 07:30 → 07:00) the whole day shifts with it. Today's mission on Status shows when it's planned. |
| **Stats** | STR (sets), END (cardio), AGI (steps/mobility), VIT (sleep/nutrition), DIS (clears, habits), INT (deep work, planning, reading). |
| **Levels & Ranks** | E → D (Lv10) → C (Lv20) → B (Lv35) → A (Lv50) → S (Lv70). A consistent 6-week block lands around C-rank. |
| **Pain flag** | If you log pain, the app tells you to pause that movement and get it reviewed. |

XP and stats are worked out again from your logs every time, so editing or deleting a workout never double-counts.

## Built-in plan: Hybrid Athlete Block 1 (bodyweight only, no gym)
Runs on Mon / Wed / Fri, strength on Tue / Thu / Sat, recovery on Sunday.

| Day | When | Mission |
|---|---|---|
| Mon | Morning | **Easy run** (25 → 35 min) + strides from week 3, then calves, tibialis, dead bugs |
| Tue | Late afternoon | **Strength A: squat + push**. Pogo hops, Bulgarian split squats, push-ups, step-ups, pike push-ups, hollow hold |
| Wed | Morning | **Hybrid Mission**: 400 m run + station rounds, logged for time (4 → 8 rounds). The week's only hard session |
| Thu | Late afternoon | **Strength B: pull + push, upper only**. Table rows, close-grip push-ups, backpack rows, dips, curls, Y-T-W, side plank |
| Fri | Morning | **Long easy run** (35 → 50 min, week 6 = 5K time trial) |
| Sat | Late afternoon | **Strength C: hinge + pull + jumps**. Squat jumps, single-leg RDLs, sliding leg curls, reverse lunges, glute bridges, door rows |
| Sun | Morning | Active recovery: long walk + mobility, weekly review, send the coach report |

When you open the app on the built-in plan from before, the System tells you about the upgrade once and offers **Restore old plan** in case you'd edited it. Your logs, records and XP are never touched, and a plan imported from your coach is never replaced.

### Why the plan looks like this
- **Legs train twice a week, with jumps.** In the research on runners, plyometrics alone barely changed running economy. Plyometrics combined with strength work had a large effect, and more than 2 sessions a week did better ([Kinesiology, 2023](https://hrcak.srce.hr/en/309864)). The old plan trained legs once.
- **Weekly sets matter more than the split.** Volume-matched studies find similar growth whether a muscle is trained once or several times a week, and training it about twice a week is an easy way to get to ~10+ hard sets (Schoenfeld et al. 2019 meta-analysis; see also this [review of the evidence](https://ro.ecu.edu.au/ecuworkspost2013/5665)). Each muscle group now gets two sessions.
- **Bodyweight is enough if you push close to failure.** Light and heavy loads build the same muscle when sets go near failure; heavy loads mainly add maximal strength ([Schoenfeld et al. 2017](https://pubmed.ncbi.nlm.nih.gov/28834797/)). That's why the last set of each exercise goes to 1 rep short.
- **Running gets in the way of lifting more than cycling does**, especially when there's a lot of it (Wilson et al. 2012 meta-analysis, *J Strength Cond Res*). So runs and leg sessions are on different days, and Thursday has no leg work before Friday's long run.
- **Mostly easy, one hard day.** For recreational athletes, polarized (80/20) and pyramidal intensity mixes work about equally well, and both beat lots of threshold work (2024 *Sports Medicine* network meta-analysis; [2018 systematic review](https://pubmed.ncbi.nlm.nih.gov/29182410/)). Mon and Fri stay conversational; Wednesday is the only session meant to hurt.
- **Run time grows slowly.** In novice runners, increasing weekly distance by more than 30% was linked to more injuries than increasing it by under 10% (not quite statistically significant) ([Nielsen et al. 2014](https://vbn.aau.dk/ws/files/284775170/e000333.full.pdf)). Week-to-week jumps here stay well under 30%, with a deload in week 4.
- **One race-style session a week** is also what HYROX athletes and coaches recommend, with the rest of the week on strength and running ([Red Bull, HYROX pros](https://www.redbull.com/ie-en/hyrox-pros-running-lifting-training-tips)).

### Morning or evening?
- **There's no clear winner.** A 2023 meta-analysis found no evidence that one time of day is better overall. It did find bigger gains when you train at the time you'll be tested or race ([Bruggisser et al. 2023](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10198889/)).
- **Evening strength may build a little more muscle over time.** In a 24-week study of combined strength and endurance training, the evening groups gained more muscle in weeks 13–24, though not in the first 12 ([Küüsmaa et al. 2016](https://pubmed.ncbi.nlm.nih.gov/27863207/)).
- **Evening training doesn't hurt sleep**, unless it's vigorous and ends within about an hour of bedtime ([Stutz et al. 2019](https://pubmed.ncbi.nlm.nih.gov/30374942/)).

So the schedule splits it: **runs stay in the morning** (marathons and most races start then, and runs pair with your morning sun habit) and **strength moves to 17:15**, ending around 18:15, more than 4 hours before bed. The bigger factor is consistency. If evening lifting keeps getting squeezed out by work, move it back to the morning in Settings; that beats skipping it.

The daily schedule changes with the day: lines tagged `[run]`, `[strength]` or `[rest]` only show on that kind of day. A schedule you've edited yourself isn't replaced; add the tags to your own lines if you want them.

Daily step target ramps 7,000 → 8,500 → 10,000.

## 6-week progression (applied automatically in Plan & Train)
1. Baseline · 2. +1 rep · 3. Harder variation / +backpack load · 4. Deload (−1 set, stop 3–4 reps short) · 5. Volume (+1 set) · 6. Performance

Runs use their own week-by-week targets. Bodyweight sets: leave the kg field blank (BW). Bodyweight PRs = most reps in a set.

## Coaching workflow
1. **Status → Profile and settings**: fill it in, then **Share profile** (it says **Download profile** on devices that can't share files). That creates `user_fitness_profile.txt`; add it to your Claude Project Knowledge.
2. Profile → **Paste a profile** loads a coach-written `user_fitness_profile.txt` (including targets). To swap plans, ask the coach for this format and use **Plan → Edit plan → Import from text** (`weeks:a/b/c…` sets per-week targets):
   ```
   # Day 1 – Lower Body Strength
   Back Squat | 4 | 5 | 3 min | RPE 7 | brace hard
   Bike Intervals | 1 | 10x30s | — | hard | warm up | cardio
   ```
3. Set your calorie/protein/fibre targets in Profile and settings → Settings.
4. Log quests daily and workouts as you train.
5. **Records → Share report** (last 7 days / 14 days / whole block) → attach it in the Claude app for review.

## Look and feel
The **System** is the one thing that glows: today's mission on Status and the System pop-ups (level up, rank up, dungeon cleared). Everything else stays quiet. Cyan marks things you can tap, gold marks things you've earned (XP, level, records, rank). The System speaks in Oxanium; everything else is set in Atkinson Hyperlegible, a typeface designed to read at a glance. Both fonts are bundled in `fonts/` (SIL Open Font License), so the app stays fully offline. Clearing a dungeon is the one big animated moment; every other animation responds to something you tapped, and all of it switches off if your phone is set to reduce motion.

## Install on your phone
The app is static files, so any static host works. The easiest option is **GitHub Pages**: repo Settings → Pages → deploy from this branch → root. Open the URL on your phone, then:
- **iPhone (Safari):** Share → *Add to Home Screen*
- **Android (Chrome):** ⋮ → *Install app*

**Updates:** when a new version is published, the app shows **Update ready** under the top bar the next time you open it (or come back to it). Tap **Reload** to switch; a workout in progress is saved first. If you opened the app fresh and already have the new version, you won't be asked. The very first update after installing this version may still need one full close and reopen.

Local test: `python3 -m http.server` then open http://localhost:8000.

## Cloud sync (optional): secret GitHub Gist
Records → **Cloud sync**. Paste a GitHub **classic** token with only the `gist` scope (github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)). The app creates a secret gist and auto-syncs about 15 s after each change and whenever you leave the app. The gist contains:
- `awaken_save.json`: the full save (restore it on a new device with the same token + Gist ID)
- `coach_report_all.txt` / `coach_report_last7.txt`: ready to attach to a Claude chat
- `user_fitness_profile.txt`

Download it all from the gist page → **Download ZIP**. The token is stored only on your device and is never uploaded. A *secret* gist is unlisted, but anyone with its URL can view it, so don't share the link.

Without sync, data lives only on the device: back up regularly (Records → Backups → Share/Download backup).
