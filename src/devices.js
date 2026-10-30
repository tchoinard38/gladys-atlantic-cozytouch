// L'appareil Gladys d'une pièce Cozytouch et ses états (pur).
// Mapping même que le plugin HomeKit Atlantic : un thermostat reversible.
import {
  DEVICE_FEATURE_CATEGORIES as C,
  DEVICE_FEATURE_TYPES as T,
  DEVICE_FEATURE_UNITS as U,
} from '@gladysassistant/integration-sdk';
import {
  CAPS,
  DEVICE_TYPE,
  FEATURES,
  FAN_LABELS,
  LIMITS,
  MODE_LABELS,
  TARGET_RANGE,
} from './constants.js';

export const idsOf = (gladys, roomId) =>
  gladys.externalIds(DEVICE_TYPE, String(roomId).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') || 'unknown');

const sensor = (feature) => ({ read_only: true, has_feedback: false, keep_history: true, ...feature });
const command = (feature) => ({ read_only: false, has_feedback: true, keep_history: true, ...feature });

export function buildDevice(gladys, { roomId, name, language, hasFan }) {
  const ids = idsOf(gladys, roomId);
  const named = (key, feature) => ({
    name: { fr: FR_FEATURES[key], en: EN_FEATURES[key] }[language],
    external_id: ids.feature(key),
    ...feature,
  });
  const modeOption = (value) => ({
    value,
    label: MODE_LABELS[value][language],
    sort_order: value,
  });
  const features = [
    named(FEATURES.POWER, command({ category: C.AIR_CONDITIONING, type: T.AIR_CONDITIONING.BINARY, min: 0, max: 1 })),
    named(
      FEATURES.MODE,
      command({
        category: C.AIR_CONDITIONING,
        type: T.AIR_CONDITIONING.MODE,
        min: 0,
        max: 4,
        supported_options: [0, 1, 2, 3, 4].map(modeOption),
      }),
    ),
    named(
      FEATURES.TARGET,
      command({
        category: C.AIR_CONDITIONING,
        type: T.AIR_CONDITIONING.TARGET_TEMPERATURE,
        unit: U.CELSIUS,
        min: TARGET_RANGE.min,
        max: TARGET_RANGE.max,
        step: TARGET_RANGE.step,
      }),
    ),
    named(FEATURES.ROOM, sensor({ category: C.TEMPERATURE_SENSOR, type: T.SENSOR.DECIMAL, unit: U.CELSIUS, min: -30, max: 100 })),
    named(FEATURES.STATUS, sensor({ category: C.TEXT, type: T.TEXT.TEXT, keep_history: false, min: 0, max: 0 })),
  ];
  if (hasFan) {
    features.push(
      named(
        FEATURES.FAN,
        command({
          category: C.TEXT,
          type: T.TEXT.SELECT,
          keep_history: false,
          min: 0,
          max: 0,
          supported_options: [0, 1, 2, 3].map((v) => ({
            value: String(v),
            label: FAN_LABELS[v][language],
            sort_order: v,
          })),
        }),
      ),
    );
  }
  return {
    name: String(name || `Cozytouch ${roomId}`).slice(0, LIMITS.statusText),
    external_id: ids.device,
    should_poll: false,
    features,
  };
}

const FR_FEATURES = {
  power: 'Marche / arrêt',
  mode: 'Mode',
  target: 'Température de consigne',
  room: 'Température ambiante',
  status: 'État',
  fan: 'Vitesse de ventilation',
};
const EN_FEATURES = {
  power: 'On/Off',
  mode: 'Mode',
  target: 'Target temperature',
  room: 'Room temperature',
  status: 'State',
  fan: 'Fan speed',
};

/** Caps Magellan -> valeurs normalisées. */
export function readingFromCaps(capsList, language) {
  const caps = new Map((capsList ?? []).map((c) => [Number(c.capabilityId), String(c.value).trim()]));
  const mode = caps.has(CAPS.MODE) ? Number(caps.get(CAPS.MODE)) : null;
  const targetCap = mode === 2 ? CAPS.TARGET_COOL : CAPS.TARGET_HEAT;
  const altCap = mode === 2 ? CAPS.TARGET_HEAT : CAPS.TARGET_COOL;
  const target = caps.has(targetCap) ? Number(caps.get(targetCap)) : caps.has(altCap) ? Number(caps.get(altCap)) : null;
  const room = caps.has(CAPS.CURRENT_TEMP) ? Number(caps.get(CAPS.CURRENT_TEMP)) : null;
  const fan = caps.has(CAPS.FAN_SPEED) ? Number(caps.get(CAPS.FAN_SPEED)) : null;
  const status = mode === null ? null : (MODE_LABELS[mode]?.[language] ?? `${mode}`);
  return { mode, target, room, fan, status, hasFan: caps.has(CAPS.FAN_SPEED) };
}

export function buildStates(gladys, roomId, reading, language) {
  const ids = idsOf(gladys, roomId);
  const states = [];
  const push = (key, state) => {
    if (state !== null && state !== undefined && Number.isFinite(Number(state))) {
      states.push({ device_feature_external_id: ids.feature(key), state: Number(state) });
    }
  };
  if (reading.mode !== null) push(FEATURES.POWER, reading.mode === 0 ? 0 : 1);
  push(FEATURES.MODE, reading.mode);
  push(FEATURES.TARGET, reading.target);
  push(FEATURES.ROOM, reading.room);
  if (reading.status) {
    states.push({ device_feature_external_id: ids.feature(FEATURES.STATUS), text: reading.status });
  }
  if (reading.fan !== null) {
    states.push({ device_feature_external_id: ids.feature(FEATURES.FAN), text: String(reading.fan) });
  }
  return states;
}
