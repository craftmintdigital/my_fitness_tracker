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
  const e1rm = (w, r) => (w > 0 && r > 0 && r <= 12) ? w * (1 + r / 30) : 0;

  // ------------------------------------------------------------------ default data
  const ex = (name, sets, reps, rest, load, notes = '', type = 'strength') => ({ name, sets, reps, rest, load, notes, type });

  const DEFAULT_PROGRAM = {
    note: 'Starter template. Paste your profile into Claude, then replace this with the coach\'s personalised 6-week plan (Plan → Edit).',
    days: [
      { name: 'Day 1 – Lower Body Strength', exercises: [
        ex('Back Squat', 4, '5', '3 min', 'RPE 7 (2–3 reps in reserve)', 'Brace, controlled descent, full depth you own.'),
        ex('Romanian Deadlift', 3, '8', '2 min', 'RPE 7', 'Hips back, neutral spine. Stop if lower back takes over.'),
        ex('Walking Lunge', 3, '10/leg', '90 s', 'Moderate DBs', 'Long stride, knee tracks over toes.'),
        ex('Lying Leg Curl', 3, '12', '60 s', 'RPE 8', 'Slow 3 s lowering.'),
        ex('Plank', 3, '45s', '60 s', 'Bodyweight', 'Ribs down, squeeze glutes.'),
      ]},
      { name: 'Day 2 – Upper Body Strength', exercises: [
        ex('Bench Press', 4, '5', '3 min', 'RPE 7', 'Shoulder blades pinned, feet planted.'),
        ex('Barbell Row', 4, '6', '2 min', 'RPE 7', 'Torso ~45°, pull to lower ribs.'),
        ex('Overhead Press', 3, '8', '2 min', 'RPE 7', 'Glutes tight, no lower-back arch.'),
        ex('Pull-up / Lat Pulldown', 3, '10', '90 s', 'RPE 8', 'Full hang to chest-to-bar range.'),
        ex('Face Pull', 3, '15', '60 s', 'Light', 'Shoulder health — external rotate at the end.'),
      ]},
      { name: 'Day 3 – Conditioning', exercises: [
        ex('Bike / Row Intervals', 1, '10 x (30s hard / 90s easy)', '—', 'Hard = 8/10 effort', 'Warm up 5 min first.', 'cardio'),
        ex('Kettlebell Swing', 4, '15', '60 s', 'Moderate KB', 'Hip hinge, not a squat. Snap the hips.'),
        ex('Farmer Carry', 4, '40m', '60 s', 'Heavy DBs', 'Tall posture, slow steps.'),
      ]},
      { name: 'Day 4 – Full Body Hypertrophy', exercises: [
        ex('Trap Bar Deadlift', 3, '8', '2 min', 'RPE 7', 'Push the floor away.'),
        ex('Incline DB Press', 3, '10', '90 s', 'RPE 8', 'Control the stretch.'),
        ex('Leg Press', 3, '12', '90 s', 'RPE 8', 'Don\'t let hips roll off the pad.'),
        ex('Seated Cable Row', 3, '12', '90 s', 'RPE 8', 'Pause 1 s at the squeeze.'),
        ex('DB Lateral Raise', 3, '15', '60 s', 'Light', 'Lead with elbows.'),
        ex('Hanging Knee Raise', 3, '12', '60 s', 'Bodyweight', 'No swinging.'),
      ]},
      { name: 'Day 5 – Optional Activity', exercises: [
        ex('Zone 2 Walk / Ride / Sport', 1, '30–45 min', '—', 'Can hold a conversation', 'Anything you enjoy. Recovery, not punishment.', 'cardio'),
      ]},
    ],
  };

  const WEEK_FOCUS = [
    { t: 'Baseline', d: 'Find working weights at the target RPE. Log everything honestly.' },
    { t: '+1 Rep', d: 'Same loads as Week 1, add 1 rep to every set.' },
    { t: '+Load', d: 'Back to base reps, add 2.5–5% load on main lifts.' },
    { t: 'Deload', d: 'One fewer set, ~10% lighter. Technique focus. Recover.' },
    { t: 'Volume', d: '+1 set on every strength exercise, Week 3 loads.' },
    { t: 'Performance', d: 'Base sets. Beat your Week 3 numbers — PR attempts on the first lift if you feel good.' },
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
    DIS: 'Discipline — full quest clears',
  };

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
    trainingDays: [1, 2, 4, 5], // Mon Tue Thu Fri
    targets: { steps: 8000, protein: 140, water: 3, sleep: 7, fibre: 30, calories: 0 },
    days: {},
    workouts: [],
    program: JSON.parse(JSON.stringify(DEFAULT_PROGRAM)),
    draft: null,
    seenLevel: 1,
    seenRank: 'E',
    seenPenalty: '',
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
    return { ...b, ...s, profile: { ...b.profile, ...(s.profile || {}) }, targets: { ...b.targets, ...(s.targets || {}) } };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); }
    catch (e) { toast('⚠ Could not save — storage full?'); }
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
      { id: 'steps', label: 'Walk', unit: 'steps', target: T.steps, value: num(d.steps), stat: 'AGI', input: true, step: 500 },
      { id: 'protein', label: 'Protein', unit: 'g', target: T.protein, value: num(d.protein), stat: 'VIT', input: true, step: 5 },
      { id: 'fibre', label: 'Fibre', unit: 'g', target: T.fibre, value: num(d.fibre), stat: 'VIT', input: true, step: 1 },
      { id: 'water', label: 'Water', unit: 'L', target: T.water, value: num(d.water), stat: 'VIT', input: true, step: 0.25 },
      { id: 'sleep', label: 'Sleep', unit: 'h', target: T.sleep, value: num(d.sleep), stat: 'VIT', input: true, step: 0.25 },
    ];
    if (isTrainingDay(k)) {
      q.push({ id: 'workout', label: 'Clear a Dungeon (log a workout)', target: 1, value: workoutsOn(k).length ? 1 : 0, stat: 'STR', auto: true });
    } else {
      q.push({ id: 'mobility', label: 'Recovery: 10 min mobility / stretch', target: 1, value: (d.mobility || workoutsOn(k).length) ? 1 : 0, stat: 'AGI', toggle: true });
    }
    q.forEach(x => { x.done = x.target > 0 && x.value >= x.target; });
    return q;
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
    const stats = { STR: 0, END: 0, AGI: 0, VIT: 0, DIS: 0 };
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
    });

    // workouts, chronological for PR detection
    [...S.workouts].sort((a, b) => (a.date + a.id).localeCompare(b.date + b.id)).forEach(w => {
      let x = 30; const prs = [];
      let sets = 0, minutes = 0;
      (w.exercises || []).forEach(e => {
        const key = e.name.trim().toLowerCase();
        if (!key) return;
        if (e.type === 'cardio') { minutes += num(e.min); return; }
        let top = null;
        (e.sets || []).forEach(s => {
          const W = num(s.w), R = num(s.r);
          if (R > 0) sets++;
          const v = e1rm(W, R);
          if (v && (!top || v > top.e1rm)) top = { e1rm: v, w: W, r: R, date: w.date };
        });
        if (top) {
          if (best[key] && top.e1rm > best[key].e1rm + 0.01) { prs.push(e.name); x += 25; }
          if (!best[key] || top.e1rm > best[key].e1rm) best[key] = { ...top, name: e.name };
        }
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
    if (e.type === 'strength') {
      const m = reps.match(/^(\d+)(.*)$/);
      if (wk === 2 && m && !/s$/i.test(m[2])) reps = (parseInt(m[1], 10) + 1) + m[2];
      if (wk === 4) { sets = Math.max(2, sets - 1); load = (load ? load + ' · ' : '') + '~10% lighter'; }
      if (wk === 5) sets += 1;
      if (wk === 3) load = (load ? load + ' · ' : '') + '+2.5–5% vs Wk2';
      if (wk === 6) load = (load ? load + ' · ' : '') + 'beat Wk3';
    } else if (wk === 4) {
      load = (load ? load + ' · ' : '') + 'easier, shorter';
    }
    return { ...e, sets, reps, load };
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
        (e.sets || []).filter(s => s.r !== '' || s.w !== '').forEach(s => lines.push(`${num(s.w)}kg x ${num(s.r)}`));
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
    Object.values(D.best).sort((a, b) => b.e1rm - a.e1rm).forEach(b => L.push(`${b.name}: ${b.w}kg x ${b.r} (e1RM ${b.e1rm.toFixed(1)}kg, ${b.date})`));
    L.push('');
    L.push('Coach: please review progress, fatigue and pain signals, ask your reflection questions, and adjust next week.');
    return L.join('\n') + '\n';
  }

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
    save();
  }

  // ------------------------------------------------------------------ views
  function render() {
    document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    const D = derive();
    $('#topMeta').innerHTML = `Lv <b>${D.level}</b> · ${D.rank.r}-Rank<br>Week ${Math.max(0, Math.min(programWeek(), 99))}/${PROGRAM_WEEKS}`;
    const v = $('#view');
    v.innerHTML = ({ status: viewStatus, quests: viewQuests, train: viewTrain, plan: viewPlan, records: viewRecords, profile: viewProfile })[tab](D);
    window.scrollTo({ top: 0 });
  }

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
          <button class="btn sm ghost" data-act="qday" data-delta="-1">‹</button>
          <span>Daily Quest · ${isToday ? 'Today' : fmtDate(k)}</span>
          <button class="btn sm ghost" data-act="qday" data-delta="1" ${isToday ? 'disabled' : ''}>›</button>
        </div>
        <p class="small muted" style="margin-top:0">${isTrainingDay(k) ? 'Training day.' : 'Rest day — recovery quest active.'} Each quest: +10 XP. Clear all: +50 XP bonus.</p>
        ${qs.map(q => questRow(q, k)).join('')}
        ${pen ? `<div class="quest penalty ${pen.done ? 'done' : ''}">
            <div class="check">${pen.done ? '✓' : ''}</div>
            <div><div class="q-label">${pen.label}</div><div class="q-sub">${pen.sub} +20 XP</div></div>
            <input type="checkbox" data-field="penalty" data-day="${k}" ${pen.done ? 'checked' : ''} aria-label="Penalty complete">
          </div>` : ''}
      </section>
      ${allDone ? `<section class="panel center"><b class="gold mono">◆ DAILY QUEST CLEARED ◆</b><div class="small muted">Rewards applied: +${qs.length * 10 + 50} XP</div></section>` : ''}
      <section class="panel">
        <div class="panel-title">Body & Fuel <small>optional</small></div>
        <div class="grid2">
          <label class="f"><span>Body weight (kg)</span><input inputmode="decimal" data-field="weight" data-day="${k}" value="${esc(d.weight || '')}"></label>
          <label class="f"><span>Calories (kcal)${S.targets.calories ? ' · target ' + S.targets.calories : ''}</span><input inputmode="numeric" data-field="calories" data-day="${k}" value="${esc(d.calories || '')}"></label>
        </div>
        <label class="f"><span>Day notes (mood, stress, soreness, food)</span><textarea data-field="note" data-day="${k}">${esc(d.note || '')}</textarea></label>
      </section>`;
  }

  function questRow(q, k) {
    let ctl = '';
    if (q.input) ctl = `<div class="row"><button class="btn sm" data-act="bump" data-field="${q.id}" data-day="${k}" data-step="${q.step}" aria-label="Add ${q.step}">+</button><input inputmode="decimal" data-field="${q.id}" data-day="${k}" value="${q.value || ''}" placeholder="0"></div>`;
    else if (q.toggle) ctl = `<input type="checkbox" data-field="${q.id}" data-day="${k}" ${q.done ? 'checked' : ''} aria-label="${esc(q.label)}">`;
    else if (q.auto) ctl = q.done ? '<span class="small green mono">CLEARED</span>' : `<button class="btn sm" data-act="go" data-tab="train">Go</button>`;
    const sub = q.input ? `${q.value || 0} / ${q.target} ${q.unit} · ${q.stat}` : `${q.stat}`;
    return `<div class="quest ${q.done ? 'done' : ''}" data-qrow="${q.id}">
      <div class="check">${q.done ? '✓' : ''}</div>
      <div><div class="q-label">${esc(q.label)}</div><div class="q-sub">${sub}</div></div>
      ${ctl}</div>`;
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
          ${S.program.days.map((d, i) => `<button class="btn block" style="margin-bottom:8px;text-align:left" data-act="start" data-day="${i}">⚔ ${esc(d.name)} <span class="muted small">· ${d.exercises.length} exercises</span></button>`).join('')}
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
      : `<div class="set-row small muted"><span class="n">Set</span><span class="center">kg</span><span class="center">reps / sec</span><span></span></div>
         ${e.sets.map((s, j) => `<div class="set-row"><span class="n">${j + 1}</span>
            <input inputmode="decimal" data-ex="${i}" data-set="${j}" data-k="w" value="${esc(s.w)}" aria-label="Set ${j + 1} weight">
            <input inputmode="numeric" data-ex="${i}" data-set="${j}" data-k="r" value="${esc(s.r)}" placeholder="reps" aria-label="Set ${j + 1} reps">
            <button class="x-btn" data-act="delset" data-ex="${i}" data-set="${j}" aria-label="Remove set">×</button></div>`).join('')}
         <button class="btn sm" data-act="addset" data-ex="${i}">+ Set</button>`;
    return `<div class="ex">
      <div class="ex-head"><input data-ex="${i}" data-k="name" value="${esc(e.name)}" placeholder="Exercise name"><button class="x-btn" data-act="delex" data-ex="${i}" aria-label="Remove exercise">×</button></div>
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
    const bests = Object.values(D.best).sort((a, b) => b.e1rm - a.e1rm);
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
        <div class="panel-title">Records <small>est. 1RM</small></div>
        ${bests.length ? bests.map(b => `<div class="stat"><span>${esc(b.name)}</span><span class="mono">${b.w}×${b.r} · <b class="gold">${b.e1rm.toFixed(1)}</b></span></div>`).join('') : '<p class="muted small">Log some lifts to set records.</p>'}
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
        <div class="panel-title">Save Data</div>
        <p class="small muted" style="margin-top:0">Everything is stored only on this device. Back up regularly — clearing browser data erases it.</p>
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
        <div class="row wrap"><button class="btn primary" data-act="profiletxt">Share profile .txt</button><button class="btn" data-act="copyprofile">Copy</button></div>
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
          ${[['steps', 'Steps / day'], ['protein', 'Protein g / day'], ['fibre', 'Fibre g / day'], ['water', 'Water L / day'], ['sleep', 'Sleep h / night'], ['calories', 'Calories / day']].map(([k, l]) => `<label class="f"><span>${l}</span><input inputmode="decimal" data-target="${k}" value="${esc(T[k] || '')}"></label>`).join('')}
        </div>
        <p class="small muted">Set calorie/macro targets from your coach's nutrition plan.</p>
        <button class="btn danger sm" data-act="wipe">Erase all data</button>
      </section>`;
  }

  // ------------------------------------------------------------------ events
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]'); if (!b) return;
    tab = b.dataset.tab; planEdit = false; render();
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
    if (t.dataset.prof) { S.profile[t.dataset.prof] = val; save(); return; }
    if (t.dataset.target) { S.targets[t.dataset.target] = num(val); save(); return; }
    if (t.dataset.pd !== undefined) {
      const d = S.program.days[+t.dataset.pd];
      if (t.dataset.pe !== undefined) d.exercises[+t.dataset.pe][t.dataset.k] = t.dataset.k === 'sets' ? num(val) : val; else d[t.dataset.k] = val;
      save(); return;
    }
    if (t.dataset.pnote !== undefined) { S.program.note = val; save(); }
  });

  view.addEventListener('change', e => {
    const t = e.target;
    if (t.type === 'checkbox' && t.dataset.day) { render(); checkProgressEvents(); }
    else if (t.dataset.draft === 'pain') render();
    else if (t.dataset.set === 'startDate' && t.value) { S.startDate = t.value; save(); }
    else if (t.dataset.day && t.dataset.field !== 'note') { render(); checkProgressEvents(); }
    else if (t.dataset.k === 'type') render();
  });

  function refreshQuestRow(input) {
    // update the tick / subtitle without re-rendering (keeps keyboard focus)
    const row = input.closest('[data-qrow]'); if (!row) return;
    const q = questsFor(input.dataset.day).find(x => x.id === row.dataset.qrow); if (!q) return;
    row.classList.toggle('done', q.done);
    row.querySelector('.check').textContent = q.done ? '✓' : '';
    row.querySelector('.q-sub').textContent = `${q.value || 0} / ${q.target} ${q.unit} · ${q.stat}`;
  }

  view.addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = b.dataset.act;
    switch (a) {
      case 'go': tab = b.dataset.tab; render(); break;
      case 'qday': {
        const n = addDays(questDate, +b.dataset.delta);
        if (n <= dkey()) { questDate = n; render(); }
        break;
      }
      case 'bump': {
        const d = day(b.dataset.day); const f = b.dataset.field;
        d[f] = String(+(num(d[f]) + num(b.dataset.step)).toFixed(2)); save(); render(); checkProgressEvents();
        break;
      }
      case 'start': newDraft(+b.dataset.day); render(); break;
      case 'discard':
        if (await sys('<h3>ABANDON DUNGEON?</h3><p class="center">This in-progress workout will be lost.</p>', [{ label: 'Cancel', value: 0 }, { label: 'Abandon', danger: true, value: 1 }])) { S.draft = null; save(); render(); }
        break;
      case 'addex':
        S.draft.exercises.push(b.dataset.type === 'cardio' ? { name: '', type: 'cardio', min: '', dist: '', note: '' } : { name: '', type: 'strength', sets: [{ w: '', r: '' }], note: '' });
        save(); render(); break;
      case 'delex': S.draft.exercises.splice(+b.dataset.ex, 1); save(); render(); break;
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
        save(); tab = 'train'; render(); break;
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
          localStorage.removeItem(STORE_KEY); S = blankState(); save(); tab = 'status'; render(); intro();
        }
        break;
      case 'pweek': planWeek = +b.dataset.w; render(); break;
      case 'planedit': planEdit = !planEdit; render(); break;
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
    tab = 'records';
    render();
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
      <p class="small">Paste a plan, one exercise per line:<br><span class="mono">Name | Sets | Reps | Rest | Load | Notes | cardio?</span><br>Start each day with <span class="mono">#&nbsp;Day name</span>. Ask your coach to output the plan in this format.</p>
      <textarea id="progText" style="min-height:180px" placeholder="${esc(sample)}"></textarea>`,
      [{ label: 'Cancel', value: 0 }, { label: 'Import', primary: true, value: 1 }]).then(ok => {
      if (!ok) return;
      const txt = (document.getElementById('progText') || {}).value || lastProgText;
      const prog = parseProgram(txt);
      if (!prog.days.length) { toast('No days found — start each day with "# Day name"'); return; }
      S.program = { note: S.program.note, days: prog.days }; save(); render(); toast(`Imported ${prog.days.length} days`);
    });
    // keep text in case modal re-renders
    setTimeout(() => { const t = document.getElementById('progText'); if (t) t.addEventListener('input', () => { lastProgText = t.value; }); }, 0);
  }
  let lastProgText = '';
  function parseProgram(txt) {
    const days = []; let cur = null;
    txt.split(/\r?\n/).forEach(line => {
      const l = line.trim(); if (!l) return;
      if (l.startsWith('#')) { cur = { name: l.replace(/^#+\s*/, ''), exercises: [] }; days.push(cur); return; }
      if (!cur) { cur = { name: 'Day 1', exercises: [] }; days.push(cur); }
      const p = l.split('|').map(s => s.trim());
      const isCardio = p.some(x => /^cardio$/i.test(x));
      const parts = p.filter(x => !/^cardio$/i.test(x));
      cur.exercises.push(ex(parts[0] || 'Exercise', num(parts[1]) || 3, parts[2] || '10', parts[3] || '', parts[4] || '', parts[5] || '', isCardio ? 'cardio' : 'strength'));
    });
    return { days };
  }

  $('#fileInput').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      const data = obj.data || obj;
      if (!data.days || !data.workouts) throw new Error('not a backup');
      const ok = await sys(`<h3>RESTORE BACKUP?</h3><p class="center">${data.workouts.length} workouts, ${Object.keys(data.days).length} days of quests.<br>This replaces the data on this device.</p>`, [{ label: 'Cancel', value: 0 }, { label: 'Restore', primary: true, value: 1 }]);
      if (!ok) return;
      S = migrate(data); save(); render(); toast('Backup restored');
    } catch (err) {
      sys('<h3 class="red">IMPORT FAILED</h3><p class="center">That file is not an AWAKEN backup.</p>');
    }
  });

  // ------------------------------------------------------------------ boot
  function intro() {
    if (S.onboarded) return;
    sys(`<h3>YOU HAVE BEEN CHOSEN</h3>
      <p>The System has detected a player with untapped potential.</p>
      <p>Clear <b>Daily Quests</b> (steps, protein, fibre, water, sleep, training) and <b>Dungeons</b> (workouts) to earn XP, raise your stats and climb from <b>E-Rank</b> to <b>S-Rank</b> over your 6-week program.</p>
      <p class="small muted">Step 1: complete your profile and send it to your coach. All data stays on this device.</p>`,
      [{ label: 'Accept', primary: true, value: 1 }]).then(() => {
      S.onboarded = true; S.seenPenalty = dkey(); save(); tab = 'profile'; render();
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
  if (S.onboarded) checkProgressEvents();
})();
