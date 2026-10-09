export const defaults = { focus: 25, short: 5, long: 15, muted: false, theme: 'botanical', ambience: 'off', volume: 50 };
export const labels = { focus: 'Focus', short: 'Short break', long: 'Long break' };
export const duration = (settings, mode) => settings[mode] * 60_000;
export function idleTimer(settings, mode = 'focus') {
  return { mode, status: 'idle', remaining: duration(settings, mode), total: duration(settings, mode), deadline: null, sessionId: null, taskId: null };
}
export function initialState() {
  return { settings: { ...defaults }, tasks: [], sessions: [], selectedTaskId: null, cycle: 0, timer: idleTimer(defaults) };
}
export function remaining(timer, now = Date.now()) {
  return timer.status === 'running' ? Math.max(0, timer.deadline - now) : timer.remaining;
}
export function localDay(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function advance(state, now = Date.now()) {
  const t = state.timer;
  if (t.status !== 'running' || t.deadline > now) return state;
  let sessions = state.sessions;
  let cycle = state.cycle;
  if (t.mode === 'focus' && !sessions.some(s => s.id === t.sessionId)) {
    sessions = [...sessions, { id: t.sessionId, taskId: t.taskId, completedAt: t.deadline, minutes: t.total / 60_000 }];
    cycle += 1;
  }
  const next = t.mode === 'focus' ? (cycle % 4 === 0 ? 'long' : 'short') : 'focus';
  return { ...state, sessions, cycle, timer: idleTimer(state.settings, next) };
}
export function reducer(state, action) {
  const now = action.now ?? Date.now();
  state = advance(state, now);
  const t = state.timer;
  switch (action.type) {
    case 'tick': return state;
    case 'start':
      if (t.status === 'running') return state;
      return { ...state, timer: { ...t, status: 'running', deadline: now + t.remaining, sessionId: t.sessionId ?? action.id, taskId: t.status === 'paused' ? t.taskId : state.selectedTaskId } };
    case 'pause':
      return t.status !== 'running' ? state : { ...state, timer: { ...t, status: 'paused', remaining: remaining(t, now), deadline: null } };
    case 'reset': return { ...state, timer: idleTimer(state.settings, t.mode) };
    case 'skip': return { ...state, timer: idleTimer(state.settings, t.mode === 'focus' ? 'short' : 'focus') };
    case 'mode': return { ...state, timer: idleTimer(state.settings, action.mode) };
    case 'settings': return { ...state, settings: action.settings, timer: t.status === 'idle' ? idleTimer(action.settings, t.mode) : t };
    case 'add': return { ...state, tasks: [...state.tasks, { id: action.id, title: action.title, done: false }], selectedTaskId: state.selectedTaskId ?? action.id };
    case 'select': return { ...state, selectedTaskId: action.id };
    case 'rename': return { ...state, tasks: state.tasks.map(task => task.id === action.id ? { ...task, title: action.title } : task) };
    case 'toggle': return { ...state, tasks: state.tasks.map(task => task.id === action.id ? { ...task, done: !task.done } : task), selectedTaskId: state.selectedTaskId === action.id ? null : state.selectedTaskId };
    case 'delete': return { ...state, tasks: state.tasks.filter(task => task.id !== action.id), selectedTaskId: state.selectedTaskId === action.id ? null : state.selectedTaskId };
    default: return state;
  }
}
