/**
 * How often a reminder comes round.
 *
 * Reminders were weekly and only weekly: a set of weekdays, every week,
 * forever. That covers "every Tuesday" and nothing else, so a fortnightly
 * or a monthly reminder had to be re-entered by hand each time.
 *
 * Three modes now:
 *
 *   weekly     the selected weekdays, every week. What every existing
 *              reminder already is, and the default when nothing says
 *              otherwise, so nothing that is already saved changes.
 *   biweekly   the selected weekdays, every OTHER week. Which weeks are
 *              the "on" weeks is fixed by the anchor, so the series cannot
 *              drift when the app is reopened or the phone is restarted.
 *   monthly    the same DAY OF THE MONTH as the anchor. Day of month, not
 *              "the second Tuesday", because that is what people mean by
 *              monthly and it is the one a person can predict without
 *              counting. Weekdays are not used in this mode.
 *
 * Everything is derived from the reminder plus the date being asked about.
 * Nothing is stored per occurrence and no state advances as time passes,
 * so the same question always gets the same answer, on any device, in any
 * order, however long the app has been closed.
 *
 * Pure: no storage, no Date.now inside the rules. The selftest runs these
 * exact functions.
 */

export const REPEATS = ['weekly', 'biweekly', 'monthly'];
// Short enough for three chips in one row on a 393pt screen. The long
// form is what VoiceOver reads and what other surfaces spell out.
export const REPEAT_LABEL = { weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly' };
export const REPEAT_SPOKEN = { weekly: 'Every week', biweekly: 'Every two weeks', monthly: 'Every month' };

/** Anything unknown, missing, or malformed is weekly, which is what every reminder was. */
export const repeatOf = (r) => (REPEATS.includes(r && r.repeat) ? r.repeat : 'weekly');

const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** A YYYY-MM-DD as a LOCAL noon Date: noon so a timezone shift cannot move the day. */
export const parseKey = (key) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  return Number.isFinite(d.getTime()) ? d : null;
};

/**
 * Which week a date falls in, counted from a fixed Sunday.
 *
 * Counted in whole LOCAL days from an epoch Sunday rather than by dividing
 * milliseconds: an hour lost or gained to daylight saving makes a
 * millisecond division land in the wrong week twice a year, and a
 * fortnightly reminder would then skip or double in late March.
 */
const EPOCH_SUNDAY = Date.UTC(2024, 0, 7); // a Sunday
export const weekIndex = (d) => {
  const local = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((local - EPOCH_SUNDAY) / 604800000);
};

/**
 * The date a series is keyed to.
 *
 * Explicit `anchor` first. Then the reminder's own creation date, so a
 * reminder made today counts today's week as an "on" week, which is what
 * somebody setting one up expects. A reminder with neither is treated as
 * anchored to the date being asked about, which makes it behave exactly
 * like the weekly reminder it was before this existed.
 */
export const anchorOf = (r, fallback) => {
  const a = parseKey(r && r.anchor);
  if (a) return a;
  if (r && r.createdAt) {
    const c = new Date(r.createdAt);
    if (Number.isFinite(c.getTime())) return new Date(c.getFullYear(), c.getMonth(), c.getDate(), 12, 0, 0, 0);
  }
  return fallback || null;
};

const lastDayOfMonth = (year, monthIdx) => new Date(year, monthIdx + 1, 0).getDate();

/**
 * Does this reminder fall on this date, ignoring skips and one-offs?
 *
 * `date` is a Date in the user's own timezone. Only the recurrence is
 * decided here: whether the day was skipped, hidden by a day template, or
 * replaced by a moved copy stays where it already lived, in
 * getRemindersForDay, so this function is about one thing.
 */
export const occursOn = (reminder, date) => {
  if (!reminder || !date) return false;
  const mode = repeatOf(reminder);

  if (mode === 'monthly') {
    // Day of the month, clamped to the last day of a short one: a reminder
    // anchored to the 31st fires on the 30th in April and on the 28th or
    // 29th in February. Never skips a month, never lands in the next one.
    const anchor = anchorOf(reminder, null);
    const wanted = Number(reminder.monthDay) > 0
      ? Math.min(31, Math.round(Number(reminder.monthDay)))
      : (anchor ? anchor.getDate() : null);
    if (!wanted) return false;
    const last = lastDayOfMonth(date.getFullYear(), date.getMonth());
    return date.getDate() === Math.min(wanted, last);
  }

  const days = Array.isArray(reminder.days) ? reminder.days : [0, 1, 2, 3, 4, 5, 6];
  if (!days.includes(date.getDay())) return false;
  if (mode === 'weekly') return true;

  // biweekly: only in weeks an even number of weeks from the anchor's week.
  const anchor = anchorOf(reminder, date);
  if (!anchor) return true;
  return ((weekIndex(date) - weekIndex(anchor)) % 2 + 2) % 2 === 0;
};

/**
 * The next `count` dates this reminder falls on, at or after `from`.
 *
 * The horizon has to clear the longest gap the modes can produce. A
 * monthly reminder anchored to the 31st and asked on the 1st of a long
 * month is over sixty days from its next turn in the worst case, and the
 * old notification scan looked fourteen days ahead, which would simply
 * have found nothing and scheduled nothing.
 */
/**
 * How far to look, for a given number of occurrences.
 *
 * Derived from `count` rather than fixed, because a fixed horizon silently
 * returns fewer than asked. A monthly reminder anchored to the 31st and
 * asked on the 1st of a long month is 62 days from its next turn, so even
 * ONE occurrence needs more than two months of room, and three need more
 * than six. Returning two when three were asked for is the kind of quiet
 * shortfall that turns into "the reminder stopped ringing".
 */
export const horizonFor = (count) => 31 * (Math.max(1, Number(count) || 1) + 1) + 10;
export const DEFAULT_HORIZON_DAYS = horizonFor(1);
export const nextOccurrences = (reminder, from, { count = 1, horizonDays, skip } = {}) => {
  const horizon = Number(horizonDays) > 0 ? Number(horizonDays) : horizonFor(count);
  const out = [];
  if (!reminder || !from) return out;
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12, 0, 0, 0);
  for (let i = 0; i <= horizon && out.length < count; i += 1) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    if (!occursOn(reminder, d)) continue;
    if (typeof skip === 'function' && skip(dateKey(d), d)) continue;
    out.push(d);
  }
  return out;
};

export default { REPEATS, REPEAT_LABEL, REPEAT_SPOKEN, repeatOf, occursOn, nextOccurrences, weekIndex, anchorOf, dateKey, parseKey, horizonFor, DEFAULT_HORIZON_DAYS };
