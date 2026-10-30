// Orchestration Cozytouch : discovery des pièces pilotables, lecture des
// capacités, écriture des commandes. Ne crée jamais d'appareils : l'utilisateur
// choisit dans l'onglet Découverte.
import { logger } from '@gladysassistant/integration-sdk';
import { MagellanClient } from './api.js';
import { normalizeConfig } from './config.js';
import { buildDevice, buildStates, idsOf, readingFromCaps } from './devices.js';
import { BINARY_MODES, CAPS, DEVICE_TYPE, FEATURES, MODE_LABELS, TIMINGS } from './constants.js';

export class CozytouchApp {
  constructor({ gladys }) {
    this.gladys = gladys;
    this.cfg = normalizeConfig();
    this.client = null;
    this.rooms = new Map(); // room id -> { id, name, hasFan, mode }
    this.watched = new Set(); // external ids des devices créés par l'utilisateur
    this.timer = null;
  }

  async start(rawConfig, { force = false } = {}) {
    this.stop();
    this.cfg = normalizeConfig(rawConfig);
    if (this.cfg.missing.length) {
      await this.setStatus(false, { en: 'Fill in the configuration', fr: 'Complétez la configuration' });
      return;
    }
    this.client = new MagellanClient({ email: this.cfg.email, password: this.cfg.password, logger });
    if (force) this.client.token = null;
    // Les appareils déjà créés par l'utilisateur survivent au redémarrage du
    // conteneur : on re-remplit la liste surveillée depuis Gladys.
    try {
      for (const d of await this.gladys.getDevices()) {
        if (String(d.external_id).includes(`:${DEVICE_TYPE}:`)) this.watched.add(d.external_id);
      }
    } catch (err) {
      logger?.warn?.('getDevices failed', err.message);
    }
    await this.setStatus(true);
    this.schedule();
    this.refreshAll().catch((err) => logger.warn('first refresh failed', err.message));
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  schedule() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.refreshAll().catch((err) => logger.error('Refresh failed', err));
    }, this.cfg.refreshInterval * 1000);
  }

  async setStatus(connected, message) {
    try {
      await this.gladys.setConnectionStatus(connected, message);
    } catch (err) {
      logger?.warn?.('setConnectionStatus failed', err.message);
    }
  }

  async scan() {
    if (!this.client || this.cfg.missing.length) {
      await this.start(await this.gladys.getConfig());
    }
    const rooms = await this.client.discoverRooms({ roomId: this.cfg.roomId });
    if (!rooms.length) throw new Error('no controllable Cozytouch room found (check the room id in the configuration)');
    this.rooms = new Map(rooms.map((r) => [r.id, r]));
    await this.gladys.publishDiscoveredDevices(
      rooms.map((room) =>
        buildDevice(this.gladys, {
          roomId: room.id,
          name: room.name,
          hasFan: room.hasFan,
          hasSwing: room.hasSwing,
          hasTargetCool: room.hasTargetCool,
          binaryModes: room.binaryModes,
          targetRange: room.targetRange,
          language: this.cfg.language,
        }),
      ),
    );
  }

  roomOfDevice(device) {
    const platformId = String(device.external_id).split(':').pop();
    return Number(platformId);
  }

  deviceCreated(device) {
    if (String(device.external_id).includes(`:${DEVICE_TYPE}:`)) this.watched.add(device.external_id);
  }
  deviceDeleted(device) {
    this.watched.delete(device.external_id);
  }

  async refreshAll() {
    if (!this.client || !this.watched.size) return;
    for (const extId of this.watched) {
      const roomId = Number(String(extId).split(':').pop());
      if (!Number.isInteger(roomId)) continue;
      try {
        const reading = readingFromCaps(await this.client.capabilities(roomId), this.cfg.language);
        const known = this.rooms.get(roomId);
        if (known) known.mode = reading.mode;
        else this.rooms.set(roomId, { id: roomId, name: `Cozytouch ${roomId}`, hasFan: reading.hasFan, mode: reading.mode });
        await this.gladys.publishChangedStates(buildStates(this.gladys, roomId, reading, this.cfg.language), {
          heartbeat: TIMINGS.stateHeartbeat,
        });
      } catch (err) {
        logger.warn(`room ${roomId} refresh failed`, err.message);
      }
    }
  }

  async setValue(device, feature, value) {
    if (!this.client) throw new Error('Atlantic not configured');
    const roomId = this.roomOfDevice(device);
    const featureKey = String(feature.external_id).slice(String(device.external_id).length + 1);
    const ids = idsOf(this.gladys, roomId);
    const known = this.rooms.get(roomId) ?? { mode: null };

    if (featureKey === FEATURES.POWER) {
      const on = Number(value) !== 0;
      const targetMode = on ? (known.mode && known.mode !== 0 ? known.mode : 1) : 0;
      await this.client.writeCapability(roomId, CAPS.MODE, targetMode);
      known.mode = targetMode;
      await this.gladys.publishState(ids.feature(FEATURES.POWER), on ? 1 : 0);
      await this.gladys.publishState(ids.feature(FEATURES.MODE), targetMode);
    } else if (featureKey === FEATURES.MODE) {
      const mode = Math.round(Number(value));
      if (!(mode in MODE_LABELS)) throw new Error('unknown mode');
      await this.client.writeCapability(roomId, CAPS.MODE, mode);
      known.mode = mode;
      await this.gladys.publishState(ids.feature(FEATURES.MODE), mode);
      await this.gladys.publishState(ids.feature(FEATURES.POWER), mode === 0 ? 0 : 1);
    } else if (featureKey === FEATURES.TARGET) {
      const t = Number(value);
      if (!Number.isFinite(t)) throw new Error('invalid target');
      const cap = known.mode === 2 ? CAPS.TARGET_COOL : CAPS.TARGET_HEAT;
      await this.client.writeCapability(roomId, cap, t);
      await this.gladys.publishState(ids.feature(FEATURES.TARGET), t);
    } else if (featureKey === FEATURES.SWING) {
      const v = Number(value) !== 0 ? 1 : 0;
      await this.client.writeCapability(roomId, CAPS.SWING, v);
      await this.gladys.publishState(ids.feature(FEATURES.SWING), v);
    } else if (featureKey === FEATURES.FAN) {
      const v = Number(value);
      if (!Number.isInteger(v) || v < 0 || v > 3) throw new Error('fan speed 0..3');
      await this.client.writeCapability(roomId, CAPS.FAN_SPEED, v);
      await this.gladys.publishState(feature.external_id, { text: String(v) });
    } else if (featureKey === FEATURES.TARGET_COOL) {
      const t = Number(value);
      if (!Number.isFinite(t)) throw new Error('invalid target');
      await this.client.writeCapability(roomId, CAPS.TARGET_COOL, t);
      await this.gladys.publishState(ids.feature(FEATURES.TARGET_COOL), t);
    } else {
      const mode = BINARY_MODES.find((m) => m.key === featureKey);
      if (!mode) throw new Error(`unknown feature ${featureKey}`);
      const v = Number(value) !== 0 ? 1 : 0;
      await this.client.writeCapability(roomId, mode.cap, v);
      await this.gladys.publishState(ids.feature(featureKey), v);
    }
    setTimeout(() => this.refreshAll().catch(() => {}), TIMINGS.refreshAfterCommand);
  }

  async testConnection() {
    if (this.cfg.missing.length) throw new Error(`missing configuration: ${this.cfg.missing.join(', ')}`);
    const client = new MagellanClient({ email: this.cfg.email, password: this.cfg.password, logger });
    await client.login();
    const rooms = await client.discoverRooms({ roomId: this.cfg.roomId });
    await this.setStatus(true);
    return {
      message: {
        en: `Connected: ${rooms.length} controllable room(s) found`,
        fr: `Connecté : ${rooms.length} pièce(s) pilotable(s) trouvée(s)`,
      },
    };
  }
}
