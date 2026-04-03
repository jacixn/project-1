/**
 * Storage Service
 * 
 * Handles file uploads to Firebase Storage
 */

import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';
import * as FileSystem from 'expo-file-system';

const localFileToBlob = async (uri) => {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: 'image/jpeg' });
};

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
    
    const blob = localUri.startsWith('file://') 
      ? await localFileToBlob(localUri)
      : await (await fetch(localUri)).blob();
    
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
    const blob = localUri.startsWith('file://') 
      ? await localFileToBlob(localUri)
      : await (await fetch(localUri)).blob();
    
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, blob);
    
    return await getDownloadURL(snapshot.ref);
  } catch (error) {
    console.error('[Storage] Error uploading image:', error);
    throw error;
  }
};

/**
 * Upload a prayer board image (photo item or background) to Firebase Storage
 * @param {string} userId - The user's Firebase UID
 * @param {string} localUri - Local file URI (file://...)
 * @param {string} imageId - Unique identifier for this image
 * @returns {Promise<string>} - Download URL of the uploaded image
 */
export const uploadPrayerBoardImage = async (userId, localUri, imageId) => {
  if (!userId || !localUri) {
    throw new Error('User ID and local URI are required');
  }

  try {
    const blob = localUri.startsWith('file://') 
      ? await localFileToBlob(localUri)
      : await (await fetch(localUri)).blob();

    const storageRef = ref(storage, `prayer-boards/${userId}/${imageId}.jpg`);
    const snapshot = await uploadBytes(storageRef, blob);

    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('[Storage] Prayer board image uploaded:', imageId);
    return downloadURL;
  } catch (error) {
    console.warn('[Storage] Error uploading prayer board image:', error.message);
    throw error;
  }
};

/**
 * Delete all prayer board images for a user from Firebase Storage
 * @param {string} userId - The user's Firebase UID
 */
export const deletePrayerBoardImages = async (userId) => {
  if (!userId) return;

  try {
    const folderRef = ref(storage, `prayer-boards/${userId}`);
    const list = await listAll(folderRef);
    for (const item of list.items) {
      await deleteObject(item);
    }
    console.log('[Storage] Deleted', list.items.length, 'prayer board images for user:', userId);
  } catch (error) {
    console.log('[Storage] Prayer board images cleanup:', error.message);
  }
};

export default {
  uploadProfilePicture,
  uploadImage,
  uploadPrayerBoardImage,
  deletePrayerBoardImages,
};
