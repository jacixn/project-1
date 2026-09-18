// Weather alerts: "tell me at 6 AM if it is going to rain today". No background
// fetch module is installed, so the app cannot wake itself at 6 AM. Instead,
// every app open and foreground re-plans one-shot local notifications for the
// coming days from the freshest Open-Meteo forecast (same approach as the
// daily streak reminder). Kept to at most 7 pending alerts because iOS caps
// the pending queue at 64 across all types.
//
// notificationService requires this module lazily (inside the function that
// needs it) because this file imports notificationService at the top.
import notificationService from './notificationService';
import { getWeek, getPlace } from './weather';
import { getStoredData } from '../utils/localStorage';
import { normalizePrefs, planWeatherAlerts, hitsForDay, composeAlert, dateKeyOf } from '../utils/weatherAlerts';

export const WEATHER_ALERT_TYPE = 'weather_alert';

// Cancel and re-arm every weather alert from the current settings + forecast.
const rebuildImpl = async () => {
  const settings = (await getStoredData('notificationSettings')) || {};
  const prefs = normalizePrefs(settings);
  await notificationService.cancelNotificationsByType(WEATHER_ALERT_TYPE);
  if (!prefs.enabled || settings.pushNotifications === false) return { scheduled: 0, reason: 'off' };
  const week = await getWeek();
  if (!week || !week.place) return { scheduled: 0, reason: 'no_place' };
  const plan = planWeatherAlerts({ byDay: week.byDay, prefs, now: Date.now(), placeName: week.place.name });
  for (const p of plan) {
    await notificationService.scheduleNotif({
      content: {
        title: p.title,
        body: p.body,
        sound: true,
        data: { type: WEATHER_ALERT_TYPE, dateKey: p.dateKey },
      },
      trigger: { type: 'date', date: new Date(p.fireAt) },
    });
  }
  console.log('[Weather] alerts scheduled:', plan.length);
  return { scheduled: plan.length, reason: 'ok', plan };
};

// Serialised and coalesced: rebuildImpl is cancel-then-schedule with awaits in
// between (getWeek can be a network fetch), so two overlapping calls would
// both cancel an empty queue and then both schedule, leaving duplicate
// one-shots. One rebuild runs at a time, at most one more is queued behind it,
// and later callers (chip taps, stepper presses, time-picker ticks, cold start
// plus a foreground refresh) join that queued run. Never rejects: callers
// treat weather as informational.
let chain = Promise.resolve();
let queued = false;
export const rebuildWeatherAlerts = () => {
  if (queued) return chain;
  queued = true;
  chain = chain
    .then(() => {
      queued = false;
      return rebuildImpl();
    })
    .catch((e) => {
      console.warn('[Weather] rebuild failed:', e?.message);
      return { scheduled: 0, reason: 'error' };
    });
  return chain;
};

// What today's alert would say with the current picks, for the settings
// preview. Composes even when nothing matches so the user sees the calm-day
// wording too. null when no city is set or there is no forecast for today.
export const previewTodayAlert = async () => {
  const place = await getPlace();
  if (!place) return null;
  const settings = (await getStoredData('notificationSettings')) || {};
  const prefs = normalizePrefs(settings);
  const week = await getWeek();
  if (!week || !week.place) return null;
  const dateKey = dateKeyOf(new Date());
  const day = week.byDay && week.byDay[dateKey];
  if (!day) return null;
  const hits = hitsForDay(day, prefs);
  return composeAlert({ dateKey, day, hits, prefs, placeName: week.place.name, isToday: true });
};
