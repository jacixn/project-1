import * as FileSystem from 'expo-file-system/legacy';

/**
 * Copy a temporary image URI into app document storage
 * so the profile photo persists across app restarts.
 */
export const persistProfileImage = async (tempUri) => {
  if (!tempUri) return null;
  
  console.log('[ProfilePhoto] Starting to persist image from:', tempUri);
  
  try {
    const filename = `profile_${Date.now()}.jpg`;
    const permanentPath = `${FileSystem.documentDirectory}${filename}`;

    // Copy file FIRST before cleanup to avoid any race conditions
    console.log('[ProfilePhoto] Copying to permanent path:', permanentPath);
    
    await FileSystem.copyAsync({
      from: tempUri,
      to: permanentPath,
    });
    
    // Verify the copy was successful
    const fileInfo = await FileSystem.getInfoAsync(permanentPath);
    if (!fileInfo.exists) {
      console.error('[ProfilePhoto] Copy failed - file does not exist at destination');
      return tempUri; // Fallback to temp URI
    }
    
    console.log('[ProfilePhoto] File copied successfully, size:', fileInfo.size);

    // Clean up old profile images AFTER successful copy (non-blocking)
    setTimeout(async () => {
      try {
        const existingFiles = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
        const oldProfilePics = existingFiles.filter((f) => 
          f.startsWith('profile_') && f !== filename
        );
        for (const oldFile of oldProfilePics) {
          await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${oldFile}`, { idempotent: true });
          console.log('[ProfilePhoto] Cleaned up old file:', oldFile);
        }
      } catch (cleanupError) {
        // Non-critical, continue even if cleanup fails
        console.log('[ProfilePhoto] Cleanup note:', cleanupError.message);
      }
    }, 1000); // Delay cleanup to ensure new file is fully saved

    console.log('[ProfilePhoto] Image persisted successfully:', permanentPath);
    return permanentPath;
  } catch (error) {
    console.error('[ProfilePhoto] Failed to persist image:', error);
    // Fallback to temp URI for current session
    return tempUri;
  }
};
