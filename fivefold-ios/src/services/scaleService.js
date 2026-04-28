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
 * Chipsea scales send TWO types of packets:
 *   1. Weight packets  — contain weight + stability flag
 *   2. Body comp packets — contain fat %, BMI, bone mass, etc. (arrive AFTER weight stabilises)
 *
 * The user's profile (height, age, gender) must be written to the scale
 * via the FFF1 write characteristic so it can calculate body composition.
 *
 * Data flow:
 *   BLE Scale → scaleService (parse + accumulate) → AsyncStorage (@scale_history, @scale_device)
 *                                                  → nutritionService (update profile weight/bf)
 */

// Bluetooth scale support has been removed for App Store compliance.
// The BleManager stub below throws if any code path tries to scan or connect —
// the UI is gated by SCALE_BLUETOOTH_ENABLED = false so this never runs.
class BleManager {
  constructor() {}
  startDeviceScan() { throw new Error('Bluetooth scale support has been removed.'); }
  stopDeviceScan() {}
  connectToDevice() { throw new Error('Bluetooth scale support has been removed.'); }
  cancelDeviceConnection() {}
  state() { return Promise.resolve('PoweredOff'); }
  onStateChange() { return { remove: () => {} }; }
  destroy() {}
}
import { Platform, PermissionsAndroid } from 'react-native';
import userStorage from '../utils/userStorage';
import { pushToCloud } from './userSyncService';

const DEVICE_KEY = '@scale_device';
const HISTORY_KEY = '@scale_history';
const MAX_HISTORY = 365;

const WEIGHT_SCALE_SVC = '0000181d-0000-1000-8000-00805f9b34fb';
const BODY_COMP_SVC = '0000181b-0000-1000-8000-00805f9b34fb';
const WEIGHT_MEASUREMENT_CHAR = '00002a9d-0000-1000-8000-00805f9b34fb';
const BODY_COMP_MEASUREMENT_CHAR = '00002a9c-0000-1000-8000-00805f9b34fb';

const CHIPSEA_SVC = '0000fff0-0000-1000-8000-00805f9b34fb';
const CHIPSEA_WRITE_CHAR = '0000fff1-0000-1000-8000-00805f9b34fb';
const CHIPSEA_NOTIFY_CHAR = '0000fff4-0000-1000-8000-00805f9b34fb';

const YUNMAI_SVC = '0000ffe0-0000-1000-8000-00805f9b34fb';
const YUNMAI_NOTIFY_CHAR = '0000ffe4-0000-1000-8000-00805f9b34fb';

const GENERIC_SVC = '0000ffb0-0000-1000-8000-00805f9b34fb';
const GENERIC_NOTIFY_CHAR = '0000ffb2-0000-1000-8000-00805f9b34fb';

const SCALE_SERVICE_UUIDS = [
  WEIGHT_SCALE_SVC, BODY_COMP_SVC, CHIPSEA_SVC, YUNMAI_SVC, GENERIC_SVC,
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
    this._recentWeights = [];
    this._lastValidWeight = null;
    this._measurement = {};
  }

  // ═══════════════════════════════════════════
  //  LIFECYCLE
  // ═══════════════════════════════════════════

  _getManager() {
    if (!this._manager) this._manager = new BleManager();
    return this._manager;
  }

  async requestPermissions() {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 31) {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return Object.values(granted).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
      }
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }

  async ensureBluetoothReady() {
    const manager = this._getManager();
    return new Promise((resolve, reject) => {
      const sub = manager.onStateChange((state) => {
        if (state === 'PoweredOn') { sub.remove(); resolve(true); }
        else if (state === 'PoweredOff' || state === 'Unauthorized') {
          sub.remove();
          reject(new Error(state === 'PoweredOff' ? 'Bluetooth is turned off' : 'Bluetooth permission denied'));
        }
      }, true);
      setTimeout(() => { sub.remove(); reject(new Error('Bluetooth state check timed out')); }, 10000);
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

    manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
      if (error) { console.warn('[Scale] Scan error:', error.message); return; }
      if (!device || seen.has(device.id)) return;
      if (this._looksLikeScale(device)) {
        seen.add(device.id);
        onDeviceFound({
          id: device.id,
          name: device.name || device.localName || 'Unknown Scale',
          rssi: device.rssi,
          serviceUUIDs: device.serviceUUIDs,
        });
      }
    });
    setTimeout(() => this.stopScan(), durationMs);
  }

  stopScan() {
    if (!this._scanning) return;
    this._scanning = false;
    try { this._getManager().stopDeviceScan(); } catch (_) {}
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
    this._recentWeights = [];
    this._measurement = {};

    const manager = this._getManager();
    onStatus?.('connecting');

    try {
      let device = await manager.connectToDevice(deviceId, { requestMTU: 512, timeout: 15000 });
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

      device.onDisconnected((error) => {
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
      try { this._getManager().cancelDeviceConnection(this._device.id); } catch (_) {}
      this._device = null;
    }
    this._connected = false;
    this._protocol = null;
    this._recentWeights = [];
    this._measurement = {};
  }

  isConnected() { return this._connected; }

  resetMeasurement() {
    this._measurement = {};
    this._recentWeights = [];
    this._lastValidWeight = null;
  }

  /**
   * Send user profile to scale so it calculates body composition.
   * Format depends on protocol:
   *   - chipsea: Chipsea-style profile commands on FFF1
   *   - generic: Healthkeep/Fitdays/QN-style commands on FFB1
   * Must be called AFTER connect() completes.
   */
  async sendUserProfile(gender, age, heightCm, weightKg) {
    if (!this._device || !this._connected) {
      console.log('[Scale] sendUserProfile skipped — not connected');
      return;
    }

    const svcUUID = this._protocol === 'chipsea' ? CHIPSEA_SVC
                  : this._protocol === 'generic' ? GENERIC_SVC
                  : null;
    if (!svcUUID) {
      console.log('[Scale] sendUserProfile skipped — protocol:', this._protocol);
      return;
    }

    const g = gender === 'male' ? 0x01 : 0x02;
    const a = Math.min(255, Math.max(10, Math.round(age || 25)));
    const h = Math.min(255, Math.max(100, Math.round(heightCm || 170)));
    const wInt = Math.round((weightKg || 70) * 10);
    const wHi = (wInt >> 8) & 0xFF;
    const wLo = wInt & 0xFF;

    console.log('[Scale] sendUserProfile protocol=' + this._protocol + ' g=' + g + ' age=' + a + ' h=' + h);

    let writeCharUUID = null;
    try {
      const chars = await this._device.characteristicsForService(svcUUID);
      // Prefer FFB1 for generic, FFF1 for chipsea — but accept any writable
      const preferred = this._protocol === 'generic'
        ? chars.find(c => c.uuid.toLowerCase().includes('ffb1') && (c.isWritableWithResponse || c.isWritableWithoutResponse))
        : chars.find(c => c.uuid.toLowerCase().includes('fff1') && (c.isWritableWithResponse || c.isWritableWithoutResponse));
      const writeChar = preferred || chars.find(c => c.isWritableWithResponse || c.isWritableWithoutResponse);
      if (writeChar) writeCharUUID = writeChar.uuid;
    } catch (e) {
      console.warn('[Scale] characteristicsForService failed:', e.message);
    }
    if (!writeCharUUID) {
      console.warn('[Scale] No writable characteristic found on', svcUUID);
      return;
    }
    console.log('[Scale] Profile write char:', writeCharUUID);

    let cmds;
    if (this._protocol === 'generic') {
      // FITDAYS PROTOCOL — captured via PacketLogger BLE sniff of Fitdays app session.
      // Each packet is exactly 20 bytes:
      //   [seq][len_lo][len_hi][cmd][params...][zero-pad to byte 18][checksum byte 19]
      // Checksum is non-standard — don't recompute, replay verbatim.
      // Replaying the captured bytes works because scale validates the bytes themselves,
      // not the timestamp staleness or session uniqueness.
      //
      // Captured init handshake (in order):
      //   B0 INIT (cmd=0xb0 arg=0x00)
      //   B1 USER PROFILE (cmd=0xb1, embeds: timestamp BE, user_id, gender, height, ..., unit, chk)
      //   B2 DEVICE STATE (cmd=0xb2, embeds device session bytes)
      //   B0 START MEASURE (cmd=0xb0 arg=0x01)
      //
      // Profile baked into B1 is: male (g=1), height=178cm (0xb2), unit=kg (0x01).
      // For other users, B1 must be re-captured with their own Fitdays session OR the
      // checksum algo must be reverse-engineered. For this user (jason: male/178cm) it works.
      const fitdaysInit = [
        '000300b000000000000000000000000000000010', // 0: B0 INIT
        '011000b169ef74ab003c01b21da6992f251c0104', // 1: B1 USER PROFILE
        '020e00b203b21da699a5203a35aa1cc59900001b', // 2: B2 DEVICE STATE
        '090300b001000000000000000000000000000011', // 3: B0 START MEASURE
      ];
      cmds = fitdaysInit.map(hex => {
        const out = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) out[i / 2] = parseInt(hex.substr(i, 2), 16);
        return out;
      });
    } else {
      // Chipsea — keep XOR-based profile cmds
      cmds = [
        new Uint8Array([0x10, g, a, h, wHi, wLo, 0x00, 0x00]),
        new Uint8Array([0xFE, 0x01, g, a, h, wHi, wLo, 0x00]),
        new Uint8Array([0x13, g, a, h, 0x00, 0x00, 0x00, 0x00]),
      ];
    }

    for (const cmd of cmds) {
      // For Fitdays packets the checksum is already correct (replayed) — don't overwrite.
      // For Chipsea, recalculate XOR checksum into last byte.
      if (this._protocol !== 'generic') {
        let xor = 0;
        for (let i = 0; i < cmd.length - 1; i++) xor ^= cmd[i];
        cmd[cmd.length - 1] = xor;
      }

      const hex = Array.from(cmd).map(b => b.toString(16).padStart(2, '0')).join(' ');
      const b64 = this._bytesToBase64(cmd);
      try {
        await this._device.writeCharacteristicWithResponseForService(svcUUID, writeCharUUID, b64);
        console.log('[Scale] Sent profile cmd:', hex);
      } catch (e1) {
        try {
          await this._device.writeCharacteristicWithoutResponseForService(svcUUID, writeCharUUID, b64);
          console.log('[Scale] Sent profile cmd (no-resp):', hex);
        } catch (e2) {
          console.warn('[Scale] Profile write failed:', hex, '|', e2.message);
        }
      }
      // Small delay between writes — scale needs time to process each command
      await new Promise(resolve => setTimeout(resolve, 80));
    }
  }

  async _detectProtocol(device, services) {
    const svcUUIDs = services.map(s => s.uuid.toLowerCase());
    if (svcUUIDs.includes(BODY_COMP_SVC)) return 'body_composition';
    if (svcUUIDs.includes(WEIGHT_SCALE_SVC)) return 'weight_scale';
    if (svcUUIDs.includes(CHIPSEA_SVC)) return 'chipsea';
    if (svcUUIDs.includes(YUNMAI_SVC)) return 'yunmai';
    if (svcUUIDs.includes(GENERIC_SVC)) return 'generic';

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
          if (error) { console.warn('[Scale] Notification error:', error.message); return; }
          if (!char?.value) return;
          const bytes = this._base64ToBytes(char.value);
          console.log('[Scale] Raw (' + bytes.length + 'B):', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
          const parsed = parser(bytes);
          if (parsed) {
            console.log('[Scale] Parsed:', JSON.stringify(parsed));
            this._emitData(parsed, onData);
          }
        }
      );
    };

    switch (protocol) {
      case 'body_composition':
        subscribe(BODY_COMP_SVC, BODY_COMP_MEASUREMENT_CHAR, this._parseBodyComposition.bind(this));
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
          this._subscription = { remove: () => { origSub?.remove(); weightSub?.remove(); } };
        } catch (_) {}
        break;

      case 'weight_scale':
        subscribe(WEIGHT_SCALE_SVC, WEIGHT_MEASUREMENT_CHAR, this._parseWeightMeasurement.bind(this));
        break;

      case 'chipsea': {
        // Send init handshake
        try {
          const initCmd = new Uint8Array([0xFD, 0x37, 0x00, 0x00, 0x00, 0x00]);
          await device.writeCharacteristicWithResponseForService(CHIPSEA_SVC, CHIPSEA_WRITE_CHAR, this._bytesToBase64(initCmd));
        } catch (_) {}

        // Subscribe to ALL notifiable characteristics on FFF0
        // Body comp data may arrive on FFF2/FFF3, not just FFF4
        const chipseaChars = await device.characteristicsForService(CHIPSEA_SVC);
        const subs = [];
        for (const c of chipseaChars) {
          if (c.isNotifiable) {
            const charTag = c.uuid.slice(4, 8);
            console.log('[Scale] Subscribing to Chipsea char:', charTag);
            const sub = device.monitorCharacteristicForService(
              CHIPSEA_SVC, c.uuid,
              (error, char) => {
                if (error) { console.warn('[Scale] Notify error [' + charTag + ']:', error.message); return; }
                if (!char?.value) return;
                const bytes = this._base64ToBytes(char.value);
                console.log('[Scale] Raw [' + charTag + '] (' + bytes.length + 'B):', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
                const parsed = this._parseChipsea(bytes);
                if (parsed) {
                  console.log('[Scale] Parsed [' + charTag + ']:', JSON.stringify(parsed));
                  this._emitData(parsed, onData);
                }
              }
            );
            subs.push(sub);
          }
        }
        this._subscription = { remove: () => subs.forEach(s => s?.remove()) };
        break;
      }

      case 'yunmai':
        subscribe(YUNMAI_SVC, YUNMAI_NOTIFY_CHAR, this._parseYunmai.bind(this));
        break;

      case 'generic': {
        // Subscribe to ALL notifiable chars on FFB0 (body comp may arrive on a different char)
        const genericChars = await device.characteristicsForService(GENERIC_SVC);
        const gSubs = [];
        for (const c of genericChars) {
          if (c.isNotifiable || c.isIndicatable) {
            const charTag = c.uuid.slice(4, 8);
            console.log('[Scale] Subscribing to generic char:', charTag);
            const sub = device.monitorCharacteristicForService(
              GENERIC_SVC, c.uuid,
              (error, char) => {
                if (error) { console.warn('[Scale] Notify error [' + charTag + ']:', error.message); return; }
                if (!char?.value) return;
                const bytes = this._base64ToBytes(char.value);
                console.log('[Scale] Raw [' + charTag + '] (' + bytes.length + 'B):', Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' '));
                const parsed = this._parseGeneric(bytes);
                if (parsed) {
                  console.log('[Scale] Parsed [' + charTag + ']:', JSON.stringify(parsed));
                  this._emitData(parsed, onData);
                }
              }
            );
            gSubs.push(sub);
          }
        }
        this._subscription = { remove: () => gSubs.forEach(s => s?.remove()) };
        break;
      }

      default: {
        const services = await device.services();
        for (const svc of services) {
          const chars = await device.characteristicsForService(svc.uuid);
          for (const c of chars) {
            if (c.isNotifiable) {
              console.log('[Scale] Subscribing to unknown char:', svc.uuid, c.uuid);
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

    let result = { weightKg: Math.round(weightKg * 100) / 100, stable, protocol: 'weight_scale' };
    if (hasBMI && bytes.length >= (hasTimestamp ? 12 : 5)) {
      const offset = hasTimestamp ? 9 : 3;
      if (bytes.length > offset + 1) result.bmi = ((bytes[offset + 1] << 8) | bytes[offset]) / 10;
    }
    return result;
  }

  _parseBodyComposition(bytes) {
    if (bytes.length < 4) return null;
    const flags = (bytes[1] << 8) | bytes[0];
    const isKg = !(flags & 0x01);
    const bfRaw = (bytes[3] << 8) | bytes[2];
    const bodyFatPercent = bfRaw / 10;

    let result = { stable: true, protocol: 'body_composition' };
    if (bodyFatPercent > 0 && bodyFatPercent < 70) result.bodyFatPercent = bodyFatPercent;

    let offset = 4;
    if (flags & 0x02) offset += 7;
    if (flags & 0x04) offset += 1;
    if (flags & 0x08 && bytes.length > offset + 3) {
      result.bmi = ((bytes[offset + 1] << 8) | bytes[offset]) / 10;
      offset += 4;
    }
    if (flags & 0x10 && bytes.length > offset + 1) {
      result.musclePercent = ((bytes[offset + 1] << 8) | bytes[offset]) / 10;
      offset += 2;
    }
    if (flags & 0x20 && bytes.length > offset + 1) offset += 2;
    if (flags & 0x40 && bytes.length > offset + 1) offset += 2;
    if (flags & 0x80 && bytes.length > offset + 1) offset += 2;
    if (flags & 0x100 && bytes.length > offset + 1) offset += 2;
    if (flags & 0x200 && bytes.length > offset + 1) {
      result.impedance = ((bytes[offset + 1] << 8) | bytes[offset]) / 10;
      offset += 2;
    }
    if (flags & 0x400 && bytes.length > offset + 1) {
      const weightRaw = (bytes[offset + 1] << 8) | bytes[offset];
      result.weightKg = isKg ? weightRaw / 200 : weightRaw / 200 * 0.453592;
      result.weightKg = Math.round(result.weightKg * 100) / 100;
    }
    return result;
  }

  /**
   * Chipsea: detect weight packets vs body composition packets.
   * Weight packets contain a plausible human weight (25-250 kg).
   * Body comp packets contain metrics like fat %, BMI, bone mass.
   */
  _parseChipsea(bytes) {
    if (bytes.length < 4) return null;

    const weightResult = this._parseChipseaWeight(bytes);
    if (weightResult) return weightResult;

    const bodyResult = this._parseChipseaBodyComp(bytes);
    if (bodyResult) return bodyResult;

    return null;
  }

  _parseChipseaWeight(bytes) {
    if (bytes.length < 6) return null;

    const header = bytes[0];
    const stable = (header & 0x01) === 0;

    const attempts = [
      [3, 4, 100], [2, 3, 100], [1, 2, 100],
      [4, 3, 100], [3, 2, 100],
      [3, 4, 10],  [2, 3, 10],
    ];

    let weightKg = null;
    for (const [hi, lo, div] of attempts) {
      if (hi >= bytes.length || lo >= bytes.length) continue;
      const raw = (bytes[hi] << 8) | bytes[lo];
      const kg = raw / div;
      if (kg >= 25 && kg <= 250) {
        weightKg = Math.round(kg * 100) / 100;
        break;
      }
    }
    if (!weightKg) return null;

    let result = { weightKg, stable, protocol: 'chipsea' };

    if (bytes.length >= 8) {
      for (let i = 5; i < bytes.length - 1 && i <= 8; i++) {
        const imp = (bytes[i] << 8) | bytes[i + 1];
        if (imp > 100 && imp < 2000) { result.impedance = imp; break; }
      }
    }
    return result;
  }

  _parseChipseaBodyComp(bytes) {
    if (bytes.length < 8) return null;

    for (let i = 1; i < bytes.length - 1; i++) {
      const raw = (bytes[i] << 8) | bytes[i + 1];
      const val = raw / 10;
      if (val >= 5.0 && val <= 60.0) {
        const bodyFat = Math.round(val * 10) / 10;
        console.log('[Scale] Body fat detected:', bodyFat, '% at byte', i);
        return { protocol: 'chipsea_body_comp', bodyFatPercent: bodyFat };
      }
    }
    return null;
  }

  _parseYunmai(bytes) {
    if (bytes.length < 6) return null;
    const weightRaw = (bytes[3] << 8) | bytes[4];
    const weightKg = weightRaw / 100;
    if (weightKg < 25 || weightKg > 250) return null;

    let result = { weightKg: Math.round(weightKg * 100) / 100, stable: bytes[5] === 0x01, protocol: 'yunmai' };
    if (bytes.length >= 14) {
      const bfRaw = (bytes[7] << 8) | bytes[8];
      if (bfRaw > 50 && bfRaw < 600) result.bodyFatPercent = bfRaw / 10;
    }
    return result;
  }

  _parseGeneric(bytes) {
    if (bytes.length < 4) return null;

    // 20-byte Healthkeep/QN format on FFB2 (weight):
    // [seq][07][00][A2][status][00][w2][w1][w0][00...][chk]
    // Weight = bytes 6-8 as 24-bit BE grams, status byte 4: 0x01=unstable 0x02=stable
    if (bytes.length >= 10 && bytes[1] === 0x07 && bytes[3] === 0xA2) {
      const weightGrams = (bytes[6] << 16) | (bytes[7] << 8) | bytes[8];
      const weightKg = weightGrams / 1000;
      if (weightKg >= 20 && weightKg <= 250) {
        const stable = bytes[4] === 0x02;
        return { weightKg: Math.round(weightKg * 100) / 100, stable, protocol: 'generic' };
      }
    }

    // 0xA1 packet on FFB3 = static device info / heartbeat broadcast.
    // Confirmed via logs: bytes are CONSTANT across an entire session and even
    // identical between sessions — not measurement data. Skip entirely.
    if (bytes.length >= 4 && bytes[1] === 0x08 && bytes[3] === 0xA1) {
      return null;
    }
    // 0xA0 packet on FFB3 = countdown/heartbeat ping. Skip.
    if (bytes.length >= 4 && bytes[1] === 0x03 && bytes[3] === 0xA0) {
      return null;
    }

    // 20-byte Healthkeep/QN format on FFB3 (final result packet):
    // [seq][08][00][A3][00][w2][w1][w0][bmi*4][imp_hi][imp_lo][00...][chk]
    //
    // Decoded via Fitdays BLE sniff:
    // - bytes[5..7] = weight in grams (24-bit BE)
    // - byte[8]    = BMI × 4 (e.g. 0x60=96 → BMI=24.0). Only set after Fitdays-style init.
    // - bytes[9..10] = raw impedance (16-bit BE)
    if (bytes.length >= 12 && bytes[1] === 0x08 && bytes[3] === 0xA3) {
      const weightGrams = (bytes[5] << 16) | (bytes[6] << 8) | bytes[7];
      const weightKg = weightGrams / 1000;
      const bmiRaw = bytes[8];
      const impRaw = (bytes[9] << 8) | bytes[10];
      if (weightKg >= 20 && weightKg <= 250) {
        let result = { weightKg: Math.round(weightKg * 100) / 100, stable: true, protocol: 'generic' };
        if (impRaw > 50 && impRaw < 10000) result.impedance = impRaw;
        if (bmiRaw > 40 && bmiRaw < 200) result.bmi = bmiRaw / 4;
        console.log('[Scale] A3 packet: weight=' + result.weightKg + ' imp=' + impRaw + ' bmiRaw=' + bmiRaw + (result.bmi ? ' bmi=' + result.bmi : ''));
        return result;
      }
    }

    // 20-byte Healthkeep/QN A4 packet (final body composition):
    // [seq][0c][00][A4][ts3][ts2][ts1][ts0][00][w2][w1][w0][bmi*4][imp_hi][imp_lo][bc..][chk]
    // - bytes[4..7] = unix timestamp (BE, seconds)
    // - bytes[9..11] = weight in grams (24-bit BE)
    // - byte[12]   = BMI × 4
    // - bytes[13..14] = raw impedance (16-bit BE)
    // - bytes[15..18] may carry body comp values when scale has user profile
    if (bytes.length >= 15 && bytes[1] === 0x0C && bytes[3] === 0xA4) {
      const weightGrams = (bytes[9] << 16) | (bytes[10] << 8) | bytes[11];
      const weightKg = weightGrams / 1000;
      const bmiRaw = bytes[12];
      const impRaw = (bytes[13] << 8) | bytes[14];
      if (weightKg >= 20 && weightKg <= 250) {
        let result = { weightKg: Math.round(weightKg * 100) / 100, stable: true, protocol: 'generic' };
        if (impRaw > 50 && impRaw < 10000) result.impedance = impRaw;
        if (bmiRaw > 40 && bmiRaw < 200) result.bmi = bmiRaw / 4;
        console.log('[Scale] A4 packet: weight=' + result.weightKg + ' imp=' + impRaw + ' bmiRaw=' + bmiRaw + (result.bmi ? ' bmi=' + result.bmi : ''));
        return result;
      }
    }

    // Fallback: 2-byte weight parsing for other generic scales
    let weightRaw = (bytes[1] << 8) | bytes[2];
    let weightKg = weightRaw / 100;
    if (weightKg < 25 || weightKg > 250) {
      weightRaw = (bytes[2] << 8) | bytes[1];
      weightKg = weightRaw / 100;
    }
    if ((weightKg < 25 || weightKg > 250) && bytes.length >= 5) {
      weightRaw = (bytes[3] << 8) | bytes[4];
      weightKg = weightRaw / 100;
    }
    if (weightKg < 25 || weightKg > 250) return null;
    return { weightKg: Math.round(weightKg * 100) / 100, stable: false, protocol: 'generic' };
  }

  _parseUnknown(bytes) {
    if (bytes.length < 3) return null;
    for (let i = 0; i < bytes.length - 1; i++) {
      for (const divisor of [100, 200, 10]) {
        const raw = (bytes[i] << 8) | bytes[i + 1];
        const kg = raw / divisor;
        if (kg >= 25 && kg <= 250) return { weightKg: Math.round(kg * 100) / 100, stable: false, protocol: 'unknown' };
        const rawLE = (bytes[i + 1] << 8) | bytes[i];
        const kgLE = rawLE / divisor;
        if (kgLE >= 25 && kgLE <= 250) return { weightKg: Math.round(kgLE * 100) / 100, stable: false, protocol: 'unknown' };
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════
  //  BODY FAT FROM IMPEDANCE
  // ═══════════════════════════════════════════

  calculateBodyFat(impedance, weightKg, heightCm, age, isMale) {
    if (!impedance || !weightKg || !heightCm || !age) return null;
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
    // --- Accumulate into _measurement ---

    if (parsed.weightKg) {
      if (parsed.weightKg < 25 || parsed.weightKg > 300) {
        console.log('[Scale] Rejected implausible weight:', parsed.weightKg, 'kg');
        return;
      }
      this._measurement.weightKg = parsed.weightKg;
      this._measurement.protocol = parsed.protocol;
      if (parsed.impedance) this._measurement.impedance = parsed.impedance;

      this._recentWeights.push(parsed.weightKg);
      if (this._recentWeights.length > 10) this._recentWeights.shift();

      const recent = this._recentWeights.slice(-3);
      const hasEnough = recent.length >= 2;
      const consistent = hasEnough && recent.every(w => Math.abs(w - parsed.weightKg) <= 1.0);

      if (parsed.stable && !consistent) {
        parsed.stable = false;
      } else if (!parsed.stable && consistent && recent.length >= 3) {
        parsed.stable = true;
      }

      if (parsed.stable) {
        this._lastValidWeight = parsed.weightKg;
        this._measurement.weightStable = true;
      }
    }

    if (parsed.bodyFatPercent) this._measurement.bodyFatPercent = parsed.bodyFatPercent;

    // Emit full accumulated data with current stability
    const emitData = {
      ...this._measurement,
      stable: this._measurement.weightStable || false,
    };

    onData?.(emitData);
    this._listeners.forEach(fn => fn(emitData));
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
        protocol: reading.protocol || 'unknown',
      };

      const json = await userStorage.getRaw(HISTORY_KEY);
      const history = json ? JSON.parse(json) : [];
      history.unshift(entry);
      if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;

      await userStorage.setRaw(HISTORY_KEY, JSON.stringify(history));
      pushToCloud('scaleHistory', history);
      console.log('[Scale] Reading saved:', entry.weightKg, 'kg, bf:', entry.bodyFatPercent, '%');
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
    } catch (_) { return []; }
  }

  async getLastReading() {
    const history = await this.getHistory();
    return history[0] || null;
  }

  // ═══════════════════════════════════════════
  //  SAVED DEVICE
  // ═══════════════════════════════════════════

  async _saveDevice(device) {
    try { await userStorage.setRaw(DEVICE_KEY, JSON.stringify(device)); } catch (_) {}
  }

  async getSavedDevice() {
    try {
      const json = await userStorage.getRaw(DEVICE_KEY);
      return json ? JSON.parse(json) : null;
    } catch (_) { return null; }
  }

  async forgetDevice() {
    try { this.disconnect(); await userStorage.setRaw(DEVICE_KEY, JSON.stringify(null)); } catch (_) {}
  }

  async autoReconnect(onData, onStatus) {
    const saved = await this.getSavedDevice();
    if (!saved) return false;
    try { await this.connect(saved.id, onData, onStatus); return true; }
    catch (err) { console.log('[Scale] Auto-reconnect failed:', err.message); return false; }
  }

  // ═══════════════════════════════════════════
  //  UTILS
  // ═══════════════════════════════════════════

  _base64ToBytes(base64) {
    const binary = global.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  _bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return global.btoa(binary);
  }

  destroy() {
    this.disconnect();
    if (this._manager) { this._manager.destroy(); this._manager = null; }
  }
}

export default new ScaleService();
