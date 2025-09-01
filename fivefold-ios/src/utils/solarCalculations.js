// Calculate Christian prayer times based on solar positions
export const calculatePrayerTimes = (latitude, longitude, date = new Date()) => {
  // Using solar calculations for meaningful Christian prayer times
  const times = {};
  
  // Use more accurate solar calculations
  const rad = Math.PI / 180;
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  
  // Solar declination angle
  const declination = 23.45 * Math.sin(rad * (360 * (284 + dayOfYear) / 365));
  
  // Equation of time (sun's apparent motion)
  const b = 360 * (dayOfYear - 1) / 365;
  const equationOfTime = 4 * (0.000075 + 0.001868 * Math.cos(rad * b) - 0.032077 * Math.sin(rad * b));
  
  // Solar hour angle for sunrise/sunset
  const hourAngle = Math.acos(-Math.tan(rad * latitude) * Math.tan(rad * declination)) / rad;
  
  // Calculate actual sunrise and sunset
  const solarNoon = 12 - (longitude / 15) - (equationOfTime / 60);
  const sunrise = solarNoon - (hourAngle / 15);
  const sunset = solarNoon + (hourAngle / 15);
  
  // Christian prayer times
  times.beforeSunrise = new Date(date);
  times.beforeSunrise.setHours(Math.floor(sunrise - 0.5), Math.floor((sunrise - 0.5) % 1 * 60), 0, 0);
  
  times.afterSunrise = new Date(date);
  times.afterSunrise.setHours(Math.floor(sunrise + 0.5), Math.floor((sunrise + 0.5) % 1 * 60), 0, 0);
  
  times.midday = new Date(date);
  times.midday.setHours(Math.floor(solarNoon), Math.floor(solarNoon % 1 * 60), 0, 0);
  
  times.beforeSunset = new Date(date);
  times.beforeSunset.setHours(Math.floor(sunset - 0.5), Math.floor((sunset - 0.5) % 1 * 60), 0, 0);
  
  times.afterSunset = new Date(date);
  times.afterSunset.setHours(Math.floor(sunset + 0.5), Math.floor((sunset + 0.5) % 1 * 60), 0, 0);

  return times;
};

export const getNextPrayerTime = (prayerTimes) => {
  const now = new Date();
  const today = now.toDateString();
  
  const prayers = [
    { name: 'Before Sunrise', time: prayerTimes?.beforeSunrise },
    { name: 'After Sunrise', time: prayerTimes?.afterSunrise },
    { name: 'Midday', time: prayerTimes?.midday },
    { name: 'Before Sunset', time: prayerTimes?.beforeSunset },
    { name: 'After Sunset', time: prayerTimes?.afterSunset }
  ];
  
  // Find next prayer
  for (const prayer of prayers) {
    if (prayer.time && prayer.time > now && prayer.time.toDateString() === today) {
      return prayer;
    }
  }
  
  // If no prayer today, return first prayer of next day
  return { name: 'Before Sunrise', time: prayerTimes?.beforeSunrise };
};