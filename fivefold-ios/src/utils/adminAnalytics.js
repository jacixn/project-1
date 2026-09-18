// Pure helpers for the admin User Analytics screen. No imports so a node test
// can load this file after a babel transform without touching Firebase or RN.

const DAY = 24 * 60 * 60 * 1000;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Firestore Timestamp / Date / number (ms) / ISO string -> ms. Anything else -> null.
export const toMillis = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof v === 'string') {
    if (!v.trim()) return null;
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : null;
  }
  if (typeof v === 'object') {
    if (typeof v.toMillis === 'function') {
      try {
        const t = v.toMillis();
        return Number.isFinite(t) ? t : null;
      } catch (e) {
        return null;
      }
    }
    if (typeof v.seconds === 'number') {
      const nanos = typeof v.nanoseconds === 'number' ? v.nanoseconds : 0;
      return v.seconds * 1000 + Math.floor(nanos / 1e6);
    }
    if (typeof v.toDate === 'function') {
      try {
        const t = v.toDate().getTime();
        return Number.isFinite(t) ? t : null;
      } catch (e) {
        return null;
      }
    }
  }
  return null;
};

const num = (v, fallback = 0) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
};

const cleanString = (v) => (typeof v === 'string' && v.trim() ? v.trim() : '');

const maxOf = (values) => {
  let best = null;
  for (const v of values) {
    if (v === null || v === undefined) continue;
    if (best === null || v > best) best = v;
  }
  return best;
};

export const normalizeUser = (id, data, seasonKey) => {
  const d = data || {};
  const username = cleanString(d.username);
  const displayName = cleanString(d.displayName) || username || 'Someone';
  const createdAt = toMillis(d.createdAt) ?? toMillis(d.joinedDate) ?? null;
  const lastSeen = maxOf([
    toMillis(d.lastActive),
    toMillis(d.lastStreakUpdate),
    toMillis(d.pushTokenUpdatedAt),
    createdAt,
  ]);
  const seasonalPoints = d.currentSeason === seasonKey ? num(d.seasonalPoints, 0) : 0;
  return {
    uid: id,
    displayName,
    username,
    email: cleanString(d.email),
    country: cleanString(d.country),
    level: num(d.level, 0),
    totalPoints: num(d.totalPoints, 0),
    seasonalPoints,
    currentStreak: num(d.currentStreak, 0),
    attribution: cleanString(d.attribution) || null,
    createdAt,
    lastSeen,
    // Referral links are written by referralService inside a transaction:
    // referredBy* live on the referred user, referralCount on the referrer.
    referredBy: cleanString(d.referredBy) || null,
    referredByUsername: cleanString(d.referredByUsername),
    referredByDisplayName: cleanString(d.referredByDisplayName),
    referralDate: toMillis(d.referralDate) ?? null,
    referralCount: num(d.referralCount, 0),
  };
};

export const ATTRIBUTION_LABELS = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  twitter: 'X / Twitter',
  friend: 'Friend / Family',
  appstore: 'App Store',
  google: 'Google Search',
  youtube: 'YouTube',
  church: 'Church',
  other: 'Other',
};

export const ATTRIBUTION_COLORS = {
  tiktok: '#000000',
  instagram: '#E1306C',
  twitter: '#1DA1F2',
  friend: '#FF7043',
  appstore: '#007AFF',
  google: '#4285F4',
  youtube: '#FF0000',
  church: '#8E24AA',
  other: '#78909C',
};

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const byName = (a, b) => a.displayName.localeCompare(b.displayName);

const sortDesc = (key, then) => (a, b) => {
  if (b[key] !== a[key]) return b[key] - a[key];
  return then ? then(a, b) : 0;
};

export const computeAnalytics = (users, opts = {}) => {
  const now = typeof opts.now === 'number' ? opts.now : Date.now();
  const list = Array.isArray(users) ? users : [];
  const total = list.length;

  // Future-skewed timestamps (client clocks ahead) count as now, matching relativeTime's clamp.
  const within = (ms, span) => ms !== null && ms !== undefined && now - Math.min(ms, now) <= span;

  let newToday = 0;
  let newThisWeek = 0;
  let newThisMonth = 0;
  const active = { day: 0, week: 0, month: 0 };

  for (const u of list) {
    if (within(u.createdAt, DAY)) newToday++;
    if (within(u.createdAt, 7 * DAY)) newThisWeek++;
    if (within(u.createdAt, 30 * DAY)) newThisMonth++;
    if (within(u.lastSeen, DAY)) active.day++;
    if (within(u.lastSeen, 7 * DAY)) active.week++;
    if (within(u.lastSeen, 30 * DAY)) active.month++;
  }

  const withCreated = list.filter((u) => u.createdAt !== null && u.createdAt !== undefined)
    .sort(sortDesc('createdAt', byName));
  const withoutCreated = list.filter((u) => u.createdAt === null || u.createdAt === undefined)
    .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0) || byName(a, b));
  const recent = withCreated.concat(withoutCreated).slice(0, 12);

  const lastSeen = list.filter((u) => u.lastSeen !== null && u.lastSeen !== undefined)
    .sort(sortDesc('lastSeen', byName))
    .slice(0, 10);

  const topSeason = list.filter((u) => u.seasonalPoints > 0)
    .sort(sortDesc('seasonalPoints', sortDesc('totalPoints', byName)))
    .slice(0, 10);

  const topAllTime = list.filter((u) => u.totalPoints > 0)
    .sort(sortDesc('totalPoints', sortDesc('seasonalPoints', byName)))
    .slice(0, 10);

  const counts = {};
  let answered = 0;
  for (const u of list) {
    if (!u.attribution) continue;
    answered++;
    counts[u.attribution] = (counts[u.attribution] || 0) + 1;
  }
  const attribution = Object.keys(counts)
    .map((id) => ({
      id,
      label: ATTRIBUTION_LABELS[id] || id,
      color: ATTRIBUTION_COLORS[id] || '#999999',
      count: counts[id],
      pctOfAnswered: pct(counts[id], answered),
      pctOfTotal: pct(counts[id], total),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const referrals = computeReferrals(list, total);

  return {
    total,
    newToday,
    newThisWeek,
    newThisMonth,
    recent,
    active,
    lastSeen,
    topSeason,
    topAllTime,
    attribution,
    answered,
    notAnswered: total - answered,
    referrals,
  };
};

// Timestamp desc with null / non-finite values last, then by name.
const byDateDescNullLast = (key) => (a, b) => {
  const av = a[key];
  const bv = b[key];
  const aNull = av === null || av === undefined || !Number.isFinite(av);
  const bNull = bv === null || bv === undefined || !Number.isFinite(bv);
  if (aNull && bNull) return byName(a, b);
  if (aNull) return 1;
  if (bNull) return -1;
  if (bv !== av) return bv - av;
  return byName(a, b);
};

// Who referred who. The truth for counts is the referredBy links on the
// referred users, never the denormalized referralCount (which can drift; it is
// surfaced as storedCount so the owner can spot the drift).
const computeReferrals = (list, total) => {
  const byUid = {};
  const byUsername = {};
  for (const u of list) {
    if (!u) continue;
    if (u.uid !== null && u.uid !== undefined) byUid[u.uid] = u;
    if (u.username) byUsername[String(u.username).toLowerCase()] = u;
  }
  // Referrals normally store the referrer's uid, but early accounts may hold a
  // username instead, or a uid that was later replaced by a re-created account.
  // Resolve by uid first, then by the recorded username, so referrals land on
  // the account that exists today.
  const resolveReferrer = (u) => {
    const direct = byUid[u.referredBy];
    if (direct) return direct;
    const candidates = [u.referredByUsername, u.referredBy];
    for (const c of candidates) {
      if (!c) continue;
      const hit = byUsername[String(c).toLowerCase()];
      if (hit) return hit;
    }
    return null;
  };

  const groups = {};
  const referredUsers = [];
  const seen = {};
  for (const u of list) {
    if (!u || !u.referredBy) continue;
    // Duplicate docs for the same uid cannot happen, but do not double count if they do.
    if (u.uid !== null && u.uid !== undefined) {
      if (seen[u.uid]) continue;
      seen[u.uid] = true;
    }
    const referrer = resolveReferrer(u);
    // Group under the account that exists today so uid and username records merge.
    const referrerUid = referrer ? referrer.uid : u.referredBy;
    if (!groups[referrerUid]) {
      groups[referrerUid] = {
        uid: referrerUid,
        displayName: '',
        username: '',
        count: 0,
        storedCount: referrer ? referrer.referralCount : 0,
        resolved: !!referrer,
        referred: [],
      };
    }
    const g = groups[referrerUid];
    g.count++;
    g.referred.push({
      uid: u.uid,
      displayName: u.displayName,
      username: u.username,
      referralDate: u.referralDate ?? null,
    });
    if (referrer) {
      g.displayName = referrer.displayName;
      g.username = referrer.username;
    } else {
      // Fall back to what the referred user recorded about their referrer.
      if (!g.displayName) g.displayName = u.referredByDisplayName || u.referredByUsername || '';
      if (!g.username) g.username = u.referredByUsername || '';
    }
    const referrerName = g.displayName || g.username || 'Deleted account';
    referredUsers.push({
      uid: u.uid,
      displayName: u.displayName,
      username: u.username,
      referrerUid,
      referrerName,
      referralDate: u.referralDate ?? null,
    });
  }

  const earliest = (g) => {
    let best = null;
    for (const r of g.referred) {
      const t = r.referralDate;
      if (t === null || t === undefined || !Number.isFinite(t)) continue;
      if (best === null || t < best) best = t;
    }
    return best;
  };

  const topReferrers = Object.keys(groups).map((uid) => {
    const g = groups[uid];
    if (!g.displayName) g.displayName = g.username || 'Deleted account';
    g.referred.sort(byDateDescNullLast('referralDate'));
    g.firstReferral = earliest(g);
    return g;
  }).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    const aNull = a.firstReferral === null;
    const bNull = b.firstReferral === null;
    if (aNull !== bNull) return aNull ? 1 : -1;
    if (!aNull && a.firstReferral !== b.firstReferral) return a.firstReferral - b.firstReferral;
    return byName(a, b);
  }).map((g) => ({
    uid: g.uid,
    displayName: g.displayName,
    username: g.username,
    count: g.count,
    storedCount: g.storedCount,
    resolved: g.resolved,
    referred: g.referred,
  }));

  // Names of unresolved referrers are settled above; re-stamp the recent rows so
  // both lists agree on the fallback.
  for (const r of referredUsers) {
    const g = groups[r.referrerUid];
    if (g) r.referrerName = g.displayName || g.username || 'Deleted account';
  }

  const recent = referredUsers.sort(byDateDescNullLast('referralDate')).slice(0, 20);
  const totalReferred = referredUsers.length;

  return {
    totalReferred,
    pctOfTotal: pct(totalReferred, total),
    referrerCount: topReferrers.length,
    topReferrers,
    recent,
  };
};

export const relativeTime = (ms, now) => {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return 'unknown';
  const ref = typeof now === 'number' ? now : Date.now();
  const diff = Math.max(0, ref - ms);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const d = new Date(ms);
  const refYear = new Date(ref).getFullYear();
  const base = `${MONTHS[d.getMonth()]} ${d.getDate()}`;
  return d.getFullYear() === refYear ? base : `${base}, ${d.getFullYear()}`;
};

export const formatDate = (ms) => {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '';
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

export const formatClock = (ms) => {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) return '';
  const d = new Date(ms);
  let h = d.getHours();
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} ${suffix}`;
};
