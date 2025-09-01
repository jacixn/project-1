import * as Location from 'expo-location';

export const requestLocationPermission = async () => {
  const defaultLocation = {
    latitude: 40.7128,
    longitude: -74.0060,
    city: 'New York',
    country: 'United States'
  };

  try {
    // Check if location services are available
    const isAvailable = await Location.hasServicesEnabledAsync();
    if (!isAvailable) {
      console.log('Location services are disabled');
      return defaultLocation;
    }

    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.log('Location permission denied');
      return defaultLocation;
    }

    try {
      // Get current location with timeout and lower accuracy for better reliability
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
        timeout: 10000, // 10 second timeout
        maximumAge: 60000, // Accept cached location up to 1 minute old
      });

      if (!location || !location.coords) {
        console.log('No location data received');
        return defaultLocation;
      }

      try {
        // Get address information
        const address = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        const userLocation = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          city: address[0]?.city || 'Unknown',
          country: address[0]?.country || 'Unknown',
        };

        console.log('📍 Location detected:', userLocation.city, userLocation.country);
        return userLocation;

      } catch (geocodeError) {
        console.log('Geocoding failed, using coordinates only:', geocodeError.message);
        // Return location with coordinates but without city/country info
        return {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          city: 'Unknown',
          country: 'Unknown'
        };
      }

    } catch (locationError) {
      console.log('Failed to get current position:', locationError.message);
      return defaultLocation;
    }

  } catch (error) {
    console.log('Location permission request failed:', error.message);
    return defaultLocation;
  }
};
