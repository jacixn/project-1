import userStorage from './userStorage';

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
    return this.enqueue(() => userStorage.getRaw(key));
  }

  async setItem(key, value) {
    return this.enqueue(() => userStorage.setRaw(key, value));
  }

  async removeItem(key) {
    return this.enqueue(() => userStorage.remove(key));
  }

  async multiGet(keys) {
    return this.enqueue(() => userStorage.multiGet(keys));
  }

  async multiRemove(keys) {
    return this.enqueue(() => userStorage.multiRemove(keys));
  }
}

// Export singleton instance
export default new AsyncStorageQueue();
