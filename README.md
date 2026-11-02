# AWAKEN — Fitness System

A fitness tracker for your 6-week training and nutrition block that works like an RPG. It runs in the phone's browser, works offline, and **all data stays on your device**. Everything exports as `.txt` files you can drop straight into the Claude app for coaching.

## Game mechanics

| System | What it does |
|---|---|
| **Daily Quests** | Steps, protein, fibre, water, sleep, plus a workout on training days (or 10 min of mobility on rest days). +10 XP each, +50 XP bonus for clearing them all. |
| **Dungeons** | Workouts. Start one from your plan and it pre-fills the sets with this week's progression and your last weights. XP for every working set and cardio minute. |
| **New Records** | An estimated 1RM (Epley) above your previous best triggers a PR alert and +25 XP. |
| **Penalty Quest** | Missed yesterday's quests? You get a 20-minute brisk walk worth +20 XP. |
| **Stats** | STR (sets), END (cardio), AGI (steps/mobility), VIT (sleep/nutrition), DIS (full clears & streaks). |
| **Levels & Ranks** | E → D (Lv10) → C (Lv20) → B (Lv35) → A (Lv50) → S (Lv70). A consistent 6-week block lands around C-rank. |
| **Pain flag** | If you log pain, the app tells you to pause that movement and get it reviewed. |

XP and stats are worked out again from your logs every time, so editing or deleting a workout never double-counts.

## 6-week progression (applied automatically in Plan & Train)
1. Baseline · 2. +1 rep · 3. +2.5–5% load · 4. Deload (−1 set, ~10% lighter) · 5. Volume (+1 set) · 6. Performance

## Coaching workflow
1. **Status → Profile**: fill it in, then **Share profile .txt**. That creates `user_fitness_profile.txt`; add it to your Claude Project Knowledge.
2. Ask the coach for your plan in this format, then use **Plan → Edit → Import from text**:
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
