// Clés du manifeste + capacités Magellan (mapping vérifié contre l'API,
// idem homebridge-atlantic-cozytouch).

export const ACTIONS = { TEST: 'test_connection' };

export const REFRESH_INTERVAL = { min: 60, max: 3600, default: 120 };

/** Type de device des ids externes : ext:<selector>:ac:<room_id>. */
export const DEVICE_TYPE = 'ac';

export const FEATURES = {
  POWER: 'power',
  MODE: 'mode',
  TARGET: 'target',
  ROOM: 'room',
  STATUS: 'status',
  FAN: 'fan',
};

/** Capacités Magellan d'une pièce Takao. */
export const CAPS = {
  MODE: 7, // 0=off 1=heat 2=cool 3=auto(heat_cool) 4=fan
  TARGET_HEAT: 40,
  TARGET_COOL: 177,
  CURRENT_TEMP: 117,
  ROOM_NAME: 154,
  FAN_SPEED: 100800, // 0=auto 1=low 2=med 3=high
};

export const MODE_LABELS = {
  0: { fr: 'Arrêt', en: 'Off' },
  1: { fr: 'Chauffage', en: 'Heating' },
  2: { fr: 'Climatisation', en: 'Cooling' },
  3: { fr: 'Auto', en: 'Auto' },
  4: { fr: 'Ventilation', en: 'Fan' },
};

export const FAN_LABELS = {
  0: { fr: 'Auto', en: 'Auto' },
  1: { fr: 'Faible', en: 'Low' },
  2: { fr: 'Moyen', en: 'Medium' },
  3: { fr: 'Fort', en: 'High' },
};

export const TARGET_RANGE = { min: 10, max: 30, step: 0.5 };

export const LIMITS = { statusText: 200 };

export const TIMINGS = {
  httpTimeout: 20_000,
  refreshAfterCommand: 5_000,
  authRetry: 15 * 60_000,
  stateHeartbeat: 30 * 60_000,
  tokenMargin: 300_000,
};
