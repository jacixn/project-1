/**
 * scaleService.js
 *
 * Bluetooth Low Energy (BLE) service for body composition scales.
 *
 * Supported protocols:
 * - Standard Bluetooth SIG Weight Scale (0x181D) + Body Composition (0x181B)
 * - Chipsea chipset (0xFFF0) — the most common generic scale protocol
 * - Yunmai-style (0xFFE0)
 *
 * Data flow:
 *   BLE Scale → scaleService (parse) → AsyncStorage (@scale_history, @scale_device)
 *                                     → nutritionService (update profile weight/bf)
 */

import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import userStorage from '../utils/userStorage';
import { pushToCloud } from './userSyncService';

const DEVICE_KEY = '@scale_device';
const HISTORY_KEY = '@scale_history';
const MAX_HISTORY = 365;

// Standard BLE service/characteristic UUIDs
const WEIGHT_SCALE_SVC = '0000181d-0000-1000-8000-00805f9b34fb';
const BODY_COMP_SVC = '0000181b-0000-1000-8000-00805f9b34fb';
const WEIGHT_MEASUREMENT_CHAR = '00002a9d-0000-1000-8000-00805f9b34fb';
const BODY_COMP_MEASUREMENT_CHAR = '00002a9c-0000-1000-8000-00805f9b34fb';

// Chipsea protocol UUIDs
const CHIPSEA_SVC = '0000fff0-0000-1000-8000-00805f9b34fb';
const CHIPSEA_WRITE_CHAR = '0000fff1-0000-1000-8000-00805f9b34fb';
const CHIPSEA_NOTIFY_CHAR = '0000fff4-0000-1000-8000-00805f9b34fb';

// Yunmai-style
const YUNMAI_SVC = '0000ffe0-0000-1000-8000-00805f9b34fb';
const YUNMAI_NOTIFY_CHAR = '0000ffe4-0000-1000-8000-00805f9b34fb';

// Generic body fat scale service (used by many white-label scales)
const GENERIC_SVC = '0000ffb0-0000-1000-8000-00805f9b34fb';
const GENERIC_NOTIFY_CHAR = '0000ffb2-0000-1000-8000-00805f9b34fb';

const SCALE_SERVICE_UUIDS = [
  WEIGHT_SCALE_SVC,
  BODY_COMP_SVC,
  CHIPSEA_SVC,
  YUNMAI_SVC,
  GENERIC_SVC,
];

class ScaleService {
  constructor() {
    this._manager = null;
    this._device = null;
    this._subscription = null;
    this._listeners = new Set();
    this._scanning = false;
    this._connected = false;
    this._protocol = null;
  }

  // ═══════════════════════════════════════════
  //  LIFECYCLE
  // ═══════════════════════════════════════════

  _getManager() {
    if (!this._manager) {
      this._manager = new BleManager();
    }
    return this._manager;
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version;
      if (apiLevel >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return Object.values(granted).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    }
    return true;
  }

  async ensureBluetoothReady() {
    const manager = this._getManager();
    return new Promise((resolve, reject) => {
      const sub = manager.onStateChange((state) => {
        if (state === 'PoweredOn') {
          sub.remove();
          resolve(true);
        } else if (state === 'PoweredOff' || state === 'Unauthorized') {
          sub.remove();
          reject(new Error(state === 'PoweredOff' ? 'Bluetooth is turned off' : 'Bluetooth permission denied'));
        }
      }, true);

      setTimeout(() => {
        sub.remove();
        reject(new Error('Bluetooth state check timed out'));
      }, 10000);
    });
  }

  // ═══════════════════════════════════════════
  //  SCANNING
  // ═══════════════════════════════════════════

  async startScan(onDeviceFound, durationMs = 15000) {
    if (this._scanning) return;

    await this.requestPermissions();
    await this.ensureBluetoothReady();

    this._scanning = true;
    const manager = this._getManager();
    const seen = new Set();

    manager.startDeviceScan(
      null,
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.warn('[Scale] Scan error:', error.message);
          return;
        }
        if (!device || seen.has(device.id)) return;

        const isScale = this._looksLikeScale(device);
        if (isScale) {
          seen.add(device.id);
          onDeviceFound({
            id: device.id,
            name: device.name || device.localName || 'Unknown Scale',
            rssi: device.rssi,
            serviceUUIDs: device.serviceUUIDs,
          });
        }
      }
    );

    setTimeout(() => this.stopScan(), durationMs);
  }

  stopScan() {
    if (!this._scanning) return;
    this._scanning = false;
    try {
      this._getManager().stopDeviceScan();
    } catch (_) {}
  }

  _looksLikeScale(device) {
    const name = (device.name || device.localName || '').toLowerCase();
    const scaleKeywords = [
      'scale', 'weight', 'body', 'health', 'chipsea', 'yunmai',
      'renpho', 'eufy', 'mi body', 'xiaomi', 'qn-scale', 'icomon',
      'healthkeep', 'fitindex', 'etekcity', 'arboleaf', 'wyze',
      'inevifit', 'greater goods', 'bf ', 'bs ', 'cs20', 'adoric',
      'insmart', '1byone', 'kamtron', 'bluetooth', 'smartscale',
      'if_', 'qs-', 'qn-', 'el-', 'hl-', 'hm-', 'hs-',
    ];

    if (scaleKeywords.some(k => name.includes(k))) return true;

    const svcs = device.serviceUUIDs || [];
    if (svcs.some(s => SCALE_SERVICE_UUIDS.includes(s.toLowerCase()))) return true;

    if (device.serviceData) {
      const sdKeys = Object.keys(device.serviceData);
      if (sdKeys.some(k => SCALE_SERVICE_UUIDS.includes(k.toLowerCase()))) return true;
    }

    return false;
  }

  // ═══════════════════════════════════════════
  //  CONNECTION
  // ═══════════════════════════════════════════

  async connect(deviceId, onData, onStatus) {
    this.stopScan();
    this.disconnect();

    const manager = this._getManager();
    onStatus?.('connecting');

    try {
      let device = await manager.connectToDevice(deviceId, {
        requestMTU: 512,
        timeout: 15000,
      });

      device = await device.discoverAllServicesAndCharacteristics();
      this._device = device;
      this._connected = true;

      const services = await device.services();
      const protocol = await this._detectProtocol(device, services);
      this._protocol = protocol;

      console.log('[Scale] Connected, protocol:', protocol);
      onStatus?.('connected');

      await this._subscribeToMeasurements(device, protocol, onData, onStatus);

      await this._saveDevice({ id: device.id, name: device.name || device.localName || 'Scale' });

      device.onDisconnected((error, dev) => {
        console.log('[Scale] Disconnected', error?.message);
        this._connected = false;
        this._subscription?.remove();
        this._subscription = null;
        onStatus?.('disconnected');
      });

    } catch (err) {
      console.warn('[Scale] Connection failed:', err.message);
      this._connected = false;
      onStatus?.('error');
      throw err;
    }
  }

  disconnect() {
    this._subscription?.remove();
    this._subscription = null;
    if (this._device) {
      try {
        this._getManager().cancelDeviceConnection(this._device.id);
      } catch (_) {}
      this._device = null;
    }
    this._connected = false;
    this._protocol = null;
  }

  isConnected() {
    return this._connected;
  }

  async _detectProtocol(device, services) {
    const svcUUIDs = services.map(s => s.uuid.toLowerCase());

    if (svcUUIDs.includes(BODY_COMP_SVC)) return 'body_composition';
    if (svcUUIDs.includes(WEIGHT_SCALE_SVC)) return 'weight_scale';
    if (svcUUIDs.includes(CHIPSEA_SVC)) return 'chipsea';
    if (svcUUIDs.includes(YUNMAI_SVC)) return 'yunmai';
    if (svcUUIDs.includes(GENERIC_SVC)) return 'generic';

    // Fallback: scan all characteristics for known ones
    for (const svc of services) {
      const chars = await device.characteristicsForService(svc.uuid);
      const charUUIDs = chars.map(c => c.uuid.toLowerCase());
      if (charUUIDs.includes(CHIPSEA_NOTIFY_CHAR)) return 'chipsea';
      if (charUUIDs.includes(YUNMAI_NOTIFY_CHAR)) return 'yunmai';
      if (charUUIDs.includes(GENERIC_NOTIFY_CHAR)) return 'generic';
      if (charUUIDs.includes(WEIGHT_MEASUREMENT_CHAR)) return 'weight_scale';
    }

    return 'unknown';
  }

  async _subscribeToMeasurements(device, protocol, onData, onStatus) {
    const subscribe = (serviceUUID, charUUID, parser) => {
      this._subscription = device.monitorCharacteristicForService(
        serviceUUID, charUUID,
        (error, char) => {
          if (error) {
            console.warn('[Scale] Notification error:', error.message);
            return;
          }
          if (!char?.value) return;

          const bytes = this._base64ToBytes(char.value);
          const parsed = parser(bytes);
          if (parsed) {
            this._emitData(parsed, onData);
          }
        }
      );
    };

    switch (protocol) {
      case 'body_composition':
        subscribe(BODY_COMP_SVC, BODY_COMP_MEASUREMENT_CHAR, this._parseBodyComposition.bind(this));
        // Weight often comes via separate Weight Measurement characteristic
        try {
          const weightSub = device.monitorCharacteristicForService(
            WEIGHT_SCALE_SVC, WEIGHT_MEASUREMENT_CHAR,
            (error, char) => {
              if (error || !char?.value) return;
              const bytes = this._base64ToBytes(char.value);
              const parsed = this._parseWeightMeasurement(bytes);
              if (parsed) this._emitData(parsed, onData);
            }
          );
          const origSub = this._subscription;
          this._subscription = {
            remove: () => { origSub?.remove(); weightSub?.remove(); }
          };
        } catch (_) {}
        break;

      case 'weight_scale':
        subscribe(WEIGHT_SCALE_SVC, WEIGHT_MEASUREMENT_CHAR, this._parseWeightMeasurement.bind(this));
        break;

      case 'chipsea':
        try {
          const initCmd = new Uint8Array([0xFD, 0x37, 0x00, 0x00, 0x00, 0x00]);
          const b64 = this._bytesToBase64(initCmd);
          await device.writeCharacteristicWithResponseForService(CHIPSEA_SVC, CHIPSEA_WRITE_CHAR, b64);
        } catch (_) {}
        subscribe(CHIPSEA_SVC, CHIPSEA_NOTIFY_CHAR, this._parseChipsea.bind(this));
        break;

      case 'yunmai':
        subscribe(YUNMAI_SVC, YUNMAI_NOTIFY_CHAR, this._parseYunmai.bind(this));
        break;

      case 'generic':
        subscribe(GENERIC_SVC, GENERIC_NOTIFY_CHAR, this._parseGeneric.bind(this));
        break;

      default: {
        // Try to find any notifiable characteristic and do best-effort parsing
        const services = await device.services();
        for (const svc of services) {
          const chars = await device.characteristicsForService(svc.uuid);
          for (const c of chars) {
            if (c.isNotifiable) {
              console.log('[Scale] Subscribing to unknown protocol:', svc.uuid, c.uuid);
              subscribe(svc.uuid, c.uuid, this._parseUnknown.bind(this));
              return;
            }
          }
        }
        console.warn('[Scale] No notifiable characteristics found');
        onStatus?.('unsupported');
      }
    }
  }

  // ═══════════════════════════════════════════
  //  PROTOCOL PARSERS
  // ═══════════════════════════════════════════

  _parseWeightMeasurement(bytes) {
    if (bytes.length < 3) return null;

    const flags = bytes[0];
    const isKg = !(flags & 0x01);
    const hasTimestamp = !!(flags & 0x02);
    const hasBMI = !!(flags & 0x04);

    let weightRaw = (bytes[2] << 8) | bytes[1];
    let weightKg = isKg ? weightRaw / 200 : weightRaw / 200 * 0.453592;
    const stable = !(flags & 0x20);

    let result = {
      weightKg: Math.round(weightKg * 100) / 100,
      stable,
      protocol: 'weight_scale',
    };

    if (hasBMI && bytes.length >= (hasTimestamp ? 12 : 5)) {
      const offset = hasTimestamp ? 9 : 3;
      if (bytes.length > offset + 1) {
        result.bmi = ((bytes[offset + 1] << 8) | bytes[offset]) / 10;
      }
    }

    return result;
  }

  _parseBodyComposition(bytes) {
    if (bytes.length < 4) return null;

    const flags = (bytes[1] << 8) | bytes[0];
    const isKg = !(flags & 0x01);

    // Per Bluetooth SIG 0x2A9C: bytes 2-3 = Body Fat Percentage (mandatory, resolution 0.1%)
    const bfRaw = (bytes[3] << 8) | bytes[2];
    const bodyFatPercent = bfRaw / 10;

    let result = {
      stable: true,
      protocol: 'body_composition',
    };

    if (bodyFatPercent > 0 && bodyFatPercent < 70) {
      result.bodyFatPercent = bodyFatPercent;
    }

    let offset = 4;
    if (flags & 0x02) {
      offset += 7; // Timestamp (7 bytes)
    }
    if (flags & 0x04) {
      offset += 1; // User ID (1 byte)
    }
    if (flags & 0x08 && bytes.length > offset + 3) {
      // BMI (2 bytes) + Height (2 bytes) — paired per spec
      result.bmi = ((bytes[offset + 1] << 8) | bytes[offset]) / 10;
      offset += 4;
    }
    if (flags & 0x10 && bytes.length > offset + 1) {
      // Muscle Percentage (resolution 0.1%)
      result.musclePercent = ((bytes[offset + 1] << 8) | bytes[offset]) / 10;
      offset += 2;
    }
    if (flags & 0x20 && bytes.length > offset + 1) {
      // Muscle Mass (resolution 0.005 kg)
      offset += 2;
    }
    if (flags & 0x40 && bytes.length > offset + 1) {
      // Fat Free Mass
      offset += 2;
    }
    if (flags & 0x80 && bytes.length > offset + 1) {
      // Soft Lean Mass
      offset += 2;
    }
    if (flags & 0x100 && bytes.length > offset + 1) {
      // Body Water Mass
      offset += 2;
    }
    if (flags & 0x200 && bytes.length > offset + 1) {
      // Impedance (resolution 0.1 Ohm)
      result.impedance = ((bytes[offset + 1] << 8) | bytes[offset]) / 10;
      offset += 2;
    }
    if (flags & 0x400 && bytes.length > offset + 1) {
      // Weight
      const weightRaw = (bytes[offset + 1] << 8) | bytes[offset];
      result.weightKg = isKg ? weightRaw / 200 : weightRaw / 200 * 0.453592;
      result.weightKg = Math.round(result.weightKg * 100) / 100;
      offset += 2;
    }

    return result;
  }

  _parseChipsea(bytes) {
    if (bytes.length < 4) return null;

    const header = bytes[0];

    // Weight data packet (varies by model, common patterns)
    if (bytes.length >= 10) {
      const stable = !!(header & 0x20) || !!(bytes[0] & 0x40);
      const unit = bytes[0] & 0x0F;
      let weightRaw = (bytes[3] << 8) | bytes[4];
      if (weightRaw === 0) weightRaw = (bytes[4] << 8) | bytes[3];

      let weightKg;
      if (unit === 0x01 || unit === 0x02) {
        weightKg = weightRaw / 100;
      } else {
        weightKg = weightRaw / 10;
      }

      if (weightKg < 2 || weightKg > 300) {
        weightKg = weightRaw / 100;
      }
      if (weightKg < 2 || weightKg > 300) return null;

      let result = {
        weightKg: Math.round(weightKg * 100) / 100,
        stable,
        protocol: 'chipsea',
      };

      // Impedance is usually in bytes 5-6 for Chipsea
      if (bytes.length >= 8) {
        const imp = (bytes[5] << 8) | bytes[6];
        if (imp > 100 && imp < 2000) {
          result.impedance = imp;
        }
      }

      return result;
    }

    return null;
  }

  _parseYunmai(bytes) {
    if (bytes.length < 6) return null;

    // Yunmai packets start with 0x0D or similar
    const weightRaw = (bytes[3] << 8) | bytes[4];
    const weightKg = weightRaw / 100;

    if (weightKg < 2 || weightKg > 300) return null;

    const stable = bytes[5] === 0x01;

    let result = {
      weightKg: Math.round(weightKg * 100) / 100,
      stable,
      protocol: 'yunmai',
    };

    // Body fat in later bytes
    if (bytes.length >= 14) {
      const bfRaw = (bytes[7] << 8) | bytes[8];
      if (bfRaw > 0 && bfRaw < 800) {
        result.bodyFatPercent = bfRaw / 10;
      }
    }

    return result;
  }

  _parseGeneric(bytes) {
    if (bytes.length < 4) return null;

    // Try common patterns
    let weightRaw = (bytes[1] << 8) | bytes[2];
    let weightKg = weightRaw / 100;

    if (weightKg < 2 || weightKg > 300) {
      weightRaw = (bytes[2] << 8) | bytes[1];
      weightKg = weightRaw / 100;
    }
    if (weightKg < 2 || weightKg > 300) {
      weightRaw = (bytes[3] << 8) | bytes[4];
      weightKg = weightRaw / 100;
    }
    if (weightKg < 2 || weightKg > 300) return null;

    return {
      weightKg: Math.round(weightKg * 100) / 100,
      stable: true,
      protocol: 'generic',
    };
  }

  _parseUnknown(bytes) {
    if (bytes.length < 3) return null;

    // Brute force: scan every pair of bytes for a plausible weight
    for (let i = 0; i < bytes.length - 1; i++) {
      for (const divisor of [100, 200, 10]) {
        const raw = (bytes[i] << 8) | bytes[i + 1];
        const kg = raw / divisor;
        if (kg >= 10 && kg <= 250) {
          return {
            weightKg: Math.round(kg * 100) / 100,
            stable: true,
            protocol: 'unknown',
          };
        }
        const rawLE = (bytes[i + 1] << 8) | bytes[i];
        const kgLE = rawLE / divisor;
        if (kgLE >= 10 && kgLE <= 250) {
          return {
            weightKg: Math.round(kgLE * 100) / 100,
            stable: true,
            protocol: 'unknown',
          };
        }
      }
    }

    return null;
  }

  // ═══════════════════════════════════════════
  //  BODY FAT FROM IMPEDANCE
  // ═══════════════════════════════════════════

  calculateBodyFat(impedance, weightKg, heightCm, age, isMale) {
    if (!impedance || !weightKg || !heightCm || !age) return null;

    // Lukaski formula adapted for consumer scales
    let lbm;
    if (isMale) {
      lbm = (0.485 * (heightCm * heightCm) / impedance) + (0.338 * weightKg) + 5.32;
    } else {
      lbm = (0.474 * (heightCm * heightCm) / impedance) + (0.18 * weightKg) + 7.3;
    }

    const bf = ((weightKg - lbm) / weightKg) * 100;
    return Math.max(3, Math.min(65, Math.round(bf * 10) / 10));
  }

  // ═══════════════════════════════════════════
  //  DATA EMISSION & STORAGE
  // ═══════════════════════════════════════════

  _emitData(parsed, onData) {
    onData?.(parsed);
    this._listeners.forEach(fn => fn(parsed));
  }

  addListener(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  async saveReading(reading) {
    try {
      const entry = {
        timestamp: new Date().toISOString(),
        weightKg: reading.weightKg,
        bodyFatPercent: reading.bodyFatPercent || null,
        impedance: reading.impedance || null,
        protocol: reading.protocol || 'unknown',
      };

      const json = await userStorage.getRaw(HISTORY_KEY);
      const history = json ? JSON.parse(json) : [];

      history.unshift(entry);
      if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;

      await userStorage.setRaw(HISTORY_KEY, JSON.stringify(history));
      pushToCloud('scaleHistory', history);

      console.log('[Scale] Reading saved:', entry.weightKg, 'kg');
      return entry;
    } catch (e) {
      console.warn('[Scale] Failed to save reading:', e.message);
      return null;
    }
  }

  async getHistory() {
    try {
      const json = await userStorage.getRaw(HISTORY_KEY);
      return json ? JSON.parse(json) : [];
    } catch (_) {
      return [];
    }
  }

  async getLastReading() {
    const history = await this.getHistory();
    return history[0] || null;
  }

  // ═══════════════════════════════════════════
  //  SAVED DEVICE
  // ═══════════════════════════════════════════

  async _saveDevice(device) {
    try {
      await userStorage.setRaw(DEVICE_KEY, JSON.stringify(device));
    } catch (_) {}
  }

  async getSavedDevice() {
    try {
      const json = await userStorage.getRaw(DEVICE_KEY);
      return json ? JSON.parse(json) : null;
    } catch (_) {
      return null;
    }
  }

  async forgetDevice() {
    try {
      this.disconnect();
      await userStorage.setRaw(DEVICE_KEY, JSON.stringify(null));
    } catch (_) {}
  }

  async autoReconnect(onData, onStatus) {
    const saved = await this.getSavedDevice();
    if (!saved) return false;

    try {
      await this.connect(saved.id, onData, onStatus);
      return true;
    } catch (err) {
      console.log('[Scale] Auto-reconnect failed:', err.message);
      return false;
    }
  }

  // ═══════════════════════════════════════════
  //  UTILS
  // ═══════════════════════════════════════════

  _base64ToBytes(base64) {
    const binary = global.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  _bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return global.btoa(binary);
  }

  destroy() {
    this.disconnect();
    if (this._manager) {
      this._manager.destroy();
      this._manager = null;
    }
  }
}

export default new ScaleService();
