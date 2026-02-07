/**
 * Schedule Task Screen
 * 
 * Wrapper screen for FullCalendarModal to enable stack navigation with swipe-back.
 */

import React from 'react';
import { DeviceEventEmitter } from 'react-native';
import FullCalendarModal from '../components/FullCalendarModal';

const ScheduleTaskScreen = ({ navigation }) => {
  return (
    <FullCalendarModal
      visible={true}
      onClose={() => navigation.goBack()}
      onTaskAdd={(task) => {
        // Emit event so TodosTab can pick it up and add the task
        DeviceEventEmitter.emit('scheduleTaskFromScreen', task);
      }}
      asScreen={true}
    />
  );
};

export default ScheduleTaskScreen;
