// Prayer timing utility for managing prayer windows and status

// Convert time string (HH:MM) to today's Date object
const timeStringToDate = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return null;
  
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
};

// Get prayer status based on current time and prayer completion
export const getPrayerStatus = (prayerTime, isCompleted, prayerHistory, prayerSlot) => {
  if (!prayerTime) return { status: 'unavailable', canComplete: false };
  
  const now = new Date();
  const prayerDate = timeStringToDate(prayerTime);
  
  if (!prayerDate) return { status: 'unavailable', canComplete: false };
  
  // Check if this specific prayer was completed today
  const today = new Date().toISOString().split('T')[0];
  const completedToday = prayerHistory?.some(entry => 
    entry.date === today && entry.prayer === prayerSlot
  );
  
  if (completedToday || isCompleted) {
    return { status: 'completed', canComplete: false };
  }
  
  // Calculate time differences in minutes
  const timeDiffMs = now.getTime() - prayerDate.getTime();
  const timeDiffMinutes = Math.floor(timeDiffMs / (1000 * 60));
  
  // Prayer completion window: 30 minutes before to 30 minutes after
  const windowStart = -30; // 30 minutes before prayer time
  const windowEnd = 30;    // 30 minutes after prayer time
  
  if (timeDiffMinutes >= windowStart && timeDiffMinutes <= windowEnd) {
    // Within 30-minute completion window (can complete)
    return { 
      status: 'available', 
      canComplete: true,
      timeRemaining: windowEnd - timeDiffMinutes,
      minutesToPrayer: timeDiffMinutes <= 0 ? Math.abs(timeDiffMinutes) : 0,
      minutesAfterPrayer: timeDiffMinutes > 0 ? timeDiffMinutes : 0
    };
  } else if (timeDiffMinutes > windowEnd) {
    // More than 30 minutes late = MISSED (RED, no points allowed)
    return { 
      status: 'missed', 
      canComplete: false,
      minutesLate: timeDiffMinutes
    };
  } else {
    // More than 30 minutes before = too early
    return { 
      status: 'upcoming', 
      canComplete: false,
      minutesUntilAvailable: Math.abs(timeDiffMinutes + windowStart)
    };
  }
};

// Get status color for prayer based on its current state
export const getPrayerStatusColor = (status, theme) => {
  const colors = {
    completed: theme.success || '#22C55E',    // Green
    available: theme.primary || '#3B82F6',    // Blue
    missed: theme.error || '#EF4444',         // Red
    upcoming: theme.textSecondary || '#6B7280', // Gray
    unavailable: theme.textSecondary || '#6B7280' // Gray
  };
  
  return colors[status] || colors.unavailable;
};

// Get status text for prayer
export const getPrayerStatusText = (prayerStatus) => {
  switch (prayerStatus.status) {
    case 'completed':
      return '✅ Completed (+1000pts)';
    case 'available':
      if (prayerStatus.timeRemaining <= 5) {
        return `⏰ ${prayerStatus.timeRemaining}min left`;
      } else if (prayerStatus.minutesToPrayer > 0) {
        return `🟢 ${prayerStatus.minutesToPrayer}min early`;
      } else if (prayerStatus.minutesAfterPrayer > 0) {
        return `🟢 ${prayerStatus.minutesAfterPrayer}min after`;
      }
      return '🟢 Available Now';
    case 'missed':
      return `🔴 MISSED`;
    case 'upcoming':
      if (prayerStatus.minutesUntilAvailable <= 15) {
        return `⏳ ${prayerStatus.minutesUntilAvailable}min too early`;
      }
      return '⏳ Too Early';
    case 'unavailable':
    default:
      return '⏸️ Unavailable';
  }
};

// Get background color with opacity for prayer cards
export const getPrayerCardBackground = (status, theme) => {
  const baseColor = getPrayerStatusColor(status, theme);
  
  switch (status) {
    case 'completed':
      return `${baseColor}20`; // 20% opacity green
    case 'available':
      return `${baseColor}15`; // 15% opacity blue
    case 'missed':
      return `${baseColor}15`; // 15% opacity red
    case 'upcoming':
    case 'unavailable':
    default:
      return 'transparent';
  }
};

// Check if prayer can be completed (within 30min window)
export const canCompletePrayer = (prayerTime, isCompleted, prayerHistory, prayerSlot) => {
  const status = getPrayerStatus(prayerTime, isCompleted, prayerHistory, prayerSlot);
  return status.canComplete;
};

// Get next available prayer
export const getNextAvailablePrayer = (prayerTimes, prayerHistory) => {
  if (!prayerTimes) return null;
  
  const prayers = [
    { name: 'Before Sunrise', time: prayerTimes.beforeSunrise, slot: 'pre_dawn' },
    { name: 'After Sunrise', time: prayerTimes.afterSunrise, slot: 'post_sunrise' },
    { name: 'Midday', time: prayerTimes.midday, slot: 'midday' },
    { name: 'Before Sunset', time: prayerTimes.beforeSunset, slot: 'pre_sunset' },
    { name: 'After Sunset', time: prayerTimes.afterSunset, slot: 'night' }
  ];
  
  for (const prayer of prayers) {
    const status = getPrayerStatus(prayer.time, false, prayerHistory, prayer.slot);
    if (status.status === 'available' || status.status === 'upcoming') {
      return { ...prayer, status };
    }
  }
  
  return null;
};

// Format time remaining or late in human readable format
export const formatTimeStatus = (minutes) => {
  if (minutes < 60) {
    return `${minutes}min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
};
