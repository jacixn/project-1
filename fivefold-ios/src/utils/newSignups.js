// Deciding what to say when somebody new joins. Pure: no React, no network,
// no Firebase, so the rules can be tested on their own.
//
// Only the owner accounts ever see this. The gate lives in config/admin.js
// and is checked by the service before any of this runs.

// Nobody wants twelve separate banners because a class signed up at once.
export const MAX_NAMED = 3;

/**
 * The accounts created since we last looked.
 * `since` is null the very first time, which means we have no idea what is
 * new and must not announce the entire user base.
 */
export const pickNewSignups = (users, since, now = Date.now()) => {
  if (!Array.isArray(users) || since == null) return [];
  return users
    .filter((u) => u && typeof u.createdAt === 'number' && u.createdAt > since && u.createdAt <= now + 60000)
    .sort((a, b) => b.createdAt - a.createdAt);
};

/** The newest timestamp to remember, so the same account is never announced twice. */
export const highWaterMark = (users, since, now = Date.now()) => {
  const stamps = (Array.isArray(users) ? users : [])
    .map((u) => (u && typeof u.createdAt === 'number' ? u.createdAt : null))
    .filter((t) => t != null && t <= now + 60000);
  return stamps.length ? Math.max(since ?? 0, ...stamps) : (since ?? now);
};

const nameOf = (u) => {
  const n = (u?.displayName || u?.username || '').trim();
  return n || 'Someone';
};

const list = (names) => {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

/**
 * What the notification says. Returns null when there is nothing to say, so
 * the caller never posts an empty alert.
 */
export const summariseSignups = (newUsers) => {
  const users = Array.isArray(newUsers) ? newUsers.filter(Boolean) : [];
  if (!users.length) return null;

  if (users.length === 1) {
    return { title: 'Someone joined Biblely', body: `${nameOf(users[0])} just created an account.`, count: 1 };
  }

  const named = users.slice(0, MAX_NAMED).map(nameOf);
  const rest = users.length - named.length;
  const who = rest > 0 ? `${list(named)} and ${rest} more` : list(named);
  return {
    title: `${users.length} people joined Biblely`,
    body: `${who} created accounts.`,
    count: users.length,
  };
};
