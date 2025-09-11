import AsyncStorage from '@react-native-async-storage/async-storage';

class AsyncStorageQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  async enqueue(operation) {
    return new Promise((resolve, reject) => {
      this.queue.push({ operation, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const { operation, resolve, reject } = this.queue.shift();
      
      try {
        const result = await operation();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processing = false;
  }

  async getItem(key) {
    return this.enqueue(() => AsyncStorage.getItem(key));
  }

  async setItem(key, value) {
    return this.enqueue(() => AsyncStorage.setItem(key, value));
  }

  async removeItem(key) {
    return this.enqueue(() => AsyncStorage.removeItem(key));
  }

  async multiGet(keys) {
    return this.enqueue(() => AsyncStorage.multiGet(keys));
  }

  async multiSet(keyValuePairs) {
    return this.enqueue(() => AsyncStorage.multiSet(keyValuePairs));
  }

  async multiRemove(keys) {
    return this.enqueue(() => AsyncStorage.multiRemove(keys));
  }
}

// Export singleton instance
export default new AsyncStorageQueue();
