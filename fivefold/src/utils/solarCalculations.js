import SunCalc from 'suncalc';

export const calculatePrayerTimes = (latitude, longitude, date = new Date()) => {
  // Get sun times for the location
  const times = SunCalc.getTimes(date, latitude, longitude);
  
  // Define prayer slots based on solar positions
  const prayerSlots = [
    {
      id: 'pre_dawn',
      name: 'Before Sunrise',
      time: new Date(times.dawn.getTime() - 10 * 60000), // 10 minutes before civil dawn
      icon: 'moon'
    },
    {
      id: 'post_sunrise', 
      name: 'After Sunrise',
      time: new Date(times.sunrise.getTime() + 20 * 60000), // 20 minutes after sunrise
      icon: 'sunrise'
    },
    {
      id: 'midday',
      name: 'Midday',
      time: new Date(times.solarNoon.getTime() + 15 * 60000), // 15 minutes after solar noon
      icon: 'sun'
    },
    {
      id: 'pre_sunset',
      name: 'Before Sunset',
      time: new Date(times.sunset.getTime() - 30 * 60000), // 30 minutes before sunset
      icon: 'sunset'
    },
    {
      id: 'night',
      name: 'After Sunset',
      time: new Date(times.dusk.getTime() + 10 * 60000), // 10 minutes after civil dusk
      icon: 'night'
    }
  ];

  return prayerSlots.sort((a, b) => a.time - b.time);
};

export const getNextPrayerTime = (prayerTimes) => {
  const now = new Date();
  for (const prayer of prayerTimes) {
    if (prayer.time > now) {
      return prayer;
    }
  }
  // If all prayers have passed, return tomorrow's first prayer
  return prayerTimes[0];
};

export const formatTimeUntil = (targetTime) => {
  const now = new Date();
  const diff = targetTime - now;
  
  if (diff < 0) return 'Passed';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};
