// Cross-app shift bridge (inbound): a sibling app (EyeCandy) can ask Biblely
// to move one of Biblely's own items — a prayer or a reminder that EyeCandy
// saw in the "Biblely" iOS calendar. Biblely stays the owner: the user
// confirms here, the change goes through the normal service write paths
// (which re-run notifications, calendar sync and cloud push), and the result
// is reported back via the requester's return deep link.
//
// Request URL: biblely://shift?req=<encodeURIComponent(JSON)>
//   { v: 1, source, title, date: 'YYYY-MM-DD', from: 'HH:mm', to: 'HH:mm',
//     ret: 'eyecandy://biblely-shift-result' }
import { Alert, Linking } from 'react-native';
import { getPrayers, updatePrayer } from './simplePrayersService';
import { loadReminders, updateReminder } from './reminderService';

const to12 = (hm) => {
  const [h, m] = hm.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
};

// Times can drift a little between the calendar mirror and the stored item
// (rounding, lead times) — match within 10 minutes.
const nearHM = (a, b) => {
  if (!a || !b) return false;
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return Math.abs(ah * 60 + am - (bh * 60 + bm)) <= 10;
};

const reply = (ret, params) => {
  if (!ret || !/^[a-z0-9.+-]+:\/\//i.test(ret)) return;
  const q = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  Linking.openURL(`${ret}${ret.includes('?') ? '&' : '?'}${q}`).catch(() => {});
};

// Entry point, called from App.js for biblely://shift URLs.
export const handleShiftRequest = async (url) => {
  let req = null;
  try {
    const raw = new URL(url).searchParams.get('req');
    req = JSON.parse(decodeURIComponent(raw));
  } catch {}
  if (!req || req.v !== 1 || !req.title || !req.to) return;
  const ret = typeof req.ret === 'string' ? req.ret : null;
  const title = String(req.title);

  // Resolve the item: prayer by name (+ time when it helps), else reminder.
  const prayers = await getPrayers();
  const prayer =
    prayers.find((p) => p.name === title && nearHM(p.time, req.from)) ||
    prayers.find((p) => p.name === title);
  let reminder = null;
  if (!prayer) {
    const reminders = await loadReminders();
    reminder =
      reminders.find((r) => r.title === title && nearHM(r.time, req.from)) ||
      reminders.find((r) => r.title === title);
  }

  if (!prayer && !reminder) {
    Alert.alert('Nothing to move', `EyeCandy asked to move "${title}", but no matching prayer or reminder was found.`);
    reply(ret, { ok: 0, title, reason: 'not_found' });
    return;
  }

  const kind = prayer ? 'prayer' : 'reminder';
  const scopeNote = prayer
    ? (prayer.type === 'one-time' ? '' : ' This changes its time every day it repeats.')
    : (reminder.type === 'one-time' ? '' : ' This changes its time every day it repeats.');

  Alert.alert(
    'EyeCandy asks',
    `Move the ${kind} "${title}" to ${to12(req.to)}?${scopeNote}`,
    [
      {
        text: 'Leave it',
        style: 'cancel',
        onPress: () => reply(ret, { ok: 0, title }),
      },
      {
        text: 'Move it',
        onPress: async () => {
          try {
            if (prayer) {
              // updatePrayer maps EVERY field from the payload — send the
              // full prayer, not a partial, or name/days/type get clobbered.
              await updatePrayer(prayer.id, {
                name: prayer.name,
                time: req.to,
                type: prayer.type,
                duration: prayer.duration,
                notifyBefore: prayer.notifyBefore,
                date: prayer.date,
                days: prayer.days,
              });
            } else {
              // updateReminder is a safe partial merge and re-runs
              // notifications + calendar sync itself.
              await updateReminder(reminder.id, { time: req.to });
            }
            reply(ret, { ok: 1, title, to: to12(req.to) });
          } catch {
            reply(ret, { ok: 0, title, reason: 'error' });
          }
        },
      },
    ],
  );
};
