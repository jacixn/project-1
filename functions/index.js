const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const getUtcTodayString = () => new Date().toISOString().split('T')[0];

const getUtcMinutes = () => {
  const now = new Date();
  return now.getUTCHours() * 60 + now.getUTCMinutes();
};

const getLocalMinutesFromUtc = (utcMinutes, timezoneOffsetMinutes) => {
  const offset = Number.isFinite(timezoneOffsetMinutes) ? timezoneOffsetMinutes : 0;
  return (utcMinutes - offset + 1440) % 1440;
};

const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

const sendExpoNotifications = async (messages) => {
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  const result = await response.json();
  return result.data || [];
};

exports.sendTokenNotifications = onSchedule('every 5 minutes', async () => {
  const today = getUtcTodayString();
  const utcMinutes = getUtcMinutes();

  const snapshot = await db
    .collection('users')
    .where('tokenSchedule.date', '==', today)
    .where('tokenSchedule.tokenDelivered', '==', false)
    .get();

  if (snapshot.empty) {
    return;
  }

  const candidates = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    const schedule = data.tokenSchedule || {};
    const pushToken = data.pushToken;

    if (!pushToken || typeof schedule.arrivalMinutes !== 'number') {
      return;
    }

    const localMinutes = getLocalMinutesFromUtc(
      utcMinutes,
      schedule.timezoneOffsetMinutes
    );

    if (localMinutes >= schedule.arrivalMinutes) {
      candidates.push({
        userId: doc.id,
        pushToken,
      });
    }
  });

  if (candidates.length === 0) {
    return;
  }

  const messages = candidates.map((c) => ({
    to: c.pushToken,
    sound: 'default',
    title: 'Your Token Has Arrived',
    body: 'Time to share something with the world! Head to the Hub and post something meaningful.',
    data: { type: 'token_arrived' },
    _userId: c.userId,
  }));

  const batches = chunkArray(messages, 100);
  const updates = [];

  for (const batch of batches) {
    const result = await sendExpoNotifications(batch);

    result.forEach((res, index) => {
      const message = batch[index];
      if (!message) return;

      if (res.status === 'ok') {
        const userRef = db.collection('users').doc(message._userId);
        updates.push({
          ref: userRef,
          data: {
            tokenSchedule: {
              tokenDelivered: true,
              notificationSentAt: admin.firestore.FieldValue.serverTimestamp(),
              notificationSentBy: 'server',
            },
          },
        });
      }
    });
  }

  if (updates.length > 0) {
    const batch = db.batch();
    updates.forEach((u) => {
      batch.set(u.ref, u.data, { merge: true });
    });
    await batch.commit();
  }
});
