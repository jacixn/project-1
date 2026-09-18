// Pure helpers for WHEN a to-do happens and WHEN its alert should fire.
// No imports: this file is also run under plain node by scripts/test-todo-time.js.
//
// Why this exists: task notifications used to do `new Date(task.scheduledDate)`.
// A bare 'YYYY-MM-DD' parses as UTC midnight, which in BST is 01:00 local, and the
// hidden 60-minute default lead time then landed every task alert at 00:00 local.
// The exact time the user picked (scheduledTime / scheduledDateTime) was ignored.
// Everything here treats 'YYYY-MM-DD' and 'HH:mm' as LOCAL calendar values.

const pad2 = (n) => String(n).padStart(2, '0');

// 'YYYY-MM-DD' -> { y, m, d } (m is 1-based) or null.
// A full ISO string ('2026-09-18T18:00:00.000Z') is tolerated by taking its
// first 10 chars ONLY as a last resort: callers that have scheduledDateTime
// should parse that with Date.parse instead (todoStartMs does), because the
// calendar date of an ISO instant depends on the zone and the first 10 chars
// are the UTC date, not the local one.
export const parseLocalDate = (str) => {
  if (typeof str !== 'string') return null;
  const s = str.includes('T') ? str.slice(0, 10) : str.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
};

// 'H:mm' / 'HH:mm' -> { hh, mm } or null.
export const parseHm = (str) => {
  if (typeof str !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(str.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh > 23 || mm > 59) return null;
  return { hh, mm };
};

// The instant a to-do starts, in ms, or null when it has no usable schedule.
// Order of preference:
//   1. scheduledDateTime (ISO instant) when Date.parse gives a finite number
//   2. scheduledDate + scheduledTime, both LOCAL
//   3. scheduledDate + defaultHm, LOCAL
// Never `new Date('YYYY-MM-DD')` (that is UTC midnight, not the local day).
export const todoStartMs = (task, { defaultHm = '09:00' } = {}) => {
  if (!task) return null;
  if (task.scheduledDateTime != null && task.scheduledDateTime !== '') {
    const ms = Date.parse(task.scheduledDateTime);
    if (Number.isFinite(ms)) return ms;
  }
  const date = parseLocalDate(task.scheduledDate);
  if (!date) return null;
  const hm = parseHm(task.scheduledTime) || parseHm(defaultHm) || { hh: 9, mm: 0 };
  const ms = new Date(date.y, date.m - 1, date.d, hm.hh, hm.mm, 0, 0).getTime();
  return Number.isFinite(ms) ? ms : null;
};

// Minutes before the start that the alert fires. Only an explicit finite
// non-negative reminderBefore counts (FullCalendarModal sets 60 or 360 and
// tells the user so); anything else means "at the time of the task".
export const reminderOffsetMin = (task) => {
  const n = Number(task?.reminderBefore);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export const dateKeyLocal = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

// { startMs, notifyMs, offsetMin, dateKey } for a task whose alert is still
// ahead of nowMs, else null (falsy task, completed, unschedulable, or past).
export const todoNotifyPlan = (task, { nowMs = Date.now(), defaultHm } = {}) => {
  if (!task || task.completed) return null;
  const startMs = todoStartMs(task, defaultHm ? { defaultHm } : undefined);
  if (startMs == null) return null;
  const offsetMin = reminderOffsetMin(task);
  const notifyMs = startMs - offsetMin * 60000;
  if (!Number.isFinite(notifyMs) || notifyMs <= nowMs) return null;
  return { startMs, notifyMs, offsetMin, dateKey: dateKeyLocal(startMs) };
};

const durationText = (minutes) => {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n <= 0) return '';
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
};

// Notification title/body. Offset 0 says "due now"; whole hours say hours;
// anything else says minutes. A known duration is appended as " About 45 min."
export const todoAlertText = (task, offsetMin, durationMinutes) => {
  const text = String(task?.text ?? '').trim() || 'Task';
  const off = Number(offsetMin);
  const offset = Number.isFinite(off) && off > 0 ? off : 0;
  let body;
  if (offset === 0) {
    body = `"${text}" is due now.`;
  } else if (offset >= 60 && offset % 60 === 0) {
    const hours = offset / 60;
    body = `"${text}" is due in ${hours} hour${hours === 1 ? '' : 's'}.`;
  } else {
    body = `"${text}" is due in ${offset} minutes.`;
  }
  const dur = durationText(durationMinutes);
  if (dur) body += ` About ${dur}.`;
  return { title: 'Task Reminder', body };
};
