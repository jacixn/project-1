/**
 * Storage Service
 * 
 * Handles file uploads to Firebase Storage
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Upload a profile picture to Firebase Storage
 * @param {string} userId - The user's Firebase UID
 * @param {string} localUri - Local file URI (file://...)
 * @returns {Promise<string>} - Download URL of the uploaded image
 */
export const uploadProfilePicture = async (userId, localUri) => {
  if (!userId || !localUri) {
    throw new Error('User ID and local URI are required');
  }

  try {
    console.log('[Storage] Uploading profile picture for user:', userId);
    
    // Fetch the local file as a blob
    const response = await fetch(localUri);
    const blob = await response.blob();
    
    // Create a reference to the file location
    const fileName = `profile_${userId}_${Date.now()}.jpg`;
    const storageRef = ref(storage, `profile-pictures/${userId}/${fileName}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, blob);
    console.log('[Storage] Upload complete:', snapshot.metadata.name);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('[Storage] Download URL:', downloadURL);
    
    return downloadURL;
  } catch (error) {
    console.error('[Storage] Error uploading profile picture:', error);
    throw error;
  }
};

/**
 * Upload any image to Firebase Storage
 * @param {string} path - Storage path (e.g., 'images/prayer-1.jpg')
 * @param {string} localUri - Local file URI
 * @returns {Promise<string>} - Download URL
 */
export const uploadImage = async (path, localUri) => {
  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, blob);
    
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error('[Storage] Error uploading image:', error);
    throw error;
  }
};

export default {
  uploadProfilePicture,
  uploadImage,
};
