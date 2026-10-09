import { initialState, advance, defaults } from './timer.js';
export const STORAGE_KEY = 'little-study:v1';
const modes = ['focus', 'short', 'long'];
const number = n => typeof n === 'number' && Number.isFinite(n);
const id = value => value === null || typeof value === 'string';
export function validState(s) {
  return s && s.settings && modes.every(m => number(s.settings[m]) && s.settings[m] >= 1 && s.settings[m] <= 180)
    && typeof s.settings.muted === 'boolean'
    && (typeof s.settings.theme === 'string' || s.settings.theme === undefined)
    && (typeof s.settings.ambience === 'string' || s.settings.ambience === undefined)
    && (typeof s.settings.volume === 'number' || s.settings.volume === undefined)
    && Number.isInteger(s.cycle) && s.cycle >= 0 && id(s.selectedTaskId)
    && Array.isArray(s.tasks) && s.tasks.every(t => typeof t.id === 'string' && typeof t.title === 'string' && typeof t.done === 'boolean')
    && Array.isArray(s.sessions) && s.sessions.every(t => typeof t.id === 'string' && id(t.taskId) && number(t.completedAt) && number(t.minutes) && t.minutes > 0)
    && s.timer && modes.includes(s.timer.mode) && ['idle', 'paused', 'running'].includes(s.timer.status)
    && number(s.timer.remaining) && s.timer.remaining >= 0 && number(s.timer.total) && s.timer.total > 0
    && id(s.timer.taskId) && id(s.timer.sessionId)
    && (s.timer.status !== 'running' || (number(s.timer.deadline) && typeof s.timer.sessionId === 'string'));
}
// Replace this adapter with account storage when sync is introduced.
export function createBrowserStorage(getStorage = () => window.localStorage) {
  return {
    load(now = Date.now()) {
      try {
        const raw = getStorage().getItem(STORAGE_KEY);
        if (!raw) return { state: initialState(), notice: '' };
        const saved = JSON.parse(raw);
        if (saved.version !== 1 || !validState(saved.state)) throw new Error('Invalid saved data');
        saved.state.settings = { ...defaults, ...saved.state.settings };
        return { state: advance(saved.state, now), notice: '' };
      } catch {
        return { state: initialState(), notice: 'Saved data could not be loaded. You can still use this study space.' };
      }
    },
    save(state) {
      try { getStorage().setItem(STORAGE_KEY, JSON.stringify({ version: 1, state })); return true; }
      catch { return false; }
    },
  };
}
