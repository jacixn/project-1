import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import NotificationSettings from '../components/NotificationSettings';

const NotificationsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <NotificationSettings asScreen visible onClose={() => navigation.goBack()} />
    </View>
  );
};

export default NotificationsScreen;
