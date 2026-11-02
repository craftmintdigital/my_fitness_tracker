# AWAKEN — Fitness System

A fitness tracker for your 6-week training and nutrition block that works like an RPG. It runs in the phone's browser, works offline, and **all data stays on your device**. Everything exports as `.txt` files you can drop straight into the Claude app for coaching.

## Game mechanics

| System | What it does |
|---|---|
| **Daily Quests** | Steps, protein, fibre, water, sleep, plus a workout on training days (or 10 min of mobility on rest days). +10 XP each, +50 XP bonus for clearing them all. |
| **Dungeons** | Workouts. Start one from your plan and it pre-fills the sets with this week's progression and your last weights. XP for every working set and cardio minute. |
| **New Records** | An estimated 1RM (Epley) above your previous best triggers a PR alert and +25 XP. |
| **Penalty Quest** | Missed yesterday's quests? You get a 20-minute brisk walk worth +20 XP. |
| **Routine Quests** | Your daily habits (wake time, no-phone, sun, deep work, Top 3 MVPs, reading, screens off), each with its own streak. +10 XP each, +30 for clearing them all. Edit them in Profile → System Settings. |
| **Today's Routine** | Time-blocked day plan with the current block highlighted. During the wake-time ramp (08:00 → 07:30 → 07:00) the whole day shifts with it. |
| **Stats** | STR (sets), END (cardio), AGI (steps/mobility), VIT (sleep/nutrition), DIS (clears, habits), INT (deep work, planning, reading). |
| **Levels & Ranks** | E → D (Lv10) → C (Lv20) → B (Lv35) → A (Lv50) → S (Lv70). A consistent 6-week block lands around C-rank. |
| **Pain flag** | If you log pain, the app tells you to pause that movement and get it reviewed. |

XP and stats are worked out again from your logs every time, so editing or deleting a workout never double-counts.

## Built-in plan: Hybrid Athlete Block 1 (bodyweight only, no gym)
| Day | Mission |
|---|---|
| Mon | Upper A: push focus (push-ups, table rows, pike push-ups, dips) |
| Tue | Easy run + runner armour (calves, tibialis, core) |
| Wed | Lower: Bulgarian split squats, single-leg RDL, sliding leg curls, step-ups, pogo hops |
| Thu | Upper B: pull focus (rows, backpack rows/curls, close-grip & decline push-ups) |
| Fri | **Hybrid Mission**: 400 m run + station rounds, logged for time (4 → 8 rounds) |
| Sat | Long easy run (35 → 50 min, week 6 = 5K time trial) |
| Sun | Active recovery: walk + mobility (rest-day quest) |

Daily step target ramps 7,000 → 8,500 → 10,000.

## 6-week progression (applied automatically in Plan & Train)
1. Baseline · 2. +1 rep · 3. Harder variation / +backpack load · 4. Deload (−1 set, stop 3–4 reps short) · 5. Volume (+1 set) · 6. Performance

Runs use their own week-by-week targets. Bodyweight sets: leave the kg field blank (BW). Bodyweight PRs = most reps in a set.

## Coaching workflow
1. **Status → Profile**: fill it in, then **Share profile .txt**. That creates `user_fitness_profile.txt`; add it to your Claude Project Knowledge.
2. Profile → **Paste / import profile** loads a coach-written `user_fitness_profile.txt` (including targets). To swap plans, ask the coach for this format and use **Plan → Edit → Import from text** (`weeks:a/b/c…` sets per-week targets):
   ```
   # Day 1 – Lower Body Strength
   Back Squat | 4 | 5 | 3 min | RPE 7 | brace hard
   Bike Intervals | 1 | 10x30s | — | hard | warm up | cardio
   ```
3. Set your calorie/protein/fibre targets in Profile → System Settings.
4. Log quests daily and workouts as you train.
5. **Records → Share report .txt** (last 7 days / 14 days / whole block) → attach it in the Claude app for review.

## Install on your phone
The app is static files, so any static host works. The easiest option is **GitHub Pages**: repo Settings → Pages → deploy from this branch → root. Open the URL on your phone, then:
- **iPhone (Safari):** Share → *Add to Home Screen*
- **Android (Chrome):** ⋮ → *Install app*

Local test: `python3 -m http.server` then open http://localhost:8000.

**Back up regularly** (Records → Export backup .txt). Clearing browser data or uninstalling deletes the local save.
