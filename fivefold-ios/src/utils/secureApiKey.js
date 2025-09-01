// This file is kept for backward compatibility
// All API key management is now handled by the secure proxy server

// Export dummy functions that won't cause errors
export default {
  initialize: async () => true,
  grantConsent: async () => true,
  revokeConsent: async () => true,
  getApiKey: () => null,
  isSmartFeaturesEnabled: () => true,
  unlockApiKey: async () => true,
  secureApiCall: async () => ({ success: true })
};

export const initializeApiSecurity = async () => true;
export const enableSmartFeatures = async () => true;
export const disableSmartFeatures = async () => true;
export const getSecureApiKey = () => null;
export const isSmartFeaturesEnabled = () => true;
export const makeSecureApiCall = async () => ({ success: true });