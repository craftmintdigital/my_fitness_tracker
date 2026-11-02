/* AWAKEN — gamified fitness system.
 * All data lives in localStorage on this device. Export/import uses .txt files
 * so logs can be attached straight into a Claude chat for coaching.
 * XP, levels, stats and PRs are DERIVED from the raw logs every render,
 * so editing or deleting a log never double-counts rewards.
 */
(() => {
  'use strict';

  const STORE_KEY = 'awaken.save.v1';
  const PROGRAM_WEEKS = 6;

  // ------------------------------------------------------------------ utils
  const $ = (s, el = document) => el.querySelector(s);
  const pad = n => String(n).padStart(2, '0');
  const dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dkey(d); };
  const daysBetween = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 86400000);
  const num = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const round25 = w => Math.round(w / 2.5) * 2.5;
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const fmtDate = k => { const d = parseKey(k); return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`; };
  const e1rm = (w, r) => (w > 0 && r > 0 && r <= 30) ? w * (1 + r / 30) : 0;
  const fmtW = w => (num(w) > 0 ? `${num(w)}kg` : 'BW');

  // ------------------------------------------------------------------ default data
  const ex = (name, sets, reps, rest, load, notes = '', type = 'strength', weeks) => ({ name, sets, reps, rest, load, notes, type, ...(weeks ? { weeks } : {}) });
  const run = (name, weeks, load, notes) => ex(name, 1, weeks[0], '—', load, notes, 'cardio', weeks);

  // Hybrid athlete block: bodyweight-only hypertrophy + aerobic base for future marathon / HYROX-style racing.
  // Runs Mon/Wed/Fri, strength Tue/Thu/Sat, Sunday active recovery. dow = weekday (0 Sun … 6 Sat).
  // Upper days sit between runs; the leg day is Saturday so it never blunts the Wed mission or Fri long run.
  const OLD_STARTER_NOTE = 'Starter template.';
  const DEFAULT_PROGRAM = {
    id: 'hybrid-bw-v2',
    note: 'Hybrid Athlete Block 1 (bodyweight, no gym). Strength sets end 1–3 reps short of failure (RIR 1–3). When you beat the top of a rep range on every set, move to the next variation or add backpack load (books / water bottles). Easy runs = conversational pace, RPE 3–4/10 — if you can\'t speak in sentences, slow down or walk. Sunday = active recovery (walk + mobility).',
    steps: [7000, 7000, 8500, 8500, 10000, 10000],
    days: [
      { dow: 2, name: 'Tue – Upper A: Push Protocol', exercises: [
        ex('Push-up', 4, '8–15', '90 s', 'RIR 1–2', 'Ladder: incline → standard → feet-elevated → deficit (hands on books) → archer.'),
        ex('Inverted Table Row', 4, '8–12', '90 s', 'RIR 1–2', 'Lie under a sturdy table, grip edge, body straight. Ladder: knees bent → legs straight → feet on chair → backpack on chest.'),
        ex('Pike Push-up', 3, '6–12', '90 s', 'RIR 2', 'Hips high, head to a spot in front of hands. Harder: feet on a chair.'),
        ex('Chair Dip', 3, '8–15', '90 s', 'RIR 2', 'Two sturdy chairs or bed edge. Stop if front of shoulder hurts.'),
        ex('Towel Door Row', 3, '12–15', '60 s', 'RIR 1–2', 'Towel round a door handle (door closed, you on the hinge side). Squeeze shoulder blades.'),
        ex('Hollow Body Hold', 3, '20s', '45 s', 'Bodyweight', 'Low back glued to floor. Bend knees if it lifts.'),
      ]},
      { dow: 1, name: 'Mon – Easy Run + Runner Armour', exercises: [
        run('Easy Run (Zone 2)', ['25 min (run 4 / walk 1)', '30 min (run 5 / walk 1)', '30 min continuous', '25 min easy', '35 min + 4×20s strides', '40 min + 6×20s strides'], 'RPE 3–4, conversational', 'Soft surface if possible. Strides = smooth fast 20s, full walk-back recovery.'),
        ex('Single-leg Calf Raise', 3, '12–20', '45 s', 'Bodyweight → backpack', 'On a stair edge, full stretch at bottom, 2 s pause at top. Shin & Achilles insurance.'),
        ex('Tibialis Raise', 2, '20', '45 s', 'Bodyweight', 'Back against wall, heels ~30 cm out, lift toes.'),
        ex('Side Plank', 3, '30s', '30 s', 'Each side', 'Hips high, straight line.'),
        ex('Dead Bug', 3, '8', '45 s', 'Each side', 'Slow. Exhale fully, low back stays down.'),
      ]},
      { dow: 6, name: 'Sat – Lower: Leg Day Protocol', exercises: [
        ex('Bulgarian Split Squat', 4, '8–12', '90 s', 'RIR 1–2 (backpack when >15 reps)', 'Rear foot on bed/chair. Reps are per leg. Torso slightly forward = more glutes.'),
        ex('Single-leg RDL', 3, '10–12', '75 s', 'Backpack in opposite hand', 'Per leg. Hips square, soft knee, feel the hamstring.'),
        ex('Sliding Leg Curl', 3, '8–12', '75 s', 'RIR 1–2', 'Socks on tiles / towel. Bridge up, slide heels out & back. Harder: single leg.'),
        ex('Step-up', 3, '10', '60 s', 'Backpack', 'Per leg. Knee-height chair/stair, drive through the front heel, no push-off from back leg.'),
        ex('Pogo Hops', 3, '20', '60 s', 'Bodyweight', 'Small, quick, stiff ankles. Tendon prep for running. Skip if shins are sore.'),
        ex('Single-leg Glute Bridge', 3, '12', '45 s', 'Each side', '2 s squeeze at top.'),
      ]},
      { dow: 4, name: 'Thu – Upper B: Pull Protocol', exercises: [
        ex('Inverted Table Row', 4, '8–12', '90 s', 'RIR 1 (harder variation than Tue)', 'Feet elevated or backpack on chest once 12 reps is easy.'),
        ex('Close-grip Push-up', 4, '8–15', '90 s', 'RIR 1–2', 'Hands under shoulders, elbows brush ribs — triceps focus.'),
        ex('Backpack Bent-over Row', 3, '10–15', '75 s', 'Loaded backpack', 'Hinge to ~45°, pull bag to belly button.'),
        ex('Decline Push-up', 3, '8–15', '75 s', 'RIR 1–2', 'Feet on chair — upper chest & shoulders.'),
        ex('Backpack Curl', 3, '12–15', '60 s', 'Loaded backpack', 'Hold by the top handle/straps, slow lowering.'),
        ex('Prone Y-T-W Raise', 2, '10', '45 s', 'Bodyweight', 'Each letter. Thumbs up, squeeze upper back. Posture & shoulder health.'),
      ]},
      { dow: 3, name: 'Wed – HYBRID MISSION (race sim)', exercises: [
        run('Mission Circuit', ['4 rounds', '5 rounds', '6 rounds', '4 rounds (easy)', '7 rounds', '8 rounds — FOR TIME'], 'Steady, RPE 6–7 (Wk6 race effort)',
          'Each round = 400m run (~2–3 min) + next station in order: 1) 10 burpee broad jumps 2) 20 walking lunges (backpack) 3) 30 m bear crawl 4) 15 push-ups 5) 15 backpack squat-to-press 6) 20 mountain climbers/side 7) 60 s backpack carry 8) 20 sit-ups. Log TOTAL minutes — beat it next week.'),
        ex('Plank', 2, '45s', '45 s', 'Bodyweight', 'Cool-down core. Then 5 min walk.'),
      ]},
      { dow: 5, name: 'Fri – Long Run (Endurance Raid)', exercises: [
        run('Long Easy Run', ['35 min run/walk', '40 min run/walk', '45 min easy', '35 min easy', '50 min easy', '5K TIME TRIAL + 15 min easy'], 'RPE 3–4 (Wk6 trial: hard but even)', 'Slow enough to talk. Water + pinch of salt + lemon after. Walk breaks are allowed, not failure.'),
        ex('Single-leg Calf Raise', 2, '15–20', '45 s', 'Bodyweight', 'Post-run.'),
      ]},
    ],
  };

  DEFAULT_PROGRAM.days.sort((a, b) => a.dow - b.dow);

  const WEEK_FOCUS = [
    { t: 'Baseline', d: 'Find your level: pick the variation that hits the rep range at RIR 2. Runs are run/walk — keep them easy.' },
    { t: '+1 Rep', d: 'Same variations as Week 1, add 1 rep to every set. Runs get 5 min longer.' },
    { t: '+Load', d: 'Harder variation or add backpack weight. First continuous runs.' },
    { t: 'Deload', d: 'One fewer set, stop 3–4 reps short of failure, shorter runs. Recover and absorb.' },
    { t: 'Volume', d: '+1 set on every strength exercise. Longest runs so far + strides.' },
    { t: 'Performance', d: 'Beat Week 3 on every lift. Wed: 8-round mission for time. Fri: 5K time trial.' },
  ];

  const RANKS = [
    { r: 'E', min: 1, title: 'Awakened' },
    { r: 'D', min: 10, title: 'Iron Will' },
    { r: 'C', min: 20, title: 'Steel Body' },
    { r: 'B', min: 35, title: 'Vanguard' },
    { r: 'A', min: 50, title: 'Elite' },
    { r: 'S', min: 70, title: 'Apex' },
  ];

  const STAT_INFO = {
    STR: 'Strength — working sets lifted',
    END: 'Endurance — cardio & conditioning',
    AGI: 'Agility — steps & mobility',
    VIT: 'Vitality — sleep, protein, fibre, water',
    DIS: 'Discipline — quest clears & routine habits',
    INT: 'Intellect — deep work, planning, reading',
  };

  // Daily routine habits (training itself is the Dungeon quest). {wake} = this week's wake-up time.
  const DEFAULT_HABITS = [
    { id: 'wake', label: 'Wake up by {wake}', stat: 'DIS' },
    { id: 'nophone', label: 'No phone for 30 min after waking', stat: 'DIS' },
    { id: 'sun', label: 'Morning sunlight (10+ min outdoors)', stat: 'VIT' },
    { id: 'deepwork', label: '90 min deep work block', stat: 'INT' },
    { id: 'mvp', label: "Plan tomorrow's Top 3 MVPs", stat: 'INT' },
    { id: 'read', label: 'Read 20 min', stat: 'INT' },
    { id: 'screenoff', label: 'Screens off 30 min before bed', stat: 'VIT' },
  ];
  // Shift wake time gradually (~30 min per week) — abrupt shifts wreck sleep.
  const DEFAULT_WAKE_RAMP = ['08:00', '07:30', '07:00', '07:00', '07:00', '07:00'];
  const DEFAULT_ROUTINE = `07:00 Wake · 500 ml water + pinch of salt · NO PHONE
07:05 Outside: 10 min morning sun + 5 min mobility
07:30 Pre-training fuel: banana + 2 dates (phone still off)
07:45 TRAINING — today's mission (runs outdoors = more sun)
08:45 Shower + protein breakfast
09:30 DEEP WORK 90 min — phone in another room, one task only
11:00 Venture work / calls / email
13:00 Lunch + 10 min walk
13:45 Venture work
16:30 Snack (sattu + peanuts + fruit)
17:00 Admin / meetings · evening walk to hit steps
19:30 Dinner (2.5–3 h before bed)
21:30 Shutdown: plan tomorrow's Top 3 MVPs · haldi milk
22:15 SCREENS OFF → read 20 min
22:45 Lights out (8 h+ sleep → 07:00)`;

  const blankState = () => ({
    version: 1,
    profile: {
      name: '', age: '', height: '', weight: '', bodyFat: '',
      goal: '', secondaryGoals: '', targetWeight: '', timeline: '',
      experience: '', activity: '', steps: '',
      likes: '', dislikes: '',
      daysPerWeek: '', sessionLength: '', equipment: '',
      injuries: '', medical: '', restrictions: '',
      diet: '', foodLikes: '', foodDislikes: '', allergies: '', cooking: '', budget: '', eatingSchedule: '',
      notes: '',
    },
    startDate: dkey(),
    trainingDays: [1, 2, 3, 4, 5, 6], // Mon–Sat, Sunday = active recovery
    targets: { steps: 7000, protein: 150, water: 3.5, sleep: 8, fibre: 35, calories: 3200 },
    days: {},
    workouts: [],
    program: JSON.parse(JSON.stringify(DEFAULT_PROGRAM)),
    draft: null,
    seenLevel: 1,
    seenRank: 'E',
    seenPenalty: '',
    habits: JSON.parse(JSON.stringify(DEFAULT_HABITS)),
    wakeRamp: [...DEFAULT_WAKE_RAMP],
    routine: DEFAULT_ROUTINE,
    onboarded: false,
  });

  // ------------------------------------------------------------------ state
  let S = load();
  let tab = 'status';
  let planWeek = null;
  let planEdit = false;
  let recordsRange = 7;
  let questDate = dkey();

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return migrate(JSON.parse(raw));
    } catch (e) { console.warn('load failed', e); }
    return blankState();
  }
  function migrate(s) {
    const b = blankState();
    const out = { ...b, ...s, profile: { ...b.profile, ...(s.profile || {}) }, targets: { ...b.targets, ...(s.targets || {}) } };
    // Upgrade saves still on the old generic starter template to the personalised hybrid block.
    if (!out.program || String(out.program.note || '').startsWith(OLD_STARTER_NOTE)) {
      out.program = JSON.parse(JSON.stringify(DEFAULT_PROGRAM));
      if (JSON.stringify(out.trainingDays) === '[1,2,4,5]') out.trainingDays = b.trainingDays;
      const oldT = { steps: 8000, protein: 140, water: 3, sleep: 7, fibre: 30, calories: 0 };
      Object.keys(oldT).forEach(k => { if (out.targets[k] === oldT[k]) out.targets[k] = b.targets[k]; });
    }
    migrateScheduleV2(out.program);
    return out;
  }
  /** Block 1 v1 had strength Mon/Wed/Thu and runs Tue/Fri/Sat. Move it to runs Mon/Wed/Fri + strength
   *  Tue/Thu/Sat, keeping any edits to exercises. Only touches a plan whose days are all the original
   *  v1 days, so a coach-imported plan is never reshuffled. */
  function migrateScheduleV2(prog) {
    if (!prog || prog.id !== 'hybrid-bw-v1' || !Array.isArray(prog.days)) return;
    const MAP = [['Mon – Upper A', 1, 2], ['Tue – Easy Run', 2, 1], ['Wed – Lower', 3, 6], ['Thu – Upper B', 4, 4], ['Fri – HYBRID MISSION', 5, 3], ['Sat – Long Run', 6, 5]];
    const hit = d => MAP.find(([n, o]) => String(d.name).startsWith(n) && d.dow === o);
    if (!prog.days.length || !prog.days.every(hit)) return;
    prog.days.forEach(d => {
      const to = hit(d)[2];
      d.dow = to;
      d.name = WEEKDAYS[to] + d.name.slice(3);
      (d.exercises || []).forEach(e => { if (typeof e.load === 'string') e.load = e.load.replace('than Mon)', 'than Tue)'); });
    });
    prog.days.sort((a, b) => a.dow - b.dow);
    prog.id = 'hybrid-bw-v2';
  }
  /** touch=false for bookkeeping writes (seen level etc.) that shouldn't count as new data for sync. */
  function save(touch = true) {
    if (touch) S.updatedAt = Date.now();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
    catch (e) { toast('⚠ Could not save — storage full?'); }
    if (touch) scheduleSync();
  }
  const day = k => (S.days[k] ||= {});

  // ------------------------------------------------------------------ derived game logic
  const xpToNext = L => 100 + 25 * (L - 1);
  const xpForLevel = L => 100 * (L - 1) + 12.5 * (L - 1) * (L - 2);
  function levelFromXp(xp) { let L = 1; while (xpForLevel(L + 1) <= xp) L++; return L; }
  const rankFor = L => [...RANKS].reverse().find(r => L >= r.min);

  const isTrainingDay = k => S.trainingDays.includes(parseKey(k).getDay());
  const workoutsOn = k => S.workouts.filter(w => w.date === k);

  function questsFor(k) {
    const d = S.days[k] || {};
    const T = S.targets;
    const q = [
      { id: 'steps', label: 'Walk', unit: 'steps', target: stepTarget(k), value: num(d.steps), stat: 'AGI', input: true, step: 500 },
      { id: 'protein', label: 'Protein', unit: 'g', target: T.protein, value: num(d.protein), stat: 'VIT', input: true, step: 5 },
      { id: 'fibre', label: 'Fibre', unit: 'g', target: T.fibre, value: num(d.fibre), stat: 'VIT', input: true, step: 1 },
      { id: 'water', label: 'Water', unit: 'L', target: T.water, value: num(d.water), stat: 'VIT', input: true, step: 0.25 },
      { id: 'sleep', label: 'Sleep', unit: 'h', target: T.sleep, value: num(d.sleep), stat: 'VIT', input: true, step: 0.25 },
    ];
    if (isTrainingDay(k)) {
      q.push({ id: 'workout', label: `Clear today's Dungeon${todayMission(k) ? ': ' + todayMission(k) : ''}`, target: 1, value: workoutsOn(k).length ? 1 : 0, stat: 'STR', auto: true });
    } else {
      q.push({ id: 'mobility', label: 'Recovery: 10 min mobility / stretch', target: 1, value: (d.mobility || workoutsOn(k).length) ? 1 : 0, stat: 'AGI', toggle: true });
    }
    q.forEach(x => { x.done = x.target > 0 && x.value >= x.target; });
    return q;
  }
  function todayMission(k) {
    const dow = parseKey(k).getDay();
    const d = S.program.days.find(x => x.dow === dow);
    return d ? d.name.replace(/^\w{3}\s*–\s*/, '') : '';
  }
  function stepTarget(k) {
    const ramp = S.program && S.program.steps;
    const wk = programWeek(k);
    if (Array.isArray(ramp) && ramp.length && wk >= 1) return ramp[Math.min(wk, ramp.length) - 1];
    return S.targets.steps;
  }
  function wakeTime(k) {
    const wk = programWeek(k), r = S.wakeRamp || [];
    if (!r.length) return '07:00';
    return r[Math.min(Math.max(wk, 1), r.length) - 1];
  }
  function habitsFor(k) {
    const d = S.days[k] || {};
    return (S.habits || []).map(h => ({ ...h, label: h.label.replace('{wake}', wakeTime(k)), done: !!d['h_' + h.id] }));
  }
  function habitStreak(id) {
    let k = dkey(), n = 0;
    if (!(S.days[k] || {})['h_' + id]) k = addDays(k, -1);
    while ((S.days[k] || {})['h_' + id]) { n++; k = addDays(k, -1); }
    return n;
  }
  const dayCleared = k => questsFor(k).every(q => q.done);

  function penaltyFor(k) {
    const y = addDays(k, -1);
    if (y < S.startDate) return null;
    if (dayCleared(y)) return null;
    const d = S.days[k] || {};
    return { id: 'penalty', label: 'PENALTY: 20 min brisk walk', sub: 'Yesterday\'s quests were not cleared.', done: !!d.penalty };
  }

  /** Derive everything game-related from raw logs. */
  function derive() {
    const stats = { STR: 0, END: 0, AGI: 0, VIT: 0, DIS: 0, INT: 0 };
    let xp = 0;
    const best = {};       // exercise -> {e1rm, w, r, date}
    const wxp = {};        // workout id -> {xp, prs:[]}
    const clears = {};

    // daily quests (from start date up to today)
    const today = dkey();
    const keys = new Set(Object.keys(S.days));
    S.workouts.forEach(w => keys.add(w.date));
    [...keys].filter(k => k <= today).forEach(k => {
      const qs = questsFor(k);
      qs.forEach(q => { if (q.done) { xp += 10; stats[q.stat] += 1; } });
      if (qs.every(q => q.done)) { xp += 50; stats.DIS += 2; clears[k] = true; }
      const p = penaltyFor(k);
      if (p && p.done) { xp += 20; stats.END += 1; }
      const hs = habitsFor(k);
      hs.forEach(h => { if (h.done) { xp += 10; if (stats[h.stat] !== undefined) stats[h.stat] += 1; } });
      if (hs.length && hs.every(h => h.done)) { xp += 30; stats.DIS += 1; }
    });

    // workouts, chronological for PR detection
    [...S.workouts].sort((a, b) => (a.date + a.id).localeCompare(b.date + b.id)).forEach(w => {
      let x = 30; const prs = [];
      let sets = 0, minutes = 0;
      (w.exercises || []).forEach(e => {
        const key = e.name.trim().toLowerCase();
        if (!key) return;
        if (e.type === 'cardio') { minutes += num(e.min); return; }
        // Loaded sets score by estimated 1RM; bodyweight sets score by max reps (tracked separately).
        const tops = {};
        (e.sets || []).forEach(s => {
          const W = num(s.w), R = num(s.r);
          if (R > 0) sets++;
          const bw = W <= 0;
          const v = bw ? R : e1rm(W, R);
          const k2 = key + (bw ? '|bw' : '');
          if (v && (!tops[k2] || v > tops[k2].score)) tops[k2] = { score: v, w: W, r: R, bw, date: w.date };
        });
        Object.entries(tops).forEach(([k2, top]) => {
          if (best[k2] && top.score > best[k2].score + 0.01 && !prs.includes(e.name)) { prs.push(e.name); x += 25; }
          if (!best[k2] || top.score > best[k2].score) best[k2] = { ...top, name: e.name };
        });
      });
      x += sets * 3 + Math.round(minutes * 0.8);
      if (w.energy || w.difficulty) x += 10; // reflection bonus
      stats.STR += Math.round(sets / 3);
      stats.END += Math.round(minutes / 10);
      xp += x;
      wxp[w.id] = { xp: x, prs, sets, minutes };
    });

    // streak
    let streak = 0;
    let k = dayCleared(today) ? today : addDays(today, -1);
    while (k >= S.startDate && clears[k]) { streak++; k = addDays(k, -1); }
    if (streak >= 7) stats.DIS += Math.floor(streak / 7) * 3;

    const level = levelFromXp(xp);
    const rank = rankFor(level);
    Object.keys(stats).forEach(s => { stats[s] += 10; });
    return { xp, level, rank, stats, best, wxp, streak, clears,
      into: xp - xpForLevel(level), need: xpToNext(level) };
  }

  function programWeek(k = dkey()) {
    const n = Math.floor(daysBetween(S.startDate, k) / 7) + 1;
    return n;
  }

  /** Apply the 6-week progression to a planned exercise. */
  function prescribe(e, wk) {
    let sets = num(e.sets) || 1;
    let reps = String(e.reps || '');
    let load = e.load || '';
    const add = t => { load = load ? `${load} · ${t}` : t; };
    const perWeek = Array.isArray(e.weeks) && e.weeks[wk - 1];
    if (perWeek) reps = perWeek;
    if (e.type === 'strength') {
      if (wk === 2 && !perWeek) reps = bumpReps(reps);
      if (wk === 3) add('harder variation or +backpack load');
      if (wk === 4) { sets = Math.max(2, sets - 1); add('easier: stop 3–4 reps short'); }
      if (wk === 5) sets += 1;
      if (wk === 6) add('beat Wk3');
    } else if (wk === 4 && !perWeek) {
      add('easier, shorter');
    }
    return { ...e, sets, reps, load };
  }

  /** +1 rep (or +5 s for timed holds), handling ranges like "8–12". */
  function bumpReps(reps) {
    const m = String(reps).match(/^(\d+)(?:\s*[-–]\s*(\d+))?(.*)$/);
    if (!m) return reps;
    const inc = /^s\b|^s$|^\s*sec/i.test(m[3].trim()) ? 5 : 1;
    return (+m[1] + inc) + (m[2] ? '–' + (+m[2] + inc) : '') + m[3];
  }

  function lastPerformance(name, beforeDate = '9999') {
    const key = name.trim().toLowerCase();
    const ws = S.workouts.filter(w => w.date <= beforeDate).sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
    for (const w of ws) {
      const e = (w.exercises || []).find(x => x.name.trim().toLowerCase() === key);
      if (e) return { date: w.date, e };
    }
    return null;
  }
  function suggestLoad(name) {
    const last = lastPerformance(name);
    if (!last || last.e.type === 'cardio') return '';
    const sets = (last.e.sets || []).filter(s => num(s.r) > 0);
    if (!sets.length) return '';
    const top = sets.reduce((a, b) => (num(b.w) > num(a.w) ? b : a));
    if (num(top.w) <= 0) {
      const wk0 = programWeek();
      return `Last: BW × ${sets.map(s => num(s.r)).join('/')} → ${wk0 === 4 ? 'deload: stop 3–4 reps short' : wk0 === 3 || wk0 === 6 ? 'harder variation or add backpack' : 'beat it by 1 rep per set'}`;
    }
    const allHit = sets.every(s => num(s.w) >= num(top.w));
    const wk = programWeek();
    let hint = `Last: ${num(top.w)}kg × ${sets.map(s => num(s.r)).join('/')}`;
    if (wk === 3 || wk === 6) hint += ` → try ${round25(num(top.w) * 1.025)}–${round25(num(top.w) * 1.05)}kg`;
    else if (wk === 4) hint += ` → deload ~${round25(num(top.w) * 0.9)}kg`;
    else if (allHit) hint += ` → same load, chase reps`;
    return hint;
  }

  // ------------------------------------------------------------------ text exports
  function workoutTxt(w) {
    const lines = ['Workout Log', '', `Date: ${w.date} (${fmtDate(w.date)})`, `Day: ${w.dayName || 'Custom'}`];
    if (S.startDate) lines.push(`Program Week: ${programWeek(w.date)} of ${PROGRAM_WEEKS}`);
    lines.push('');
    (w.exercises || []).forEach(e => {
      if (!e.name.trim()) return;
      lines.push(e.name);
      if (e.type === 'cardio') {
        lines.push(`${num(e.min) || '?'} min${e.dist ? ` · ${e.dist} km` : ''}`);
      } else {
        (e.sets || []).filter(s => s.r !== '' || s.w !== '').forEach(s => lines.push(`${fmtW(s.w)} x ${num(s.r)}`));
      }
      if (e.note) lines.push(`(${e.note})`);
      lines.push('');
    });
    if (w.notes) lines.push(w.notes);
    if (w.energy) lines.push(`Energy ${w.energy}/10`);
    if (w.difficulty) lines.push(`Difficulty ${w.difficulty}/10`);
    if (w.sleepQ) lines.push(`Sleep quality ${w.sleepQ}/10`);
    lines.push(`Pain: ${w.pain ? 'YES — ' + (w.painNote || 'unspecified') : 'none'}`);
    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  function profileTxt() {
    const p = S.profile;
    return `USER FITNESS PROFILE

Personal Data
Name: ${p.name}
Age: ${p.age}
Height: ${p.height}
Weight: ${p.weight}
Body Fat Estimate: ${p.bodyFat}

Goals
Primary Goal: ${p.goal}
Secondary Goals: ${p.secondaryGoals}
Target Weight: ${p.targetWeight}
Timeline: ${p.timeline}

Training Background
Experience Level: ${p.experience}
Weekly Activity Level: ${p.activity}
Average Daily Steps: ${p.steps}

Preferences
Favourite Training Styles: ${p.likes}
Disliked Training Styles: ${p.dislikes}

Training Availability
Days Per Week: ${p.daysPerWeek}
Preferred Training Days: ${S.trainingDays.map(d => WEEKDAYS[d]).join(', ')}
Session Length: ${p.sessionLength}

Equipment Access: ${p.equipment}

Health Information
Injuries: ${p.injuries}
Medical Conditions: ${p.medical}
Restrictions: ${p.restrictions}

Nutrition Profile
Diet Preference: ${p.diet}
Food Likes: ${p.foodLikes}
Food Dislikes: ${p.foodDislikes}
Allergies/Intolerances: ${p.allergies}
Cooking Ability: ${p.cooking}
Budget: ${p.budget}
Daily Eating Schedule: ${p.eatingSchedule}

Current Daily Targets (app)
Calories: ${S.targets.calories || 'not set'}
Protein: ${S.targets.protein} g
Fibre: ${S.targets.fibre} g
Water: ${S.targets.water} L
Sleep: ${S.targets.sleep} h
Steps: ${S.targets.steps}

Coach Notes:
${p.notes}
`;
  }

  function reportTxt(rangeDays) {
    const D = derive();
    const today = dkey();
    const from = rangeDays ? addDays(today, -(rangeDays - 1)) : S.startDate;
    const L = [];
    L.push('COACH CHECK-IN REPORT');
    L.push(`Generated: ${today}`);
    L.push(`Athlete: ${S.profile.name || '—'}`);
    L.push(`Program start: ${S.startDate} · Current week: ${programWeek()} of ${PROGRAM_WEEKS} (${(WEEK_FOCUS[programWeek() - 1] || { t: 'post-block' }).t})`);
    L.push(`Range: ${from} → ${today}`);
    L.push(`Level ${D.level} · Rank ${D.rank.r} · Quest streak ${D.streak} days`);
    L.push('');
    L.push('DAILY HABITS (target in brackets)');
    const T = S.targets;
    L.push(`date        | steps(${T.steps}) | protein(${T.protein}g) | fibre(${T.fibre}g) | water(${T.water}L) | sleep(${T.sleep}h) | kcal | weight | cleared`);
    let k = from;
    const weights = [];
    while (k <= today) {
      const d = S.days[k] || {};
      if (d.weight) weights.push([k, num(d.weight)]);
      L.push(`${k} | ${d.steps || '-'} | ${d.protein || '-'} | ${d.fibre || '-'} | ${d.water || '-'} | ${d.sleep || '-'} | ${d.calories || '-'} | ${d.weight || '-'} | ${D.clears[k] ? 'YES' : 'no'}`);
      k = addDays(k, 1);
    }
    if (weights.length >= 2) {
      const diff = weights[weights.length - 1][1] - weights[0][1];
      L.push(`Body weight change in range: ${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg (${weights[0][1]} → ${weights[weights.length - 1][1]})`);
    }
    L.push('');
    if ((S.habits || []).length) {
      L.push('ROUTINE HABITS (days done / days in range, current streak)');
      const nDays = daysBetween(from, today) + 1;
      S.habits.forEach(h => {
        let c = 0, kk = from;
        while (kk <= today) { if ((S.days[kk] || {})['h_' + h.id]) c++; kk = addDays(kk, 1); }
        L.push(`${h.label.replace('{wake}', wakeTime(today))}: ${c}/${nDays} (${Math.round((c / nDays) * 100)}%), streak ${habitStreak(h.id)}`);
      });
      L.push('');
    }
    L.push('WORKOUTS');
    const ws = S.workouts.filter(w => w.date >= from && w.date <= today).sort((a, b) => a.date.localeCompare(b.date));
    if (!ws.length) L.push('(none logged)');
    ws.forEach(w => {
      L.push('----------------------------------------');
      L.push(workoutTxt(w).trim());
      const prs = D.wxp[w.id]?.prs || [];
      if (prs.length) L.push(`New estimated PRs: ${prs.join(', ')}`);
    });
    L.push('----------------------------------------');
    L.push('');
    L.push('BEST LIFTS (estimated 1RM, Epley)');
    L.push('(loaded = estimated 1RM, Epley · BW = max reps in a set)');
    sortBests(D.best).forEach(b => L.push(b.bw ? `${b.name}: BW x ${b.r} (${b.date})` : `${b.name}: ${b.w}kg x ${b.r} (e1RM ${b.score.toFixed(1)}kg, ${b.date})`));
    L.push('');
    L.push('Coach: please review progress, fatigue and pain signals, ask your reflection questions, and adjust next week.');
    return L.join('\n') + '\n';
  }

  const sortBests = best => Object.values(best).sort((a, b) => (a.bw - b.bw) || (b.score - a.score));

  async function shareOrDownload(filename, text) {
    const blob = new Blob([text], { type: 'text/plain' });
    try {
      const file = new File([blob], filename, { type: 'text/plain' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename });
        return;
      }
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(`Saved ${filename}`);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
    catch { toast('Copy failed — use Share/Download instead'); }
  }

  // ------------------------------------------------------------------ modal & toast
  const modalQueue = [];
  function sys(html, actions = [{ label: 'Confirm', primary: true }]) {
    return new Promise(resolve => { modalQueue.push({ html, actions, resolve }); if (modalQueue.length === 1) showModal(); });
  }
  function showModal() {
    const m = modalQueue[0];
    if (!m) { $('#modalWrap').hidden = true; return; }
    $('#modalBody').innerHTML = m.html;
    $('#modalActions').innerHTML = m.actions.map((a, i) => `<button class="btn ${a.primary ? 'primary' : ''} ${a.danger ? 'danger' : ''}" data-mi="${i}">${esc(a.label)}</button>`).join('');
    $('#modalWrap').hidden = false;
    // Move focus into the dialog so keyboard and screen-reader users land on its actions.
    const focusBtn = $('#modalActions .primary') || $('#modalActions button:last-child');
    if (focusBtn && !$('#modalBody textarea')) focusBtn.focus({ preventScroll: true });
    $('#modalActions').onclick = e => {
      const b = e.target.closest('[data-mi]'); if (!b) return;
      const a = m.actions[+b.dataset.mi];
      modalQueue.shift();
      m.resolve(a.value ?? a.label);
      showModal();
    };
  }
  let toastTimer;
  function toast(msg) {
    document.querySelector('.toast')?.remove();
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 2400);
  }

  // ------------------------------------------------------------------ rest timer
  // Lives outside #view (re-renders never touch it) and floats above the tab bar.
  const fmtClock = sec => { sec = Math.max(0, Math.ceil(sec)); return sec >= 60 ? `${Math.floor(sec / 60)}:${pad(sec % 60)}` : `${sec} s`; };
  /** Rest length from the plan line ("rest 90 s", "rest 2 min"); 90 s when unknown. */
  function restSecs(e) {
    const m = String(e.plan || '').match(/rest\s+(\d+(?:\.\d+)?)\s*(s|sec|min|m)\b/i);
    if (!m) return 90;
    return Math.round(num(m[1]) * (/^m/i.test(m[2]) ? 60 : 1)) || 90;
  }
  let rest = null;
  function restEl() {
    let el = document.getElementById('restPill');
    if (!el) {
      el = document.createElement('div');
      el.id = 'restPill'; el.className = 'rest-pill'; el.setAttribute('role', 'timer');
      el.innerHTML = '<i class="rest-fill"></i><span class="rest-label">REST</span><b class="rest-time mono"></b><button class="btn sm" data-r="add">+15 s</button><button class="btn sm ghost" data-r="stop" aria-label="Stop rest timer">✕</button>';
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-r]'); if (!b || !rest) return;
        if (b.dataset.r === 'add') { rest.end += 15000; rest.total += 15; tickRest(); } else stopRest();
      });
      document.body.appendChild(el);
    }
    return el;
  }
  function startRest(sec) {
    clearInterval(rest && rest.timer);
    rest = { end: Date.now() + sec * 1000, total: sec, timer: setInterval(tickRest, 250) };
    const el = restEl(); el.classList.remove('out'); el.hidden = false;
    tickRest();
  }
  function tickRest() {
    if (!rest) return;
    const left = (rest.end - Date.now()) / 1000;
    const el = restEl();
    el.querySelector('.rest-time').textContent = fmtClock(left);
    el.querySelector('.rest-fill').style.transform = `scaleX(${Math.max(0, left / rest.total)})`;
    if (left <= 0) {
      stopRest();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      toast('⏱ Rest over — next set');
    }
  }
  function stopRest() {
    if (!rest) return;
    clearInterval(rest.timer); rest = null;
    const el = document.getElementById('restPill');
    if (el) { el.classList.add('out'); setTimeout(() => { if (!rest) el.hidden = true; }, 200); }
  }

  function checkProgressEvents() {
    const D = derive();
    if (D.level > S.seenLevel) {
      sys(`<h3>LEVEL UP!</h3><div class="big">Lv. ${D.level}</div><p class="center muted">All stats have grown. Keep clearing quests.</p>`);
    }
    if (D.rank.r !== S.seenRank && RANKS.findIndex(r => r.r === D.rank.r) > RANKS.findIndex(r => r.r === S.seenRank)) {
      sys(`<h3>RANK UP</h3><div class="big">${D.rank.r}-RANK</div><p class="center">New title acquired: <b class="violet">${esc(D.rank.title)}</b></p>`);
    }
    S.seenLevel = Math.max(S.seenLevel, D.level);
    S.seenRank = D.rank.r;
    const today = dkey();
    if (S.onboarded && S.seenPenalty !== today && penaltyFor(today)) {
      S.seenPenalty = today;
      sys(`<h3 class="red">PENALTY QUEST</h3><p>Yesterday's daily quests were not completed.</p><p>A penalty quest has been issued: <b>20 minutes of brisk walking</b> today.</p><p class="small muted">Missing a day is fine — consistency over perfection. Just get back on track.</p>`, [{ label: 'Accept', primary: true }]);
    }
    save(false);
  }

  // ------------------------------------------------------------------ views
  /** Re-draw the current page in place. Keeps the scroll position, so ticking a quest
   *  halfway down the page doesn't throw you back to the top. Use go() to change page. */
  function render() {
    document.querySelectorAll('#tabs button').forEach(b => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    const D = derive();
    $('#topMeta').innerHTML = `Lv <b>${D.level}</b> · ${D.rank.r}-Rank<br>Week ${Math.max(0, Math.min(programWeek(), 99))}/${PROGRAM_WEEKS}`;
    const y = window.scrollY;
    $('#view').innerHTML = ({ status: viewStatus, quests: viewQuests, train: viewTrain, plan: viewPlan, records: viewRecords, profile: viewProfile })[tab](D);
    window.scrollTo({ top: y });
  }

  // Page order drives the slide direction of the page transition (profile sits "behind" status).
  const PAGE_ORDER = ['profile', 'status', 'quests', 'train', 'plan', 'records'];
  /** Navigate to a page: slide the new page in from the side it lives on, start at the top. */
  function go(next) {
    const prev = tab;
    tab = next; planEdit = false;
    const v = $('#view');
    render();
    window.scrollTo({ top: 0 });
    if (prev === next) return;
    const dir = PAGE_ORDER.indexOf(next) > PAGE_ORDER.indexOf(prev) ? 'fwd' : 'back';
    v.classList.remove('enter-fwd', 'enter-back');
    void v.offsetWidth; // restart the animation if the user taps quickly
    v.classList.add('enter-' + dir);
  }
  $('#view').addEventListener('animationend', e => { if (e.target.id === 'view') e.target.classList.remove('enter-fwd', 'enter-back'); });

  function viewStatus(D) {
    const p = S.profile;
    const pct = Math.min(100, (D.into / D.need) * 100);
    const today = dkey();
    const qs = questsFor(today);
    const done = qs.filter(q => q.done).length;
    const wk = programWeek();
    const focus = WEEK_FOCUS[wk - 1];
    const totalSets = Object.values(D.wxp).reduce((a, b) => a + b.sets, 0);
    const weightPts = Object.entries(S.days).filter(([, d]) => d.weight).sort(([a], [b]) => a.localeCompare(b)).slice(-30).map(([k, d]) => [k, num(d.weight)]);
    return `
      <section class="panel">
        <div class="panel-title">Status Window <button class="btn sm ghost" data-act="go" data-tab="profile">Profile ›</button></div>
        <div class="player">
          <div class="rank-badge r-${D.rank.r}"><span>${D.rank.r}</span></div>
          <div>
            <div class="player-name">${esc(p.name || 'Player')}</div>
            <div class="player-title">Title: ${esc(D.rank.title)}</div>
            <div class="lvl">LV. <b>${D.level}</b> &nbsp; ${D.into} / ${D.need} XP</div>
            <div class="bar"><i style="width:${pct}%"></i></div>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">Stats <small>total XP ${D.xp}</small></div>
        <div class="stats">
          ${Object.entries(D.stats).map(([k, v]) => `<div class="stat" title="${esc(STAT_INFO[k])}"><span class="k"><b>${k}</b>${STAT_INFO[k].split(' — ')[0]}</span><span class="v">${v}</span></div>`).join('')}
        </div>
      </section>

      <section class="panel">
        <div class="kpis">
          <div class="kpi"><div class="n">${D.streak}</div><div class="l">Streak</div></div>
          <div class="kpi"><div class="n">${S.workouts.length}</div><div class="l">Dungeons</div></div>
          <div class="kpi"><div class="n">${totalSets}</div><div class="l">Sets</div></div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">Today · ${fmtDate(today)} <small>${done}/${qs.length} quests</small></div>
        <div class="bar"><i style="width:${(done / qs.length) * 100}%"></i></div>
        <div class="row" style="margin-top:12px">
          <button class="btn primary" data-act="go" data-tab="quests">Daily Quests</button>
          <button class="btn" data-act="go" data-tab="train">${isTrainingDay(today) ? 'Enter Dungeon' : 'Log Workout'}</button>
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">Program <small>Week ${wk} of ${PROGRAM_WEEKS}</small></div>
        ${wk < 1 ? `<div>Program starts <b class="gold">${fmtDate(S.startDate)}</b>. Use the time to finish your profile.</div>` : focus ? `<div><b class="gold">${focus.t}</b> — ${esc(focus.d)}</div>` : `<div><b class="gold">Block complete.</b> Export a full report and ask your coach for the next 6-week block.</div>`}
      </section>

      ${weightPts.length >= 2 ? `<section class="panel"><div class="panel-title">Body Weight <small>${weightPts[0][1]} → ${weightPts[weightPts.length - 1][1]} kg</small></div>${sparkline(weightPts.map(x => x[1]))}</section>` : ''}
    `;
  }

  function sparkline(vals) {
    const w = 300, h = 80, p = 6;
    const min = Math.min(...vals), max = Math.max(...vals), span = max - min || 1;
    const pts = vals.map((v, i) => [p + (i / (vals.length - 1)) * (w - 2 * p), h - p - ((v - min) / span) * (h - 2 * p)]);
    const path = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' ');
    const last = pts[pts.length - 1];
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Body weight trend">
      <path d="${path}" fill="none" stroke="var(--cyan)" stroke-width="2" vector-effect="non-scaling-stroke"/>
      <circle cx="${last[0]}" cy="${last[1]}" r="3.5" fill="var(--gold)"/></svg>`;
  }

  function viewQuests() {
    const k = questDate;
    const qs = questsFor(k);
    const pen = penaltyFor(k);
    const d = S.days[k] || {};
    const allDone = qs.every(q => q.done);
    const isToday = k === dkey();
    return `
      <section class="panel">
        <div class="panel-title">
          <button class="btn sm nav-arrow" data-act="qday" data-delta="-1" aria-label="Previous day">‹</button>
          <span>Daily Quest · ${isToday ? 'Today' : fmtDate(k)}</span>
          <button class="btn sm nav-arrow" data-act="qday" data-delta="1" ${isToday ? 'disabled' : ''} aria-label="Next day">›</button>
        </div>
        <p class="small muted" style="margin-top:0">${isTrainingDay(k) ? 'Training day.' : 'Rest day — recovery quest active.'} Each quest: +10 XP. Clear all: +50 XP bonus.</p>
        ${qs.map(q => questRow(q, k)).join('')}
        ${pen ? `<label class="quest tap penalty ${pen.done ? 'done' : ''} ${popCls('penalty', pen.done)}">
            <div class="check" aria-hidden="true">${pen.done ? '✓' : ''}</div>
            <div><div class="q-label">${pen.label}</div><div class="q-sub">${pen.sub} +20 XP</div></div>
            <input class="sr-only" type="checkbox" data-field="penalty" data-day="${k}" ${pen.done ? 'checked' : ''}>
          </label>` : ''}
      </section>
      ${allDone ? `<section class="panel center"><b class="gold mono">◆ DAILY QUEST CLEARED ◆</b><div class="small muted">Rewards applied: +${qs.length * 10 + 50} XP</div></section>` : ''}
      ${habitsPanel(k)}
      ${isToday ? routinePanel() : ''}
      <section class="panel">
        <div class="panel-title">Body & Fuel <small>optional</small></div>
        <div class="grid2">
          <label class="f"><span>Body weight (kg)</span><input inputmode="decimal" data-field="weight" data-day="${k}" value="${esc(d.weight || '')}"></label>
          <label class="f"><span>Calories (kcal)${S.targets.calories ? ' · target ' + S.targets.calories : ''}</span><input inputmode="numeric" data-field="calories" data-day="${k}" value="${esc(d.calories || '')}"></label>
        </div>
        <label class="f"><span>Day notes (mood, stress, soreness, food)</span><textarea data-field="note" data-day="${k}">${esc(d.note || '')}</textarea></label>
      </section>`;
  }

  function habitsPanel(k) {
    const hs = habitsFor(k);
    if (!hs.length) return '';
    const n = hs.filter(h => h.done).length;
    return `<section class="panel">
      <div class="panel-title">Routine Quests <small>${n}/${hs.length} · +10 each · all: +30</small></div>
      ${hs.map(h => { const st = habitStreak(h.id); return `<label class="quest tap ${h.done ? 'done' : ''} ${popCls('h_' + h.id, h.done)}">
        <div class="check" aria-hidden="true">${h.done ? '✓' : ''}</div>
        <div><div class="q-label">${esc(h.label)}</div><div class="q-sub">${h.stat}${st ? ` · 🔥 ${st}-day streak` : ''}</div></div>
        <input class="sr-only" type="checkbox" data-field="h_${esc(h.id)}" data-day="${k}" ${h.done ? 'checked' : ''}>
      </label>`; }).join('')}
      ${n === hs.length ? '<div class="center gold mono small" style="margin-top:8px">◆ ROUTINE CLEARED ◆</div>' : ''}
    </section>`;
  }

  function routinePanel() {
    const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const toHM = m => { m = ((m % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
    let lines = String(S.routine || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return '';
    // While ramping the wake time, slide the whole day (incl. bedtime) so sleep stays 8 h+.
    const first = lines.find(l => /^\d\d:\d\d/.test(l));
    const shift = first ? toMin(wakeTime(dkey())) - toMin(first.slice(0, 5)) : 0;
    if (shift) lines = lines.map(l => (/^\d\d:\d\d/.test(l) ? toHM(toMin(l.slice(0, 5)) + shift) + l.slice(5) : l));
    const now = new Date(); const hm = pad(now.getHours()) + ':' + pad(now.getMinutes());
    let cur = -1;
    lines.forEach((l, i) => { const t = l.slice(0, 5); if (/^\d\d:\d\d$/.test(t) && t <= hm) cur = i; });
    const wake = wakeTime(dkey());
    const sunday = new Date().getDay() === 0;
    return `<section class="panel">
      <div class="panel-title">Today's Routine <small>wake target ${wake}</small></div>
      ${shift ? `<p class="small muted" style="margin-top:0">Wake-time ramp: this week's schedule is shifted <b class="gold">${shift > 0 ? '+' : ''}${shift} min</b> (bedtime too) so you keep 8 h sleep.</p>` : ''}
      ${sunday ? '<p class="small gold" style="margin-top:0">Sunday: no training. Long outdoor walk in the morning sun, weekly review + send the coach report.</p>' : ''}
      ${lines.map((l, i) => `<div class="stat" style="${i === cur ? 'color:var(--gold);font-weight:700' : i < cur ? 'opacity:.55' : ''}"><span class="mono small">${esc(l.slice(0, 5))}</span><span style="flex:1;margin-left:10px">${esc(l.slice(5).trim())}</span></div>`).join('')}
    </section>`;
  }

  // The quest the user just completed gets a one-off "cleared" pulse on the next render.
  let justDone = '';
  const popCls = (id, done) => (done && id === justDone ? 'pop' : '');

  function questRow(q, k) {
    let ctl = '';
    if (q.input) ctl = `<div class="row"><button class="btn sm" data-act="bump" data-field="${q.id}" data-day="${k}" data-step="${q.step}" aria-label="Add ${q.step}">+</button><input inputmode="decimal" data-field="${q.id}" data-day="${k}" value="${q.value || ''}" placeholder="0"></div>`;
    else if (q.toggle) ctl = `<input class="sr-only" type="checkbox" data-field="${q.id}" data-day="${k}" ${q.done ? 'checked' : ''}>`;
    else if (q.auto) ctl = q.done ? '<span class="small green mono">CLEARED</span>' : `<button class="btn sm" data-act="go" data-tab="train">Go</button>`;
    const sub = q.input ? `${q.value || 0} / ${q.target} ${q.unit} · ${q.stat}` : `${q.stat}`;
    const tag = q.toggle ? 'label' : 'div'; // a toggle row is one big tap target
    return `<${tag} class="quest ${q.toggle ? 'tap' : ''} ${q.done ? 'done' : ''} ${popCls(q.id, q.done)}" data-qrow="${q.id}">
      <div class="check" aria-hidden="true">${q.done ? '✓' : ''}</div>
      <div><div class="q-label">${esc(q.label)}</div><div class="q-sub">${sub}</div></div>
      ${ctl}</${tag}>`;
  }

  function newDraft(dayIdx) {
    const wk = Math.min(Math.max(programWeek(), 1), PROGRAM_WEEKS);
    const pd = S.program.days[dayIdx];
    const draft = { id: uid(), date: dkey(), dayName: pd ? pd.name : 'Custom Workout', exercises: [], energy: '', difficulty: '', sleepQ: '', pain: false, painNote: '', notes: '' };
    if (pd) pd.exercises.forEach(e0 => {
      const e = prescribe(e0, wk);
      const plan = `${e.sets} × ${e.reps}${e.rest && e.rest !== '—' ? ' · rest ' + e.rest : ''}${e.load ? ' · ' + e.load : ''}`;
      if (e.type === 'cardio') draft.exercises.push({ name: e.name, type: 'cardio', plan, min: '', dist: '', note: '' });
      else {
        const last = lastPerformance(e.name);
        const lastTop = last ? (last.e.sets || []).reduce((m, s) => Math.max(m, num(s.w)), 0) : 0;
        draft.exercises.push({ name: e.name, type: 'strength', plan, hint: suggestLoad(e.name), note: '',
          sets: Array.from({ length: e.sets }, () => ({ w: lastTop ? String(lastTop) : '', r: '' })) });
      }
    });
    else draft.exercises.push({ name: '', type: 'strength', sets: [{ w: '', r: '' }], note: '' });
    S.draft = draft; save();
  }

  function viewTrain() {
    if (!S.draft) {
      const wk = programWeek();
      return `
        <section class="panel">
          <div class="panel-title">Select Dungeon <small>Week ${wk}${WEEK_FOCUS[wk - 1] ? ' · ' + WEEK_FOCUS[wk - 1].t : ''}</small></div>
          ${S.program.days.map((d, i) => { const isToday = d.dow === new Date().getDay(); return `<button class="btn block ${isToday ? 'primary' : ''}" style="margin-bottom:8px;text-align:left" data-act="start" data-day="${i}">⚔ ${esc(d.name)} <span class="small" style="opacity:.7">· ${isToday ? "TODAY'S MISSION" : d.exercises.length + ' exercises'}</span></button>`; }).join('')}
          ${!isTrainingDay(dkey()) ? '<p class="small muted">Today is active recovery: 30–45 min walk + 10 min mobility. Complete it in Quests.</p>' : ''}
          <button class="btn block ghost" data-act="start" data-day="-1">+ Custom workout</button>
        </section>
        <section class="panel small muted">Pre-fills sets from your plan with this week's progression and your last weights. Your in-progress workout is saved automatically, even if you close the app.</section>`;
    }
    const w = S.draft;
    return `
      <section class="panel">
        <div class="panel-title">Dungeon in Progress <button class="btn sm danger" data-act="discard">Abandon</button></div>
        <div class="grid2">
          <label class="f"><span>Session</span><input data-draft="dayName" value="${esc(w.dayName)}"></label>
          <label class="f"><span>Date</span><input type="date" data-draft="date" value="${esc(w.date)}" max="${dkey()}"></label>
        </div>
      </section>
      ${w.exercises.map((e, i) => exerciseCard(e, i)).join('')}
      <div class="row" style="margin-bottom:14px">
        <button class="btn" data-act="addex" data-type="strength">+ Lift</button>
        <button class="btn" data-act="addex" data-type="cardio">+ Cardio</button>
      </div>
      <section class="panel">
        <div class="panel-title">Debrief <small>+10 XP</small></div>
        <div class="grid3">
          ${['energy', 'difficulty', 'sleepQ'].map(f => `<label class="f"><span>${{ energy: 'Energy', difficulty: 'Difficulty', sleepQ: 'Sleep quality' }[f]} 1–10</span><select data-draft="${f}"><option value="">–</option>${Array.from({ length: 10 }, (_, n) => `<option ${String(w[f]) === String(n + 1) ? 'selected' : ''}>${n + 1}</option>`).join('')}</select></label>`).join('')}
        </div>
        <label class="row" style="margin:6px 0 10px"><input type="checkbox" data-draft="pain" ${w.pain ? 'checked' : ''}> <span>Any pain or discomfort?</span></label>
        ${w.pain ? `<label class="f"><span>Where / what kind? (sharp, dull, tight, joint…)</span><input data-draft="painNote" value="${esc(w.painNote)}"></label>` : ''}
        <label class="f"><span>Notes (how it felt, what was hard)</span><textarea data-draft="notes">${esc(w.notes)}</textarea></label>
        <button class="btn primary block" data-act="finish">Clear Dungeon</button>
      </section>`;
  }

  function exerciseCard(e, i) {
    const body = e.type === 'cardio'
      ? `<div class="grid2"><label class="f"><span>Minutes</span><input inputmode="decimal" data-ex="${i}" data-k="min" value="${esc(e.min)}"></label><label class="f"><span>Distance (km, optional)</span><input inputmode="decimal" data-ex="${i}" data-k="dist" value="${esc(e.dist)}"></label></div>`
      : `<div class="set-row small muted"><span class="n">Set</span><span class="center">+kg (blank = BW)</span><span class="center">reps / sec</span><span></span></div>
         ${e.sets.map((s, j) => `<div class="set-row"><span class="n">${j + 1}</span>
            <input inputmode="decimal" data-ex="${i}" data-set="${j}" data-k="w" value="${esc(s.w)}" placeholder="BW" aria-label="Set ${j + 1} weight">
            <input inputmode="numeric" data-ex="${i}" data-set="${j}" data-k="r" value="${esc(s.r)}" placeholder="reps" aria-label="Set ${j + 1} reps">
            <button class="x-btn" data-act="delset" data-ex="${i}" data-set="${j}" aria-label="Remove set">×</button></div>`).join('')}
         <div class="row"><button class="btn sm" data-act="addset" data-ex="${i}">+ Set</button><span class="spacer"></span><button class="btn sm ghost-line" data-act="rest" data-sec="${restSecs(e)}" aria-label="Start ${fmtClock(restSecs(e))} rest timer">⏱ Rest ${fmtClock(restSecs(e))}</button></div>`;
    return `<div class="ex">
      <div class="ex-head"><input data-ex="${i}" data-k="name" value="${esc(e.name)}" placeholder="Exercise name"><button class="x-btn" data-act="delex" data-ex="${i}" aria-label="Remove ${esc(e.name || 'exercise')}">×</button></div>
      ${e.plan ? `<div class="ex-plan">PLAN: ${esc(e.plan)}</div>` : ''}
      ${e.hint ? `<div class="ex-plan" style="color:var(--gold)">${esc(e.hint)}</div>` : ''}
      ${body}
      <input class="small" style="margin-top:6px" data-ex="${i}" data-k="note" value="${esc(e.note || '')}" placeholder="Note (e.g. felt easy, left knee tight)">
    </div>`;
  }

  function viewPlan() {
    const cur = programWeek();
    const wk = planWeek || Math.min(Math.max(cur, 1), PROGRAM_WEEKS);
    if (planEdit) return viewPlanEdit();
    const f = WEEK_FOCUS[wk - 1];
    return `
      <section class="panel">
        <div class="panel-title">6-Week Program <button class="btn sm" data-act="planedit">Edit</button></div>
        <div class="week-tabs">${Array.from({ length: PROGRAM_WEEKS }, (_, i) => `<button class="chip ${wk === i + 1 ? 'on' : ''} ${cur === i + 1 ? 'now' : ''}" data-act="pweek" data-w="${i + 1}">W${i + 1}</button>`).join('')}</div>
        <div><b class="gold">Week ${wk}: ${f.t}</b> — ${esc(f.d)}</div>
        <div class="small mono" style="margin-top:6px">Daily steps target: <b class="cyan">${Array.isArray(S.program.steps) && S.program.steps.length ? S.program.steps[Math.min(wk, S.program.steps.length) - 1] : S.targets.steps}</b></div>
        ${S.program.note ? `<p class="small muted">${esc(S.program.note)}</p>` : ''}
      </section>
      ${S.program.days.map(d => `<section class="panel"><div class="panel-title">${esc(d.name)}</div>
        ${d.exercises.map(e0 => { const e = prescribe(e0, wk); return `<div class="plan-ex"><div class="name">${esc(e.name)}</div><div class="rx">${e.sets} × ${esc(e.reps)}</div>
          <div class="meta">${e.rest ? 'Rest ' + esc(e.rest) + ' · ' : ''}${esc(e.load)}${e.notes ? '<br>' + esc(e.notes) : ''}</div></div>`; }).join('')}
      </section>`).join('')}`;
  }

  function viewPlanEdit() {
    return `
      <section class="panel">
        <div class="panel-title">Edit Program <button class="btn sm primary" data-act="planedit">Done</button></div>
        <p class="small muted">Enter base (Week 1) sets/reps. The app applies the weekly progression automatically. Type "cardio" exercises for time-based work.</p>
        <label class="f"><span>Program note</span><textarea data-pnote>${esc(S.program.note)}</textarea></label>
        <div class="row wrap"><button class="btn sm" data-act="pasteprog">Import from text</button><button class="btn sm danger" data-act="resetprog">Reset to template</button></div>
      </section>
      ${S.program.days.map((d, i) => `<section class="panel">
        <div class="ex-head"><input data-pd="${i}" data-k="name" value="${esc(d.name)}"><button class="x-btn" data-act="delday" data-d="${i}" aria-label="Remove day">×</button></div>
        ${d.exercises.map((e, j) => `<div class="edit-ex">
          <input class="full" data-pd="${i}" data-pe="${j}" data-k="name" value="${esc(e.name)}" placeholder="Exercise">
          <input data-pd="${i}" data-pe="${j}" data-k="sets" value="${esc(e.sets)}" inputmode="numeric" placeholder="Sets">
          <input data-pd="${i}" data-pe="${j}" data-k="reps" value="${esc(e.reps)}" placeholder="Reps">
          <input data-pd="${i}" data-pe="${j}" data-k="rest" value="${esc(e.rest)}" placeholder="Rest">
          <select data-pd="${i}" data-pe="${j}" data-k="type"><option ${e.type === 'strength' ? 'selected' : ''}>strength</option><option ${e.type === 'cardio' ? 'selected' : ''}>cardio</option></select>
          <input class="full" data-pd="${i}" data-pe="${j}" data-k="load" value="${esc(e.load)}" placeholder="Load guidance">
          <input class="full" data-pd="${i}" data-pe="${j}" data-k="notes" value="${esc(e.notes)}" placeholder="Coaching notes">
          <button class="btn sm danger full" data-act="delpe" data-d="${i}" data-e="${j}">Remove exercise</button>
        </div>`).join('')}
        <button class="btn sm" style="margin-top:8px" data-act="addpe" data-d="${i}">+ Exercise</button>
      </section>`).join('')}
      <button class="btn block" data-act="addday">+ Add training day</button>`;
  }

  function viewRecords(D) {
    const ws = [...S.workouts].sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
    const bests = sortBests(D.best);
    return `
      <section class="panel">
        <div class="panel-title">Send to Coach</div>
        <p class="small muted" style="margin-top:0">Creates a .txt file — share it straight into the Claude app or save it to Files.</p>
        <div class="chips" style="margin-bottom:10px">${[[7, 'Last 7 days'], [14, '14 days'], [0, 'Whole block']].map(([n, l]) => `<button class="chip ${recordsRange === n ? 'on' : ''}" data-act="range" data-n="${n}">${l}</button>`).join('')}</div>
        <div class="row wrap">
          <button class="btn primary" data-act="report">Share report .txt</button>
          <button class="btn" data-act="copyreport">Copy</button>
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">Records <small>e1RM · BW max reps</small></div>
        ${bests.length ? bests.map(b => `<div class="stat"><span>${esc(b.name)}</span><span class="mono">${b.bw ? `BW × <b class="gold">${b.r}</b> reps` : `${b.w}×${b.r} · <b class="gold">${b.score.toFixed(1)}</b>`}</span></div>`).join('') : '<p class="muted small">Log some lifts to set records.</p>'}
      </section>

      <section class="panel">
        <div class="panel-title">Dungeon Log <small>${ws.length} cleared</small></div>
        ${ws.length ? ws.map(w => {
          const info = D.wxp[w.id] || { xp: 0, prs: [] };
          return `<div class="log-item">
            <div class="row"><b>${esc(w.dayName)}</b>${info.prs.length ? '<span class="tag pr">PR</span>' : ''}${w.pain ? '<span class="tag pain">PAIN</span>' : ''}<span class="spacer"></span><span class="mono small gold">+${info.xp} XP</span></div>
            <div class="small muted">${fmtDate(w.date)} · ${info.sets} sets${info.minutes ? ' · ' + info.minutes + ' min' : ''}</div>
            <details><summary class="small muted">View log</summary><pre>${esc(workoutTxt(w))}</pre></details>
            <div class="row wrap" style="margin-top:6px">
              <button class="btn sm" data-act="sharew" data-id="${w.id}">Share .txt</button>
              <button class="btn sm" data-act="copyw" data-id="${w.id}">Copy</button>
              <button class="btn sm" data-act="editw" data-id="${w.id}">Edit</button>
              <button class="btn sm danger" data-act="delw" data-id="${w.id}">Delete</button>
            </div></div>`;
        }).join('') : '<p class="muted small">No dungeons cleared yet.</p>'}
      </section>

      <section class="panel">
        <div class="panel-title">Cloud Sync <small>${syncStatusText()}</small></div>
        ${SYNC.token ? `
          <p class="small muted" style="margin-top:0">Auto-syncs to your private GitHub Gist ~15 s after each change. Download everything (save, full coach report, profile) from the gist page → <i>Download ZIP</i>.</p>
          <div class="row wrap">
            <button class="btn primary" data-act="syncnow">Sync now</button>
            <button class="btn" data-act="syncpull">Load from cloud</button>
            ${SYNC.gistId ? `<a class="btn" href="https://gist.github.com/${esc(SYNC.gistId)}" target="_blank" rel="noopener">Open gist</a>` : ''}
            <button class="btn sm danger" data-act="syncoff">Disconnect</button>
          </div>` : `
          <p class="small muted" style="margin-top:0">Back up online to a <b>secret GitHub Gist</b> in your own account and download it anytime.<br>
          1) github.com → Settings → Developer settings → Personal access tokens → <b>Tokens (classic)</b> → Generate.<br>
          2) Tick <b>only</b> the <span class="mono">gist</span> scope, no expiry (or 1 year).<br>
          3) Paste it below. On a new phone, paste the same token + your Gist ID to restore.</p>
          <label class="f"><span>GitHub token (stays on this device only)</span><input type="password" autocomplete="off" data-sync="token" placeholder="ghp_…"></label>
          <label class="f"><span>Gist ID (leave blank first time — it's created for you)</span><input data-sync="gistId" value="${esc(SYNC.gistId || '')}"></label>
          <button class="btn primary" data-act="syncconnect">Connect</button>`}
      </section>

      <section class="panel">
        <div class="panel-title">Save Data</div>
        <p class="small muted" style="margin-top:0">${SYNC.token ? 'Stored on this device and synced to your gist.' : 'Stored only on this device — clearing browser data erases it. Turn on Cloud Sync or back up regularly.'}</p>
        <div class="row wrap">
          <button class="btn" data-act="backup">Export backup .txt</button>
          <button class="btn" data-act="restore">Import backup</button>
        </div>
      </section>`;
  }

  const PROFILE_FIELDS = [
    ['Personal Data', [['name', 'Name / player name'], ['age', 'Age'], ['height', 'Height (cm)'], ['weight', 'Weight (kg)'], ['bodyFat', 'Body fat % (estimate)']]],
    ['Goals', [['goal', 'Primary goal (fat loss / muscle gain / strength / performance)'], ['secondaryGoals', 'Secondary goals'], ['targetWeight', 'Target weight / composition'], ['timeline', 'Timeline expectations']]],
    ['Training Background', [['experience', 'Experience level & years training'], ['activity', 'Current weekly activity'], ['steps', 'Average daily steps']]],
    ['Preferences', [['likes', 'Training styles you enjoy'], ['dislikes', 'Training styles you dislike']]],
    ['Schedule & Equipment', [['daysPerWeek', 'Days per week available'], ['sessionLength', 'Max session length'], ['equipment', 'Equipment access (full gym, DBs, home gym, bands…)']]],
    ['Health & Safety', [['injuries', 'Injuries / joint issues / surgeries', 1], ['medical', 'Medical conditions / medications', 1], ['restrictions', 'Movement restrictions', 1]]],
    ['Nutrition', [['diet', 'Diet preference'], ['foodLikes', 'Foods you like', 1], ['foodDislikes', 'Foods you dislike', 1], ['allergies', 'Allergies / intolerances'], ['eatingSchedule', 'Daily eating schedule'], ['cooking', 'Cooking ability'], ['budget', 'Budget']]],
    ['Coach Notes', [['notes', 'Anything else the coach should know', 1]]],
  ];

  function viewProfile() {
    const p = S.profile, T = S.targets;
    return `
      <section class="panel">
        <div class="panel-title">Player Profile <button class="btn sm ghost" data-act="go" data-tab="status">‹ Back</button></div>
        <p class="small muted" style="margin-top:0">Fill this in, then export <b>user_fitness_profile.txt</b> and add it to your Claude Project Knowledge. The coach builds your plan from it.</p>
        <div class="row wrap"><button class="btn primary" data-act="profiletxt">Share profile .txt</button><button class="btn" data-act="copyprofile">Copy</button><button class="btn" data-act="pasteprofile">Paste / import profile</button></div>
      </section>
      ${PROFILE_FIELDS.map(([title, fields]) => `<section class="panel"><div class="panel-title">${title}</div>
        ${fields.map(([k, l, ta]) => `<label class="f"><span>${l}</span>${ta ? `<textarea data-prof="${k}">${esc(p[k])}</textarea>` : `<input data-prof="${k}" value="${esc(p[k])}">`}</label>`).join('')}
      </section>`).join('')}
      <section class="panel">
        <div class="panel-title">System Settings</div>
        <label class="f"><span>Program start date (Week 1 begins here)</span><input type="date" data-set="startDate" value="${esc(S.startDate)}"></label>
        <label class="f"><span>Training days (workout quest appears on these days)</span></label>
        <div class="chips" style="margin-bottom:12px">${WEEKDAYS.map((d, i) => `<button class="chip ${S.trainingDays.includes(i) ? 'on' : ''}" data-act="tday" data-d="${i}">${d}</button>`).join('')}</div>
        <div class="grid2">
          ${[['steps', 'Steps / day (if plan has no weekly ramp)'], ['protein', 'Protein g / day'], ['fibre', 'Fibre g / day'], ['water', 'Water L / day'], ['sleep', 'Sleep h / night'], ['calories', 'Calories / day']].map(([k, l]) => `<label class="f"><span>${l}</span><input inputmode="decimal" data-target="${k}" value="${esc(T[k] || '')}"></label>`).join('')}
        </div>
        <p class="small muted">Set calorie/macro targets from your coach's nutrition plan.</p>
        <label class="f"><span>Wake-time ramp, week 1→6 (separate with /)</span><input data-setting="wakeRamp" value="${esc((S.wakeRamp || []).join(' / '))}"></label>
        <label class="f"><span>Routine habits — one per line, optional stat at end: "Read 20 min | INT" ({wake} = this week's wake time)</span><textarea data-setting="habits" style="min-height:150px">${esc((S.habits || []).map(h => `${h.label} | ${h.stat}`).join('\n'))}</textarea></label>
        <label class="f"><span>Daily routine timeline — "HH:MM what"</span><textarea data-setting="routine" style="min-height:240px">${esc(S.routine || '')}</textarea></label>
        <button class="btn danger sm" data-act="wipe">Erase all data</button>
      </section>`;
  }

  // ------------------------------------------------------------------ events
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]'); if (!b) return;
    go(b.dataset.tab);
  });

  const view = $('#view');

  view.addEventListener('input', e => {
    const t = e.target;
    const val = t.type === 'checkbox' ? t.checked : t.value;
    if (t.dataset.day && t.dataset.field) {
      day(t.dataset.day)[t.dataset.field] = val; save();
      if (t.type !== 'checkbox' && t.dataset.field !== 'note') refreshQuestRow(t);
      return;
    }
    if (t.dataset.draft !== undefined && S.draft) { S.draft[t.dataset.draft] = val; save(); return; }
    if (t.dataset.ex !== undefined && S.draft) {
      const ex = S.draft.exercises[+t.dataset.ex];
      if (t.dataset.set !== undefined) ex.sets[+t.dataset.set][t.dataset.k] = val; else ex[t.dataset.k] = val;
      save(); return;
    }
    if (t.dataset.sync) { pendingSync[t.dataset.sync] = val.trim(); return; }
    if (t.dataset.prof) { S.profile[t.dataset.prof] = val; save(); return; }
    if (t.dataset.target) { S.targets[t.dataset.target] = num(val); save(); return; }
    if (t.dataset.setting === 'wakeRamp') { S.wakeRamp = val.split('/').map(x => x.trim()).filter(x => /^\d{1,2}:\d\d$/.test(x)).map(x => x.padStart(5, '0')); save(); return; }
    if (t.dataset.setting === 'routine') { S.routine = val; save(); return; }
    if (t.dataset.setting === 'habits') {
      const old = S.habits || [];
      S.habits = val.split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => {
        const [label, st] = l.split('|').map(x => x.trim());
        const stat = STAT_INFO[(st || '').toUpperCase()] ? st.toUpperCase() : 'DIS';
        const same = old.find(h => h.label === label);
        const id = same ? same.id : label.toLowerCase().replace(/\{wake\}/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 24) || uid();
        return { id, label, stat };
      });
      save(); return;
    }
    if (t.dataset.pd !== undefined) {
      const d = S.program.days[+t.dataset.pd];
      if (t.dataset.pe !== undefined) d.exercises[+t.dataset.pe][t.dataset.k] = t.dataset.k === 'sets' ? num(val) : val; else d[t.dataset.k] = val;
      save(); return;
    }
    if (t.dataset.pnote !== undefined) { S.program.note = val; save(); }
  });

  view.addEventListener('change', e => {
    const t = e.target;
    if (t.type === 'checkbox' && t.dataset.day) { justDone = t.checked ? t.dataset.field : ''; render(); justDone = ''; checkProgressEvents(); }
    else if (t.dataset.draft === 'pain') render();
    else if (t.dataset.set === 'startDate' && t.value) { S.startDate = t.value; save(); }
    else if (t.dataset.day && t.dataset.field !== 'note') { render(); checkProgressEvents(); }
    else if (t.dataset.k === 'type') render();
  });

  function refreshQuestRow(input) {
    // update the tick / subtitle without re-rendering (keeps keyboard focus)
    const row = input.closest('[data-qrow]'); if (!row) return;
    const q = questsFor(input.dataset.day).find(x => x.id === row.dataset.qrow); if (!q) return;
    if (q.done && !row.classList.contains('done')) { row.classList.remove('pop'); void row.offsetWidth; row.classList.add('pop'); }
    row.classList.toggle('done', q.done);
    row.querySelector('.check').textContent = q.done ? '✓' : '';
    row.querySelector('.q-sub').textContent = `${q.value || 0} / ${q.target} ${q.unit} · ${q.stat}`;
  }

  view.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    switch (a) {
      case 'go': go(b.dataset.tab); break;
      case 'qday': {
        const n = addDays(questDate, +b.dataset.delta);
        if (n <= dkey()) { questDate = n; render(); window.scrollTo({ top: 0 }); }
        break;
      }
      case 'bump': {
        const d = day(b.dataset.day); const f = b.dataset.field;
        const was = questsFor(b.dataset.day).find(q => q.id === f)?.done;
        d[f] = String(+(num(d[f]) + num(b.dataset.step)).toFixed(2)); save();
        justDone = was ? '' : f; render(); justDone = ''; checkProgressEvents();
        break;
      }
      case 'start': newDraft(+b.dataset.day); render(); window.scrollTo({ top: 0 }); break;
      case 'discard':
        if (await sys('<h3>ABANDON DUNGEON?</h3><p class="center">This in-progress workout will be lost.</p>', [{ label: 'Cancel', value: 0 }, { label: 'Abandon', danger: true, value: 1 }])) { S.draft = null; stopRest(); save(); render(); window.scrollTo({ top: 0 }); }
        break;
      case 'addex':
        S.draft.exercises.push(b.dataset.type === 'cardio' ? { name: '', type: 'cardio', min: '', dist: '', note: '' } : { name: '', type: 'strength', sets: [{ w: '', r: '' }], note: '' });
        save(); render(); break;
      case 'delex': {
        const ex = S.draft.exercises[+b.dataset.ex];
        const logged = ex.type === 'cardio' ? num(ex.min) > 0 : (ex.sets || []).some(s => String(s.r).trim() !== '');
        if (logged && !(await sys(`<h3>REMOVE EXERCISE?</h3><p class="center">${esc(ex.name || 'This exercise')} has logged sets.</p>`, [{ label: 'Cancel', value: 0 }, { label: 'Remove', danger: true, value: 1 }]))) break;
        S.draft.exercises.splice(+b.dataset.ex, 1); save(); render(); break;
      }
      case 'rest': startRest(+b.dataset.sec || 90); break;
      case 'addset': {
        const ex = S.draft.exercises[+b.dataset.ex];
        const last = ex.sets[ex.sets.length - 1] || { w: '', r: '' };
        ex.sets.push({ w: last.w, r: last.r }); save(); render(); break;
      }
      case 'delset': S.draft.exercises[+b.dataset.ex].sets.splice(+b.dataset.set, 1); save(); render(); break;
      case 'finish': await finishWorkout(); break;
      case 'range': recordsRange = +b.dataset.n; render(); break;
      case 'report': await shareOrDownload(`coach_report_${dkey()}.txt`, reportTxt(recordsRange)); break;
      case 'copyreport': await copyText(reportTxt(recordsRange)); break;
      case 'sharew': { const w = S.workouts.find(x => x.id === b.dataset.id); await shareOrDownload(`workout_${w.date}.txt`, workoutTxt(w)); break; }
      case 'copyw': { const w = S.workouts.find(x => x.id === b.dataset.id); await copyText(workoutTxt(w)); break; }
      case 'editw': {
        if (S.draft && !(await sys('<h3>REPLACE DRAFT?</h3><p class="center">You have a workout in progress. Replace it with this log for editing?</p>', [{ label: 'Cancel', value: 0 }, { label: 'Replace', primary: true, value: 1 }]))) break;
        const w = S.workouts.find(x => x.id === b.dataset.id);
        S.draft = JSON.parse(JSON.stringify(w)); S.draft.editing = true;
        save(); go('train'); break;
      }
      case 'delw':
        if (await sys('<h3>DELETE LOG?</h3><p class="center">XP and records from this workout will be removed.</p>', [{ label: 'Cancel', value: 0 }, { label: 'Delete', danger: true, value: 1 }])) {
          S.workouts = S.workouts.filter(x => x.id !== b.dataset.id); save(); render();
        }
        break;
      case 'backup': await shareOrDownload(`awaken_backup_${dkey()}.txt`, JSON.stringify({ app: 'AWAKEN', exported: new Date().toISOString(), data: S }, null, 1)); break;
      case 'restore': $('#fileInput').click(); break;
      case 'profiletxt': await shareOrDownload('user_fitness_profile.txt', profileTxt()); break;
      case 'copyprofile': await copyText(profileTxt()); break;
      case 'tday': {
        const d = +b.dataset.d;
        S.trainingDays = S.trainingDays.includes(d) ? S.trainingDays.filter(x => x !== d) : [...S.trainingDays, d].sort();
        save(); render(); break;
      }
      case 'wipe':
        if (await sys('<h3 class="red">ERASE ALL DATA?</h3><p class="center">This cannot be undone. Export a backup first.</p>', [{ label: 'Cancel', value: 0 }, { label: 'Erase', danger: true, value: 1 }])) {
          localStorage.removeItem(STORE_KEY); S = blankState(); save(); go('status'); intro();
        }
        break;
      case 'pweek': planWeek = +b.dataset.w; render(); break;
      case 'planedit': planEdit = !planEdit; render(); window.scrollTo({ top: 0 }); break;
      case 'addpe': S.program.days[+b.dataset.d].exercises.push(ex('', 3, '10', '90 s', '')); save(); render(); break;
      case 'delpe': S.program.days[+b.dataset.d].exercises.splice(+b.dataset.e, 1); save(); render(); break;
      case 'addday': S.program.days.push({ name: `Day ${S.program.days.length + 1} – New Session`, exercises: [] }); save(); render(); break;
      case 'delday':
        if (await sys('<h3>REMOVE DAY?</h3>', [{ label: 'Cancel', value: 0 }, { label: 'Remove', danger: true, value: 1 }])) { S.program.days.splice(+b.dataset.d, 1); save(); render(); }
        break;
      case 'resetprog':
        if (await sys('<h3>RESET PROGRAM?</h3><p class="center">Replace your plan with the starter template?</p>', [{ label: 'Cancel', value: 0 }, { label: 'Reset', danger: true, value: 1 }])) { S.program = JSON.parse(JSON.stringify(DEFAULT_PROGRAM)); save(); render(); }
        break;
      case 'pasteprog': importProgramDialog(); break;
      case 'pasteprofile': importProfileDialog(); break;
      case 'syncconnect': await syncConnect(); break;
      case 'syncnow': await syncPush(true); render(); break;
      case 'syncpull': await syncPull(true); break;
      case 'syncoff':
        if (await sys('<h3>DISCONNECT CLOUD SYNC?</h3><p class="center">Your gist stays on GitHub. This device stops syncing and forgets the token.</p>', [{ label: 'Cancel', value: 0 }, { label: 'Disconnect', danger: true, value: 1 }])) {
          SYNC = {}; saveSyncCfg(); render();
        }
        break;
    }
  });

  async function finishWorkout() {
    const w = S.draft;
    // drop empty rows
    w.exercises = w.exercises.filter(e => e.name.trim()).map(e => e.type === 'cardio' ? e : { ...e, sets: e.sets.filter(s => String(s.r).trim() !== '') });
    const hasWork = w.exercises.some(e => (e.type === 'cardio' ? num(e.min) > 0 : e.sets.length));
    if (!hasWork) { toast('Log at least one set or cardio block first'); render(); return; }
    const editing = w.editing; delete w.editing;
    if (editing) S.workouts = S.workouts.map(x => (x.id === w.id ? w : x)); else S.workouts.push(w);
    S.draft = null; save();
    const after = derive();
    const info = after.wxp[w.id];
    let html = `<h3>${editing ? 'LOG UPDATED' : 'DUNGEON CLEARED'}</h3><div class="big">+${info.xp} XP</div><p class="center muted">${info.sets} sets${info.minutes ? ' · ' + info.minutes + ' min cardio' : ''}</p>`;
    if (info.prs.length) html += `<p class="center gold mono">◆ NEW RECORD ◆<br>${info.prs.map(esc).join('<br>')}</p>`;
    if (w.pain) {
      html += `<div class="panel" style="border-color:var(--red)"><b class="red">⚠ PAIN REPORTED</b><p class="small">${esc(w.painNote || '')}</p>
        <p class="small">Pause any movement that caused <b>sharp pain, joint instability or unusual symptoms</b> until your coach reviews it. Share this log with Claude for alternatives. If it persists or is severe, see a physio or doctor.</p></div>`;
    }
    if (!w.energy && !w.difficulty) html += `<p class="small muted center">Tip: fill in the debrief (energy, difficulty) for +10 XP and better coaching.</p>`;
    stopRest();
    go('records');
    const choice = await sys(html, [{ label: 'Share log .txt', value: 'share' }, { label: 'Done', primary: true, value: 'done' }]);
    if (choice === 'share') await shareOrDownload(`workout_${w.date}.txt`, workoutTxt(w));
    checkProgressEvents();
  }

  function importProgramDialog() {
    const sample = `# Day 1 – Lower Body Strength
Back Squat | 4 | 5 | 3 min | RPE 7 | brace hard
Romanian Deadlift | 3 | 8 | 2 min | RPE 7
# Day 2 – Conditioning
Bike Intervals | 1 | 10x30s | — | hard | warm up first | cardio`;
    sys(`<h3>IMPORT PROGRAM</h3>
      <p class="small">Paste a plan, one exercise per line:<br><span class="mono">Name | Sets | Reps | Rest | Load | Notes | cardio?</span><br>Start each day with <span class="mono">#&nbsp;Day name</span> (start it with Mon/Tue… to mark the weekday). Optional per-week targets: <span class="mono">weeks:20 min/25 min/…</span>. Ask your coach to output the plan in this format.</p>
      <textarea id="progText" style="min-height:180px" placeholder="${esc(sample)}"></textarea>`,
      [{ label: 'Cancel', value: 0 }, { label: 'Import', primary: true, value: 1 }]).then(ok => {
      if (!ok) return;
      const txt = (document.getElementById('progText') || {}).value || lastProgText;
      const prog = parseProgram(txt);
      if (!prog.days.length) { toast('No days found — start each day with "# Day name"'); return; }
      S.program = { ...S.program, days: prog.days }; save(); render(); toast(`Imported ${prog.days.length} days`);
    });
    // keep text in case modal re-renders
    setTimeout(() => { const t = document.getElementById('progText'); if (t) t.addEventListener('input', () => { lastProgText = t.value; }); }, 0);
  }
  let lastProgText = '';
  function parseProgram(txt) {
    const days = []; let cur = null;
    txt.split(/\r?\n/).forEach(line => {
      const l = line.trim(); if (!l) return;
      if (l.startsWith('#')) {
        const name = l.replace(/^#+\s*/, '');
        const dow = WEEKDAYS.findIndex(d => name.toLowerCase().startsWith(d.toLowerCase()));
        cur = { name, exercises: [], ...(dow >= 0 ? { dow } : {}) }; days.push(cur); return;
      }
      if (!cur) { cur = { name: 'Day 1', exercises: [] }; days.push(cur); }
      const p = l.split('|').map(s => s.trim());
      const isCardio = p.some(x => /^cardio$/i.test(x));
      const wk = p.find(x => /^weeks:/i.test(x));
      const parts = p.filter(x => !/^cardio$/i.test(x) && !/^weeks:/i.test(x));
      const weeks = wk ? wk.replace(/^weeks:\s*/i, '').split('/').map(x => x.trim()) : undefined;
      cur.exercises.push(ex(parts[0] || 'Exercise', num(parts[1]) || 3, parts[2] || (weeks ? weeks[0] : '10'), parts[3] || '', parts[4] || '', parts[5] || '', isCardio ? 'cardio' : 'strength', weeks));
    });
    return { days };
  }

  const PROFILE_LABELS = {
    'Name': 'name', 'Age': 'age', 'Height': 'height', 'Weight': 'weight', 'Body Fat Estimate': 'bodyFat',
    'Primary Goal': 'goal', 'Secondary Goals': 'secondaryGoals', 'Target Weight': 'targetWeight', 'Timeline': 'timeline',
    'Experience Level': 'experience', 'Weekly Activity Level': 'activity', 'Average Daily Steps': 'steps',
    'Favourite Training Styles': 'likes', 'Disliked Training Styles': 'dislikes',
    'Days Per Week': 'daysPerWeek', 'Session Length': 'sessionLength', 'Equipment Access': 'equipment',
    'Injuries': 'injuries', 'Medical Conditions': 'medical', 'Restrictions': 'restrictions',
    'Diet Preference': 'diet', 'Food Likes': 'foodLikes', 'Food Dislikes': 'foodDislikes', 'Allergies/Intolerances': 'allergies',
    'Cooking Ability': 'cooking', 'Budget': 'budget', 'Daily Eating Schedule': 'eatingSchedule',
  };
  const TARGET_LABELS = { 'Calories': 'calories', 'Protein': 'protein', 'Fibre': 'fibre', 'Water': 'water', 'Sleep': 'sleep', 'Steps': 'steps' };
  /** Parse a user_fitness_profile.txt back into the app. Returns number of fields read. */
  function applyProfileTxt(txt) {
    let n = 0;
    const parts = txt.split(/^Coach Notes:\s*$/m);
    parts[0].split(/\r?\n/).forEach(line => {
      const m = line.match(/^([^:]+):\s*(.*)$/); if (!m) return;
      const label = m[1].trim(), val = m[2].trim();
      if (PROFILE_LABELS[label]) { S.profile[PROFILE_LABELS[label]] = val; n++; }
      else if (TARGET_LABELS[label] && num(val) > 0) { S.targets[TARGET_LABELS[label]] = num(val); n++; }
    });
    if (parts[1] !== undefined) { S.profile.notes = parts[1].trim(); n++; }
    save();
    return n;
  }
  function importProfileDialog() {
    let text = '';
    sys(`<h3>IMPORT PROFILE</h3><p class="small">Paste the full <b>user_fitness_profile.txt</b> from your coach.</p><textarea id="profText" style="min-height:200px"></textarea>`,
      [{ label: 'Cancel', value: 0 }, { label: 'Import', primary: true, value: 1 }]).then(ok => {
      if (!ok) return;
      const n = applyProfileTxt(text);
      render(); toast(n ? `Profile updated (${n} fields)` : 'No profile fields found');
    });
    setTimeout(() => { const t = document.getElementById('profText'); if (t) t.addEventListener('input', () => { text = t.value; }); }, 0);
  }

  $('#fileInput').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    const raw = await f.text();
    if (/USER FITNESS PROFILE/.test(raw)) { const n = applyProfileTxt(raw); render(); toast(`Profile updated (${n} fields)`); return; }
    try {
      const obj = JSON.parse(raw);
      const data = obj.data || obj;
      if (!data.days || !data.workouts) throw new Error('not a backup');
      const ok = await sys(`<h3>RESTORE BACKUP?</h3><p class="center">${data.workouts.length} workouts, ${Object.keys(data.days).length} days of quests.<br>This replaces the data on this device.</p>`, [{ label: 'Cancel', value: 0 }, { label: 'Restore', primary: true, value: 1 }]);
      if (!ok) return;
      S = migrate(data); save(); render(); toast('Backup restored');
    } catch (err) {
      sys('<h3 class="red">IMPORT FAILED</h3><p class="center">That file is not an AWAKEN backup.</p>');
    }
  });

  // ------------------------------------------------------------------ cloud sync (GitHub Gist)
  // Token is kept in its own localStorage key so it never ends up in backups or the gist itself.
  const SYNC_KEY = 'awaken.sync.v1';
  const GIST_SAVE = 'awaken_save.json';
  let SYNC = (() => { try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch { return {}; } })();
  const pendingSync = {};
  let syncTimer = null, syncBusy = false, syncErr = '';
  const saveSyncCfg = () => { try { localStorage.setItem(SYNC_KEY, JSON.stringify(SYNC)); } catch {} };

  function syncStatusText() {
    if (!SYNC.token) return 'off';
    if (syncBusy) return 'syncing…';
    if (syncErr) return '⚠ ' + syncErr;
    if (!SYNC.lastSync) return 'not synced yet';
    const dirty = (S.updatedAt || 0) > SYNC.lastSync;
    const t = new Date(SYNC.lastSync);
    return `${dirty ? 'pending · ' : ''}last ${t.toLocaleDateString('en', { day: 'numeric', month: 'short' })} ${pad(t.getHours())}:${pad(t.getMinutes())}`;
  }

  async function gh(path, opts = {}) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch('https://api.github.com' + path, {
        ...opts, signal: ctrl.signal,
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${SYNC.token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
      });
      if (res.status === 401) throw new Error('token rejected');
      if (res.status === 404) throw new Error('gist not found');
      if (!res.ok) throw new Error('GitHub error ' + res.status);
      return res.json();
    } catch (e) {
      throw new Error(e.name === 'AbortError' ? 'timed out' : (e.message === 'Failed to fetch' ? 'offline' : e.message));
    } finally { clearTimeout(to); }
  }

  function gistFiles() {
    return {
      [GIST_SAVE]: { content: JSON.stringify({ app: 'AWAKEN', exported: new Date().toISOString(), data: S }) },
      'coach_report_all.txt': { content: reportTxt(0) },
      'coach_report_last7.txt': { content: reportTxt(7) },
      'user_fitness_profile.txt': { content: profileTxt() },
    };
  }

  function scheduleSync() {
    if (!SYNC.token || !SYNC.gistId) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => syncPush(false), 15000);
  }

  async function syncPush(manual) {
    if (!SYNC.token || syncBusy) return false;
    if (!navigator.onLine) { syncErr = 'offline — will retry'; if (manual) toast('Offline — will sync when back online'); return false; }
    syncBusy = true;
    try {
      const body = JSON.stringify({ description: 'AWAKEN fitness save (auto-synced)', files: gistFiles() });
      if (SYNC.gistId) await gh(`/gists/${SYNC.gistId}`, { method: 'PATCH', body });
      else { const g = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: 'AWAKEN fitness save (auto-synced)', public: false, files: gistFiles() }) }); SYNC.gistId = g.id; }
      SYNC.lastSync = Date.now(); syncErr = ''; saveSyncCfg();
      if (manual) toast('☁ Synced');
      return true;
    } catch (e) {
      syncErr = e.message; if (manual) toast('Sync failed: ' + e.message);
      return false;
    } finally { syncBusy = false; }
  }

  async function fetchRemote() {
    const g = await gh(`/gists/${SYNC.gistId}`);
    const f = g.files && g.files[GIST_SAVE];
    if (!f) throw new Error('no save in gist');
    let text = f.content;
    if (f.truncated) text = await (await fetch(f.raw_url)).text();
    const obj = JSON.parse(text);
    return obj.data || obj;
  }

  async function syncPull(manual) {
    if (!SYNC.token || !SYNC.gistId) return;
    try {
      const remote = await fetchRemote();
      const rT = remote.updatedAt || 0, lT = S.updatedAt || 0;
      if (manual) {
        const ok = await sys(`<h3>LOAD FROM CLOUD?</h3><p class="center">Cloud save: ${remote.workouts.length} workouts, last change ${rT ? new Date(rT).toLocaleString() : 'unknown'}.<br>This replaces the data on this device.</p>`, [{ label: 'Cancel', value: 0 }, { label: 'Load', primary: true, value: 1 }]);
        if (!ok) return;
      } else if (rT <= lT) {
        return; // this device is up to date (or newer — push will follow)
      } else if (lT > (SYNC.lastSync || 0)) {
        const pick = await sys(`<h3>SYNC CONFLICT</h3><p class="center">Both this device and the cloud have changes.<br>Cloud: ${new Date(rT).toLocaleString()}<br>This device: ${new Date(lT).toLocaleString()}</p>`,
          [{ label: 'Keep this device', value: 'local' }, { label: 'Use cloud', primary: true, value: 'cloud' }]);
        if (pick === 'local') { await syncPush(true); return; }
      }
      S = migrate(remote); save(false);
      SYNC.lastSync = Date.now(); syncErr = ''; saveSyncCfg();
      render(); toast('☁ Loaded from cloud');
    } catch (e) {
      syncErr = e.message; if (manual) toast('Load failed: ' + e.message);
    }
  }

  async function syncConnect() {
    const token = pendingSync.token, gistId = pendingSync.gistId ?? SYNC.gistId;
    if (!token) { toast('Paste your GitHub token first'); return; }
    SYNC = { token, gistId: gistId || '' };
    try {
      if (gistId) {
        const remote = await fetchRemote();
        const ok = await sys(`<h3>EXISTING SAVE FOUND</h3><p class="center">${remote.workouts.length} workouts in the cloud.</p>`,
          [{ label: 'Overwrite cloud with this device', value: 'push' }, { label: 'Load cloud data', primary: true, value: 'pull' }]);
        if (ok === 'pull') { S = migrate(remote); save(false); SYNC.lastSync = Date.now(); }
        else if (!(await syncPush(true))) throw new Error(syncErr);
      } else if (!(await syncPush(true))) {
        throw new Error(syncErr); // creating the gist validates token + gist scope
      }
      saveSyncCfg(); render();
      if (SYNC.gistId) sys(`<h3>CLOUD SYNC ACTIVE</h3><p class="center">Gist ID:<br><b class="mono gold">${esc(SYNC.gistId)}</b></p><p class="small muted">Save this ID with your token in a password manager — you need both to restore on a new device.</p>`);
    } catch (e) {
      SYNC = {}; saveSyncCfg(); render();
      sys(`<h3 class="red">CONNECT FAILED</h3><p class="center">${esc(e.message)}</p><p class="small muted">Check the token is a <b>classic</b> token with the <b>gist</b> scope.</p>`);
    }
  }

  window.addEventListener('online', () => { if ((S.updatedAt || 0) > (SYNC.lastSync || 0)) syncPush(false); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && SYNC.token && (S.updatedAt || 0) > (SYNC.lastSync || 0)) { clearTimeout(syncTimer); syncPush(false); }
  });

  // ------------------------------------------------------------------ boot
  function intro() {
    if (S.onboarded) return;
    sys(`<h3>YOU HAVE BEEN CHOSEN</h3>
      <p>The System has detected a player with untapped potential.</p>
      <p>Clear <b>Daily Quests</b> (steps, protein, fibre, water, sleep, training) and <b>Dungeons</b> (workouts) to earn XP, raise your stats and climb from <b>E-Rank</b> to <b>S-Rank</b> over your 6-week program.</p>
      <p class="small muted">Step 1: complete your profile and send it to your coach. All data stays on this device.</p>`,
      [{ label: 'Accept', primary: true, value: 1 }]).then(() => {
      S.onboarded = true; S.seenPenalty = dkey(); save(); go('profile');
    });
  }

  // Midnight rollover: refresh quests if the app stays open past midnight.
  let lastDay = dkey();
  setInterval(() => { if (dkey() !== lastDay) { lastDay = dkey(); questDate = lastDay; render(); checkProgressEvents(); } }, 60000);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  render();
  intro();
  (async () => {
    // Pull newer data from another device before awarding level-ups etc.
    if (SYNC.token && SYNC.gistId && navigator.onLine) await syncPull(false);
    if (S.onboarded) checkProgressEvents();
    if (SYNC.token && (S.updatedAt || 0) > (SYNC.lastSync || 0)) scheduleSync();
  })();
})();
