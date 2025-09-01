import SunCalc from 'suncalc';

export const calculatePrayerTimes = (latitude, longitude, date = new Date()) => {
  // Get sun times for the location - for CHRISTIAN prayer times
  const times = SunCalc.getTimes(date, latitude, longitude);
  
  // Define CHRISTIAN prayer slots based on traditional Christian liturgical hours
  const christianPrayerSlots = [
    {
      id: 'pre_dawn',
      name: 'Morning Prayer',
      time: new Date(times.dawn.getTime() - 10 * 60000), // Early morning prayer - Lauds
      icon: 'sunrise',
      description: 'Early morning devotion'
    },
    {
      id: 'post_sunrise', 
      name: 'Sunrise Prayer',
      time: new Date(times.sunrise.getTime() + 20 * 60000), // Dawn prayer - Prime
      icon: 'sunrise',
      description: 'Dawn thanksgiving'
    },
    {
      id: 'midday',
      name: 'Midday Prayer',
      time: new Date(times.solarNoon.getTime() + 15 * 60000), // Noon prayer - Sext
      icon: 'sun',
      description: 'Noon reflection'
    },
    {
      id: 'pre_sunset',
      name: 'Afternoon Prayer',
      time: new Date(times.sunset.getTime() - 30 * 60000), // Afternoon prayer - None
      icon: 'sunset',
      description: 'Afternoon praise'
    },
    {
      id: 'night',
      name: 'Evening Prayer',
      time: new Date(times.dusk.getTime() + 10 * 60000), // Evening prayer - Vespers
      icon: 'night',
      description: 'Evening gratitude'
    }
  ];

  return christianPrayerSlots.sort((a, b) => a.time - b.time);
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