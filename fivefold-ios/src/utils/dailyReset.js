import { getStoredData, saveData } from './localStorage';

// Check if a new day has started and reset prayer completions
export const checkAndResetDaily = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastResetDate = await getStoredData('lastResetDate');
    
    if (lastResetDate !== today) {
      console.log('🌅 New day detected! Resetting prayer completions...');
      
      // Get current prayer history
      const currentHistory = await getStoredData('prayerHistory') || [];
      
      // Filter out today's entries (if any exist from previous runs)
      const filteredHistory = currentHistory.filter(entry => entry.date !== today);
      
      // Save filtered history
      await saveData('prayerHistory', filteredHistory);
      
      // Update last reset date
      await saveData('lastResetDate', today);
      
      console.log('✅ Daily reset completed!');
      return true; // Reset occurred
    }
    
    return false; // No reset needed
  } catch (error) {
    console.error('Failed to perform daily reset:', error);
    return false;
  }
};

// Get prayer completion stats for today
export const getTodayPrayerStats = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const prayerHistory = await getStoredData('prayerHistory') || [];
    
    const todayCompletions = prayerHistory.filter(entry => entry.date === today);
    
    return {
      completed: todayCompletions.length,
      total: 5, // Total prayers per day
      completions: todayCompletions,
    };
  } catch (error) {
    console.error('Failed to get today prayer stats:', error);
    return { completed: 0, total: 5, completions: [] };
  }
};

// Initialize daily reset system (call this on app start)
export const initializeDailyReset = async () => {
  try {
    const resetOccurred = await checkAndResetDaily();
    
    if (resetOccurred) {
      // Optional: Show notification or update UI that new day started
      console.log('🎉 Welcome to a new day of prayer!');
    }
    
    return resetOccurred;
  } catch (error) {
    console.error('Failed to initialize daily reset:', error);
    return false;
  }
};

// Check if it's after midnight and trigger reset
export const scheduleNextDayReset = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0); // Set to midnight

  const msUntilMidnight = tomorrow.getTime() - now.getTime();

  console.log(`⏰ Next reset scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);

  return setTimeout(() => {
    checkAndResetDaily();
    // Schedule next reset for the following day
    scheduleNextDayReset();
  }, msUntilMidnight);
};
