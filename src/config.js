// Configuration du manifeste, normalisée.
import { REFRESH_INTERVAL } from './constants.js';

export const DEFAULTS = {
  email: '',
  password: '',
  room_id: 0,
  language: 'fr',
  refresh_interval: REFRESH_INTERVAL.default,
};

/** @returns {{email:string,password:string,roomId:number,language:string,refreshInterval:number,missing:string[]}} */
export function normalizeConfig(raw = {}) {
  const given = Object.fromEntries(
    Object.entries(raw ?? {}).filter(([, v]) => v !== null && v !== undefined),
  );
  const c = { ...DEFAULTS, ...given };
  const email = String(c.email ?? '').trim();
  const password = String(c.password ?? '');
  const roomId = Number(c.room_id) || 0;
  const language = c.language === 'en' ? 'en' : 'fr';
  const interval = Number(c.refresh_interval);
  const missing = [];
  if (email === '') missing.push('email');
  if (password === '') missing.push('password');
  return {
    email,
    password,
    roomId,
    language,
    refreshInterval: Number.isFinite(interval)
      ? Math.max(REFRESH_INTERVAL.min, Math.min(REFRESH_INTERVAL.max, Math.round(interval)))
      : REFRESH_INTERVAL.default,
    missing,
  };
}
