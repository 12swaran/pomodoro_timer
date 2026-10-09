import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reducer, advance, remaining, localDay, startOfLocalDay, addDays } from '../src/timer.js';
import { createBrowserStorage, STORAGE_KEY } from '../src/storage.js';
const start = (s, now = 1000, id = 's1') => reducer(s, { type: 'start', now, id });
test('deadline countdown, pause, and resume preserve remaining time', () => {
  let s = start(initialState());
  assert.equal(remaining(s.timer, 61000), 24 * 60000);
  s = reducer(s, { type: 'pause', now: 61000 });
  assert.equal(remaining(s.timer, 900000), 24 * 60000);
  s = start(s, 100000, 'unused');
  assert.equal(s.timer.deadline, 1540000);
  assert.equal(s.timer.sessionId, 's1');
});
test('completed focus prepares an idle short break and records once', () => {
  const s = start(initialState());
  const done = advance(s, s.timer.deadline + 40000);
  assert.equal(done.sessions.length, 1);
  assert.equal(done.sessions[0].completedAt, s.timer.deadline);
  assert.equal(done.timer.mode, 'short');
  assert.equal(done.timer.status, 'idle');
  assert.equal(advance(done, 99999999).sessions.length, 1);
});
test('fourth completed focus prepares a long break; break completion returns to focus', () => {
  let s = initialState();
  s.cycle = 3;
  s = start(s);
  s = advance(s, s.timer.deadline);
  assert.equal(s.timer.mode, 'long');
  s = start(s, 2000000, 'break');
  s = advance(s, s.timer.deadline);
  assert.equal(s.timer.mode, 'focus');
  assert.equal(s.sessions.length, 1);
  assert.equal(s.cycle, 4);
});
test('reset and skip do not credit sessions or increment cycle', () => {
  for (const type of ['reset', 'skip']) {
    const s = reducer(start(initialState()), { type, now: 2000 });
    assert.equal(s.sessions.length, 0);
    assert.equal(s.cycle, 0);
    assert.equal(s.timer.status, 'idle');
  }
});
test('session retains original task through selection changes and pause/resume', () => {
  let s = reducer(initialState(), { type: 'add', id: 'a', title: 'Read' });
  s = reducer(s, { type: 'add', id: 'b', title: 'Write' });
  s = start(s);
  s = reducer(s, { type: 'select', id: 'b', now: 2000 });
  s = reducer(s, { type: 'pause', now: 3000 });
  s = start(s, 5000);
  s = advance(s, s.timer.deadline);
  assert.equal(s.sessions[0].taskId, 'a');
  assert.equal(s.selectedTaskId, 'b');
  assert.equal(s.tasks[0].done, false);
});
test('sessions without tasks work and deleting a task preserves session history', () => {
  let s = start(initialState());
  s = advance(s, s.timer.deadline);
  assert.equal(s.sessions[0].taskId, null);
  s = reducer(s, { type: 'add', id: 'a', title: 'Read' });
  s = reducer(s, { type: 'delete', id: 'a' });
  assert.equal(s.tasks.length, 0);
  assert.equal(s.selectedTaskId, null);
  assert.equal(s.sessions.length, 1);
});
test('rename and completion are independent of timer completion', () => {
  let s = reducer(initialState(), { type: 'add', id: 'a', title: 'Read' });
  s = reducer(s, { type: 'rename', id: 'a', title: 'Read chapter 2' });
  s = reducer(s, { type: 'toggle', id: 'a' });
  assert.equal(s.tasks[0].title, 'Read chapter 2');
  assert.equal(s.tasks[0].done, true);
  assert.equal(s.selectedTaskId, null);
});
test('settings changes preserve current running and paused sessions', () => {
  let s = start(initialState());
  s = reducer(s, { type: 'settings', settings: { ...s.settings, focus: 10, short: 3 }, now: 2000 });
  assert.equal(s.timer.total, 25 * 60000);
  s = reducer(s, { type: 'pause', now: 3000 });
  s = reducer(s, { type: 'settings', settings: { ...s.settings, focus: 12 } });
  assert.equal(s.timer.total, 25 * 60000);
  s = start(s, 5000);
  s = advance(s, s.timer.deadline);
  assert.equal(s.timer.total, 3 * 60000);
  assert.equal(s.sessions[0].minutes, 25);
});
test('midnight progress is attributed to actual local completion date', () => {
  const startDate = new Date(2026, 9, 9, 23, 50).getTime();
  const s = start(initialState(), startDate);
  const done = advance(s, s.timer.deadline + 86400000);
  assert.equal(localDay(startDate), '2026-10-09');
  assert.equal(localDay(done.sessions[0].completedAt), '2026-10-10');
});
function memory() { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }; }
test('storage restores running sessions, settles expired sessions, and does not double count', () => {
  const store = createBrowserStorage(() => memoryStore);
  const memoryStore = memory();
  const s = start(initialState());
  assert.equal(store.save(s), true);
  assert.equal(store.load(5000).state.timer.deadline, s.timer.deadline);
  const restored = store.load(s.timer.deadline + 3000);
  assert.equal(restored.state.sessions.length, 1);
  assert.equal(store.save(restored.state), true);
  assert.equal(store.load(s.timer.deadline + 4000).state.sessions.length, 1);
});
test('storage preserves paused state and tasks', () => {
  const mem = memory(); const store = createBrowserStorage(() => mem);
  let s = reducer(initialState(), { type: 'add', id: 'a', title: 'Sketch' });
  s = reducer(start(s), { type: 'pause', now: 2000 });
  store.save(s);
  assert.deepEqual(store.load(99999999).state, s);
});
test('unavailable storage and malformed saved data recover safely', () => {
  const blocked = createBrowserStorage(() => { throw new Error('Blocked'); });
  assert.equal(blocked.save(initialState()), false);
  assert.ok(blocked.load().notice);
  const mem = memory(); const store = createBrowserStorage(() => mem);
  mem.setItem(STORAGE_KEY, '{bad json');
  assert.equal(store.load().state.timer.status, 'idle');
  mem.setItem(STORAGE_KEY, JSON.stringify({ version: 1, state: { ...initialState(), timer: { mode: 'oops' } } }));
  assert.ok(store.load().notice);
});
test('startOfLocalDay returns midnight local time', () => {
  const d = new Date(2026, 1, 15, 14, 30, 45); // Feb 15, 2026, 14:30:45
  const start = new Date(startOfLocalDay(d.getTime()));
  assert.equal(start.getHours(), 0);
  assert.equal(start.getMinutes(), 0);
  assert.equal(start.getSeconds(), 0);
  assert.equal(start.getDate(), 15);
});
test('addDays adds positive and negative days correctly', () => {
  const d = new Date(2026, 0, 1, 10, 0, 0).getTime(); // Jan 1, 2026
  const nextWeek = addDays(d, 7);
  const lastWeek = addDays(d, -7);
  assert.equal(new Date(nextWeek).getDate(), 8);
  assert.equal(new Date(lastWeek).getDate(), 25);
  assert.equal(new Date(lastWeek).getMonth(), 11); // December previous year
});
