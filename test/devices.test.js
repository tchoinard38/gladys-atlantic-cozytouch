import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeConfig } from '../src/config.js';
import { readingFromCaps, buildStates } from '../src/devices.js';
import { CAPS } from '../src/constants.js';

const gladys = {
  externalIds: (type, platformId) => ({
    device: `ext:sel:${type}:${platformId}`,
    feature: (key) => `ext:sel:${type}:${platformId}:${key}`,
  }),
};

// Fixture relevée sur le vrai compte (pièce Salon, Takao M3).
const salonCaps = [
  { capabilityId: CAPS.MODE, value: '0' },
  { capabilityId: CAPS.CURRENT_TEMP, value: '20.0000000000000000000' },
  { capabilityId: CAPS.TARGET_HEAT, value: '23.5' },
  { capabilityId: CAPS.TARGET_COOL, value: '22.5' },
  { capabilityId: CAPS.FAN_SPEED, value: '2' },
  { capabilityId: CAPS.ROOM_NAME, value: 'Salon' },
];

test('normalizeConfig exige email + mot de passe', () => {
  assert.deepEqual(normalizeConfig({}).missing, ['email', 'password']);
});

test('lecture des capacités : consigne chaud par défaut', () => {
  const r = readingFromCaps(salonCaps, 'fr');
  assert.equal(r.mode, 0);
  assert.equal(r.target, 23.5);
  assert.equal(r.room, 20);
  assert.equal(r.fan, 2);
  assert.equal(r.status, 'Arrêt');
  const states = buildStates(gladys, 27346691, r, 'fr');
  const byId = Object.fromEntries(states.map((s) => [s.device_feature_external_id.split(':').pop(), s.state ?? s.text]));
  assert.equal(byId.power, 0);
  assert.equal(byId.target, 23.5);
  assert.equal(byId.status, 'Arrêt');
  assert.equal(byId.fan, '2');
});

test('mode clim : la consigne froide devient la cible', () => {
  const r = readingFromCaps(
    salonCaps.map((c) => (c.capabilityId === CAPS.MODE ? { ...c, value: '2' } : c)),
    'fr',
  );
  assert.equal(r.target, 22.5);
  assert.equal(r.status, 'Climatisation');
});

test('fan absent => pas de feature ventilation dans l’état', () => {
  const r = readingFromCaps(salonCaps.filter((c) => c.capabilityId !== CAPS.FAN_SPEED), 'fr');
  assert.equal(r.fan, null);
  assert.equal(r.hasFan, false);
});
