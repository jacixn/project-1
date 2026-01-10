import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  Modal,
  Alert,
  PanResponder,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { hapticFeedback } from '../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import verseByReferenceService from '../services/verseByReferenceService';

const { width, height } = Dimensions.get('window');
const DAY_SIZE = (width - 64) / 7;

const JournalCalendar = ({ 
  journalNotes, 
  journalVerseTexts, 
  onDeleteNote,
  onAddEntry,
  theme,
  isDark,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDayDetail, setShowDayDetail] = useState(false);
  
  // Animations
  const monthFadeAnim = useRef(new Animated.Value(1)).current;
  const dayDetailSlide = useRef(new Animated.Value(height)).current;

  // Pan responder for swipe to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          dayDetailSlide.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          closeDayDetail();
        } else {
          Animated.spring(dayDetailSlide, {
            toValue: 0,
            tension: 65,
            friction: 11,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Group notes by date
  const notesByDate = useMemo(() => {
    const grouped = {};
    journalNotes.forEach(note => {
      const date = new Date(note.createdAt);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(note);
    });
    return grouped;
  }, [journalNotes]);

  // Get calendar data for current month
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const days = [];
    
    // Add empty slots for days before the 1st
    for (let i = 0; i < startingDay; i++) {
      days.push({ day: null, date: null });
    }
    
    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        date,
        dateKey,
        notes: notesByDate[dateKey] || [],
        noteCount: (notesByDate[dateKey] || []).length,
      });
    }
    
    return days;
  };

  // Navigate months
  const goToPreviousMonth = () => {
    hapticFeedback.light();
    Animated.sequence([
      Animated.timing(monthFadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(monthFadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    hapticFeedback.light();
    Animated.sequence([
      Animated.timing(monthFadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(monthFadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    hapticFeedback.medium();
    setCurrentMonth(new Date());
  };

  // Open day detail
  const openDayDetail = (dayData) => {
    if (!dayData.day) return;
    hapticFeedback.medium();
    setSelectedDate(dayData);
    setShowDayDetail(true);
    
    dayDetailSlide.setValue(height);
    
    Animated.spring(dayDetailSlide, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const closeDayDetail = () => {
    hapticFeedback.light();
    Animated.timing(dayDetailSlide, {
      toValue: height,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowDayDetail(false);
      setSelectedDate(null);
    });
  };

  // Stats calculations
  const stats = useMemo(() => {
    const total = journalNotes.length;
    const thisMonth = journalNotes.filter(note => {
      const noteDate = new Date(note.createdAt);
      return noteDate.getMonth() === currentMonth.getMonth() && 
             noteDate.getFullYear() === currentMonth.getFullYear();
    }).length;
    
    // Calculate streak
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      
      if (notesByDate[dateKey] && notesByDate[dateKey].length > 0) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    
    return { total, thisMonth, streak };
  }, [journalNotes, currentMonth, notesByDate]);

  const calendarDays = getCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  // Check if a day is today
  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Get intensity color based on note count
  const getIntensityColor = (count) => {
    if (count === 0) return 'transparent';
    if (count === 1) return `${theme.primary}40`;
    if (count === 2) return `${theme.primary}70`;
    if (count >= 3) return `${theme.primary}`;
    return `${theme.primary}40`;
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Stats Banner */}
      <View style={{ 
        flexDirection: 'row', 
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 12,
      }}>
        {[
          { label: 'Total', value: stats.total, icon: 'auto-stories', color: theme.primary },
          { label: 'This Month', value: stats.thisMonth, icon: 'calendar-today', color: theme.info || '#3B82F6' },
          { label: 'Day Streak', value: stats.streak, icon: 'local-fire-department', color: '#F97316' },
        ].map((stat, index) => (
          <View 
            key={stat.label}
            style={{
              flex: 1,
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
            }}
          >
            <View style={{ 
              width: 32, 
              height: 32, 
              borderRadius: 10, 
              backgroundColor: `${stat.color}20`,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 8,
            }}>
              <MaterialIcons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={{ 
              fontSize: 24, 
              fontWeight: '800', 
              color: theme.text,
              letterSpacing: -0.5,
            }}>
              {stat.value}
            </Text>
            <Text style={{ 
              fontSize: 11, 
              color: theme.textSecondary,
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginTop: 2,
            }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Calendar Container */}
      <View style={{
        marginHorizontal: 20,
        backgroundColor: isDark ? 'rgba(30,30,35,0.8)' : 'rgba(255,255,255,0.9)',
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 10,
      }}>
        {/* Month Header */}
        <LinearGradient
          colors={isDark ? [theme.primary, `${theme.primary}CC`] : [theme.primary, `${theme.primary}DD`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingVertical: 18,
            paddingHorizontal: 20,
          }}
        >
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            justifyContent: 'space-between',
          }}>
            <TouchableOpacity 
              onPress={goToPreviousMonth}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="chevron-left" size={28} color="#fff" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={goToToday} activeOpacity={0.8}>
              <Animated.View style={{ opacity: monthFadeAnim, alignItems: 'center' }}>
                <Text style={{ 
                  fontSize: 22, 
                  fontWeight: '800', 
                  color: '#fff',
                  letterSpacing: -0.3,
                }}>
                  {monthNames[currentMonth.getMonth()]}
                </Text>
                <Text style={{ 
                  fontSize: 14, 
                  color: 'rgba(255,255,255,0.8)',
                  fontWeight: '600',
                  marginTop: 2,
                }}>
                  {currentMonth.getFullYear()}
                </Text>
              </Animated.View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={goToNextMonth}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="chevron-right" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Week Day Headers */}
        <View style={{ 
          flexDirection: 'row', 
          paddingVertical: 12,
          paddingHorizontal: 12,
          borderBottomWidth: 1,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
        }}>
          {weekDays.map((day) => (
            <View key={day} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ 
                fontSize: 12, 
                fontWeight: '700',
                color: theme.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <Animated.View style={{ 
          opacity: monthFadeAnim,
          padding: 12,
          paddingBottom: 16,
        }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {calendarDays.map((dayData, index) => {
              const hasNotes = dayData.noteCount > 0;
              const today = isToday(dayData.date);
              
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => openDayDetail(dayData)}
                  disabled={!dayData.day}
                  activeOpacity={0.7}
                  style={{
                    width: DAY_SIZE,
                    height: DAY_SIZE,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 2,
                  }}
                >
                  {dayData.day && (
                    <View style={{
                      width: DAY_SIZE - 8,
                      height: DAY_SIZE - 8,
                      borderRadius: (DAY_SIZE - 8) / 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: today 
                        ? theme.primary 
                        : hasNotes 
                          ? getIntensityColor(dayData.noteCount)
                          : 'transparent',
                      borderWidth: today ? 0 : hasNotes ? 0 : 0,
                      borderColor: theme.primary,
                    }}>
                      <Text style={{
                        fontSize: 15,
                        fontWeight: today || hasNotes ? '700' : '500',
                        color: today 
                          ? '#fff' 
                          : hasNotes && dayData.noteCount >= 2
                            ? '#fff'
                            : theme.text,
                      }}>
                        {dayData.day}
                      </Text>
                      {hasNotes && !today && (
                        <View style={{
                          position: 'absolute',
                          bottom: 4,
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: dayData.noteCount >= 2 ? '#fff' : theme.primary,
                        }} />
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>

      {/* Legend */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center',
        marginTop: 16,
        gap: 20,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ 
            width: 12, 
            height: 12, 
            borderRadius: 6, 
            backgroundColor: theme.primary 
          }} />
          <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: '500' }}>Today</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ 
            width: 12, 
            height: 12, 
            borderRadius: 6, 
            backgroundColor: `${theme.primary}50` 
          }} />
          <Text style={{ fontSize: 12, color: theme.textSecondary, fontWeight: '500' }}>Has Notes</Text>
        </View>
      </View>

      {/* Day Detail Modal - Full Screen */}
      <Modal
        visible={showDayDetail}
        transparent={false}
        animationType="none"
        onRequestClose={closeDayDetail}
        presentationStyle="fullScreen"
      >
        <Animated.View style={{
          flex: 1,
          backgroundColor: theme.background,
          transform: [{ translateY: dayDetailSlide }],
        }}>
          <LinearGradient
            colors={isDark ? ['#1a1a1a', '#000000'] : ['#fdfbfb', '#ebedee']}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          
          {/* Header with drag handle */}
          <SafeAreaView edges={['top']}>
            <View 
              {...panResponder.panHandlers}
              style={{ paddingTop: 8, paddingBottom: 16 }}
            >
              {/* Drag Handle */}
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <View style={{ 
                  width: 40, 
                  height: 5, 
                  borderRadius: 3, 
                  backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)' 
                }} />
              </View>

              {/* Close Button and Title */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                paddingHorizontal: 20,
                paddingTop: 8,
              }}>
                <TouchableOpacity
                  onPress={closeDayDetail}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="close" size={22} color={theme.text} />
                </TouchableOpacity>
                <Text style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  fontSize: 17, 
                  fontWeight: '600', 
                  color: theme.text,
                  marginRight: 36,
                }}>
                  Journal Entry
                </Text>
              </View>
            </View>
          </SafeAreaView>

          {/* Day Header */}
          {selectedDate && (
            <View style={{ 
              paddingHorizontal: 24, 
              paddingTop: 8,
              paddingBottom: 20, 
              borderBottomWidth: 1, 
              borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' 
            }}>
              <Text style={{ 
                fontSize: 32, 
                fontWeight: '900', 
                color: theme.text,
                letterSpacing: -0.5,
              }}>
                {selectedDate.date?.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              <Text style={{ 
                fontSize: 15, 
                color: theme.textSecondary,
                marginTop: 8,
                fontWeight: '500',
              }}>
                {selectedDate.noteCount} {selectedDate.noteCount === 1 ? 'entry' : 'entries'}
              </Text>
            </View>
          )}

          {/* Notes List */}
          <ScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={{ 
              paddingHorizontal: 20, 
              paddingTop: 20,
              paddingBottom: Platform.OS === 'ios' ? 40 : 24 
            }}
              showsVerticalScrollIndicator={false}
            >
              {selectedDate?.notes?.length === 0 ? (
                <View style={{ 
                  alignItems: 'center', 
                  paddingVertical: 60,
                }}>
                  <View style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: `${theme.primary}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}>
                    <MaterialIcons name="edit-note" size={40} color={theme.primary} />
                  </View>
                  <Text style={{ 
                    fontSize: 18, 
                    fontWeight: '700', 
                    color: theme.text,
                    marginBottom: 8,
                  }}>
                    No entries yet
                  </Text>
                  <Text style={{ 
                    fontSize: 14, 
                    color: theme.textSecondary,
                    textAlign: 'center',
                    lineHeight: 20,
                  }}>
                    Long-press any verse in the Bible{'\n'}to add a reflection for this day
                  </Text>
                </View>
              ) : (
                selectedDate?.notes?.map((note, index) => (
                  <View
                    key={note.id || index}
                    style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                      borderRadius: 20,
                      marginBottom: 12,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    }}
                  >
                    {/* Note Header */}
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          backgroundColor: `${theme.primary}20`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 10,
                        }}>
                          <MaterialIcons name="auto-stories" size={16} color={theme.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: theme.text,
                          }} numberOfLines={1}>
                            {note.verseReference || 'Personal Reflection'}
                          </Text>
                          <Text style={{
                            fontSize: 12,
                            color: theme.textSecondary,
                            marginTop: 2,
                          }}>
                            {new Date(note.createdAt).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            'Delete Entry',
                            'Are you sure you want to delete this note?',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Delete',
                                style: 'destructive',
                                onPress: () => {
                                  onDeleteNote(note.id);
                                  // Update selected date notes
                                  setSelectedDate(prev => ({
                                    ...prev,
                                    notes: prev.notes.filter(n => n.id !== note.id),
                                    noteCount: prev.noteCount - 1,
                                  }));
                                },
                              },
                            ]
                          );
                        }}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          backgroundColor: `${theme.error || '#EF4444'}15`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MaterialIcons name="delete-outline" size={18} color={theme.error || '#EF4444'} />
                      </TouchableOpacity>
                    </View>

                    {/* Verse Text */}
                    {journalVerseTexts[note.id] && (
                      <View style={{
                        paddingHorizontal: 16,
                        paddingTop: 12,
                      }}>
                        <Text style={{
                          fontSize: 14,
                          lineHeight: 22,
                          color: theme.textSecondary,
                          fontStyle: 'italic',
                          fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
                        }}>
                          "{journalVerseTexts[note.id]}"
                        </Text>
                      </View>
                    )}

                    {/* Note Text */}
                    <View style={{ padding: 16 }}>
                      <Text style={{
                        fontSize: 15,
                        lineHeight: 24,
                        color: theme.text,
                        fontWeight: '500',
                      }}>
                        {note.text}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
        </Animated.View>
      </Modal>
    </View>
  );
};

export default JournalCalendar;

