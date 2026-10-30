// Client API Atlantic (Magellan / Cozytouch) — port fidèle du client Python
// éprouvé (Maison/services/clim.py) et du plugin homebridge-atlantic-cozytouch.
// Identifiants publics de l'application Atlantic (Basic Base64), les mêmes
// que l'app officielle Cozytouch.

import { CAPS, TIMINGS } from './constants.js';

export const ATL_BASE = 'https://apis.groupe-atlantic.com';
const GATEWAY_AUTH = 'Basic Q3RfMUpWeVRtSUxYOEllZkE3YVVOQmpGblpVYToyRWNORHpfZHkzNDJVSnFvMlo3cFNKTnZVdjBh';

export class MagellanClient {
  constructor({ email, password, logger } = {}) {
    this.email = email;
    this.password = password;
    this.logger = logger;
    this.token = null;
    this.expiresAt = 0;
    this.authBackoffUntil = 0;
  }

  async login() {
    const form = new URLSearchParams({
      grant_type: 'password',
      username: `GA-PRIVATEPERSON/${this.email}`,
      password: this.password,
      scope: `openid device_${Math.floor(Date.now() / 1000)}`,
    });
    const res = await fetch(`${ATL_BASE}/users/token`, {
      method: 'POST',
      headers: {
        Authorization: GATEWAY_AUTH,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
      signal: AbortSignal.timeout(TIMINGS.httpTimeout),
    });
    if (!res.ok) throw new Error(`atlantic login http ${res.status}`);
    const j = await res.json();
    this.token = j.access_token;
    this.expiresAt = Date.now() + (Number(j.expires_in ?? 21600) * 1000 - TIMINGS.tokenMargin);
    return this.token;
  }

  async token_() {
    if (!this.token || Date.now() > this.expiresAt) await this.login();
    return this.token;
  }

  async api(path, { method = 'GET', body } = {}, retry = true) {
    const res = await fetch(`${ATL_BASE}/magellan${path}`, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${await this.token_()}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(TIMINGS.httpTimeout),
    });
    if ((res.status === 401 || res.status === 403) && retry) {
      this.token = null;
      return this.api(path, { method, body }, false);
    }
    if (!res.ok) throw new Error(`atlantic ${path} http ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  capabilities(deviceId) {
    return this.api(`/capabilities/?deviceId=${deviceId}`);
  }

  setupview() {
    return this.api('/cozytouch/setupviewv2');
  }

  writeCapability(deviceId, capabilityId, value) {
    return this.api('/executions/writecapability', {
      method: 'POST',
      body: { deviceId: Number(deviceId), capabilityId: Number(capabilityId), value: String(value) },
    });
  }

  /**
   * Rooms pilotables (cap 7 = mode HVAC présent). Candidates : id numériques
   * de la setupview, ou config room_id. Jamais plus de 12 sondes.
   */
  async discoverRooms({ roomId } = {}) {
    const candidates = [];
    if (roomId) candidates.push({ id: Number(roomId), name: null });
    else {
      try {
        const view = await this.setupview();
        const seen = new Set();
        const walk = (node) => {
          if (candidates.length >= 12 || !node || typeof node !== 'object') return;
          if (Array.isArray(node)) return node.forEach(walk);
          const id = node.id ?? node.deviceId ?? node.roomId;
          const name = node.name ?? node.roomName ?? node.label;
          if (Number.isInteger(id) && id > 0 && typeof name === 'string' && name && !seen.has(id)) {
            seen.add(id);
            candidates.push({ id, name });
          }
          Object.values(node).forEach(walk);
        };
        walk(view);
      } catch {
        // setupview injoignable : la config room_id fait foi.
      }
    }
    const rooms = [];
    for (const candidate of candidates.slice(0, 12)) {
      try {
        const caps = await this.capabilities(candidate.id);
        const byId = new Map((caps ?? []).map((c) => [Number(c.capabilityId), c]));
        if (byId.has(CAPS.MODE)) {
          const nameCap = byId.get(CAPS.ROOM_NAME);
          const num = (cap) => Number(byId.get(cap)?.value);
          const tmin = num(CAPS.TARGET_MIN);
          const tmax = num(CAPS.TARGET_MAX);
          const tstep = num(CAPS.TARGET_STEP);
          rooms.push({
            id: candidate.id,
            name: (nameCap && String(nameCap.value).trim()) || candidate.name || `Cozytouch ${candidate.id}`,
            hasFan: byId.has(CAPS.FAN_SPEED),
            hasSwing: byId.has(CAPS.SWING),
            targetRange:
              Number.isFinite(tmin) && Number.isFinite(tmax) && tmax > tmin
                ? { min: tmin, max: tmax, step: Number.isFinite(tstep) && tstep > 0 ? tstep : 0.5 }
                : null,
          });
        }
      } catch {
        // id sans capacités : pas un équipement pilotable.
      }
    }
    return rooms;
  }
}
