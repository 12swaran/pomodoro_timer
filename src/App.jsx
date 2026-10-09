import React, { useEffect, useReducer, useRef, useState } from 'react';
import { BookOpen, GearSix, Play, Pause, ArrowCounterClockwise, SkipForward, Plus, Check, PencilSimple, Trash, X, SpeakerHigh, SpeakerSlash, Leaf, Coffee, CheckCircle, Circle } from '@phosphor-icons/react';
import { defaults, labels, localDay, reducer, remaining } from './timer.js';
import { createBrowserStorage } from './storage.js';

const storage = createBrowserStorage();
const uid = () => crypto.randomUUID();
function DeskArt() {
  return <svg className="desk-art" viewBox="0 0 420 210" role="img" aria-label="A little wooden desk with a plant, books, and a warm cup of tea">
    <ellipse cx="210" cy="188" rx="182" ry="11" fill="#ddd9c5" opacity=".5"/>
    <path d="M46 174H379" stroke="#ae8b62" strokeWidth="9" strokeLinecap="round"/>
    <path d="M69 179v16m287-16v16" stroke="#ae8b62" strokeWidth="7"/>
    <rect x="88" y="155" width="97" height="15" rx="3" fill="#d1a17f"/><path d="M99 159h73m-73 6h73" stroke="#f3e8d3" strokeWidth="2"/>
    <rect x="97" y="139" width="81" height="15" rx="3" fill="#869077"/><path d="M108 144h58m-58 5h58" stroke="#eee9d7" strokeWidth="2"/>
    <path d="M143 137q-9-20-33-29" stroke="#9c7752" strokeWidth="3" fill="none"/><ellipse cx="109" cy="106" rx="17" ry="10" transform="rotate(25 109 106)" fill="#b4bea0"/>
    <path d="M274 126h39l-6 43h-27z" fill="#cf9b7b"/><path d="M272 127h43" stroke="#b98265" strokeWidth="5" strokeLinecap="round"/>
    <path d="M292 124q-1-34 7-74m-6 56-20-24m24 4 22-20" fill="none" stroke="#708369" strokeWidth="3" strokeLinecap="round"/>
    <ellipse cx="274" cy="84" rx="12" ry="23" transform="rotate(-43 274 84)" fill="#8f9e7a"/><ellipse cx="315" cy="66" rx="12" ry="22" transform="rotate(43 315 66)" fill="#a7b293"/>
    <ellipse cx="300" cy="49" rx="11" ry="21" transform="rotate(8 300 49)" fill="#718568"/>
    <path d="M217 141h31v18q0 11-15 11t-16-11z" fill="#e8dcbf"/><path d="M248 146h5q12 9-5 15" stroke="#d3c2a0" strokeWidth="4" fill="none"/><ellipse cx="233" cy="141" rx="15" ry="4" fill="#a98563"/>
    <path className="tea-steam" d="M230 128q-6-8 0-16m9 13q-6-8 0-16" stroke="#c6bea9" strokeWidth="2" fill="none" strokeLinecap="round"/>
    <path d="m75 63 2-6 2 6 6 2-6 2-2 6-2-6-6-2zM343 113l2-5 2 5 5 2-5 2-2 5-2-5-5-2z" fill="#cfb98c"/>
  </svg>;
}

function Settings({ settings, onSave, onClose }) {
  const dialog = useRef(null);
  const [draft, setDraft] = useState(settings);
  useEffect(() => { dialog.current.showModal(); }, []);
  return <dialog ref={dialog} className="settings-dialog" aria-labelledby="settings-heading" onClose={onClose} onClick={e => { if (e.target === dialog.current) onClose(); }}>
    <form onSubmit={e => { e.preventDefault(); onSave({ ...draft, focus: Number(draft.focus), short: Number(draft.short), long: Number(draft.long) }); }}>
      <div className="dialog-top"><h2 id="settings-heading">Your rhythm</h2><button type="button" className="icon-button" aria-label="Close settings" onClick={onClose}><X size={21}/></button></div>
      <p>A little structure, at your own pace.</p>
      <div className="duration-fields">{Object.keys(labels).map(mode => <label key={mode}>{labels[mode]}<span><input type="number" min="1" max="180" step="1" required value={draft[mode]} onChange={e => setDraft({ ...draft, [mode]: e.target.value })}/> min</span></label>)}</div>
      <label className="sound-setting"><span><SpeakerHigh size={22}/> Play a gentle completion chime</span><input type="checkbox" checked={!draft.muted} onChange={e => setDraft({ ...draft, muted: !e.target.checked })}/></label>
      <p className="settings-note">Changes apply to the next session. Each phase starts when you’re ready.</p>
      <button className="primary-button" type="submit">Save settings</button>
    </form>
  </dialog>;
}

export default function App() {
  const [loaded] = useState(() => storage.load());
  const [state, dispatch] = useReducer(reducer, loaded.state);
  const [notice, setNotice] = useState(loaded.notice);
  const [now, setNow] = useState(Date.now());
  const [showSettings, setShowSettings] = useState(false);
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const audio = useRef(null);
  const previous = useRef(state);

  useEffect(() => {
    if (!storage.save(state)) setNotice('Browser saving is unavailable. Your changes will last until this page closes.');
  }, [state]);
  useEffect(() => {
    function tick() { const time = Date.now(); setNow(time); dispatch({ type: 'tick', now: time }); }
    const interval = setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick); };
  }, []);
  useEffect(() => {
    const old = previous.current;
    if (old.timer.status === 'running' && old.timer.deadline <= Date.now() && old.timer.sessionId !== state.timer.sessionId) {
      setAnnouncement(`${labels[old.timer.mode]} complete. ${labels[state.timer.mode]} is ready when you are.`);
      if (!state.settings.muted && audio.current?.state === 'running') {
        const ctx = audio.current;
        [523.25, 659.25, 783.99].forEach((frequency, i) => {
          const oscillator = ctx.createOscillator(); const gain = ctx.createGain(); const start = ctx.currentTime + i * .18;
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.08, start + .025); gain.gain.exponentialRampToValueAtTime(.001, start + .8);
          oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(start); oscillator.stop(start + .85);
        });
      }
    }
    previous.current = state;
  }, [state]);

  function start() {
    try { const AudioContext = window.AudioContext || window.webkitAudioContext; if (!audio.current && AudioContext) audio.current = new AudioContext(); audio.current?.resume().catch(() => {}); } catch { /* The timer still works without audio. */ }
    setNow(Date.now()); dispatch({ type: 'start', id: uid() }); setAnnouncement(`${labels[state.timer.mode]} started.`);
  }
  function saveRename(id) { if (editTitle.trim()) dispatch({ type: 'rename', id, title: editTitle.trim() }); setEditing(null); }
  const t = state.timer;
  const left = remaining(t, now);
  const seconds = Math.ceil(left / 1000);
  const timeText = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const today = state.sessions.filter(s => localDay(s.completedAt) === localDay(now));
  const minutes = Math.round(today.reduce((sum, s) => sum + s.minutes, 0));
  const focusedTask = state.tasks.find(task => task.id === (t.status === 'idle' ? state.selectedTaskId : t.taskId));
  const completed = state.tasks.filter(task => task.done).length;
  useEffect(() => { document.title = t.status === 'running' ? `${timeText} · ${labels[t.mode]} · Little Study` : 'Little Study · One thing at a time'; }, [timeText, t.status, t.mode]);

  return <div className="study-page">
    <header className="site-header"><a className="brand" href="/" aria-label="Little Study home"><span className="brand-mark"><BookOpen weight="duotone" size={25}/></span>little study<span className="brand-period">.</span></a><div className="header-right"><span className="header-note">a little space for good work</span><button className="settings-button" aria-label="Settings" onClick={() => setShowSettings(true)}><GearSix size={20}/><span>Settings</span></button></div></header>
    <main>
      <div className="intro"><span className="eyebrow"><Leaf size={15}/> SETTLE IN, SLOW DOWN</span><h1>One thing at a time.</h1><p>Make yourself comfortable. A little focus goes a long way.</p></div>
      {notice && <p className="storage-notice" role="status">{notice}</p>}
      <div className="workspace">
        <section className={`timer-panel mode-${t.mode}`} aria-label="Pomodoro timer">
          <div className="mode-tabs" role="group" aria-label="Timer phase">{Object.entries(labels).map(([mode, label]) => <button key={mode} aria-pressed={t.mode === mode} disabled={t.status !== 'idle' && mode !== t.mode} onClick={() => { dispatch({ type: 'mode', mode }); setAnnouncement(`${label} ready.`); }}>{label}</button>)}</div>
          <div className="timer-content">
            <span className="phase-caption">{t.mode === 'focus' ? 'TIME TO FIND YOUR FLOW' : 'A LITTLE ROOM TO BREATHE'}</span>
            <div className="time-display" role="timer" aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`}>{timeText}</div>
            <p className="timer-message">{t.status === 'paused' ? 'Take your time. Your place is saved.' : t.mode === 'focus' ? 'Just you, your task, and a fresh start.' : 'Stretch, sip, and let your mind wander.'}</p>
            <div className="timer-controls"><button className="icon-button" title="Reset current phase" aria-label="Reset current phase" onClick={() => { dispatch({ type: 'reset' }); setAnnouncement('Timer reset.'); }}><ArrowCounterClockwise size={24}/></button><button className="primary-button start-button" onClick={t.status === 'running' ? () => { dispatch({ type: 'pause' }); setAnnouncement('Timer paused.'); } : start}>{t.status === 'running' ? <Pause size={20} weight="fill"/> : <Play size={20} weight="fill"/>}{t.status === 'running' ? 'Pause' : t.status === 'paused' ? 'Resume' : t.mode === 'focus' ? 'Start focusing' : 'Start break'}</button><button className="icon-button" title="Skip current phase" aria-label="Skip current phase" onClick={() => { dispatch({ type: 'skip' }); setAnnouncement('Phase skipped. The next phase is ready.'); }}><SkipForward size={24}/></button></div>
            <div className="cycle-indicator" aria-label={`${state.cycle % 4} of 4 sessions toward a long break`}>{[0,1,2,3].map(i => <span key={i} className={i < state.cycle % 4 ? 'filled' : ''}><Leaf size={17} weight={i < state.cycle % 4 ? 'fill' : 'regular'}/></span>)}<span className="cycle-label">a longer rest after 4 sessions</span></div>
          </div>
          <div className="timer-bottom"><span className="focus-label"><span className="status-dot"/>{focusedTask ? <><span className="focus-prefix">{t.mode === 'focus' ? 'Focusing on' : 'Taking a break from'}</span><strong>{focusedTask.title}</strong></> : <span>No task selected. That’s okay, too.</span>}</span><button className="icon-button" aria-label={state.settings.muted ? 'Unmute completion chime' : 'Mute completion chime'} onClick={() => dispatch({ type: 'settings', settings: { ...state.settings, muted: !state.settings.muted } })}>{state.settings.muted ? <SpeakerSlash size={19}/> : <SpeakerHigh size={19}/>}</button></div>
        </section>

        <section className="tasks-panel" aria-labelledby="tasks-heading"><div className="tasks-heading"><div><span className="eyebrow">A SMALL, DOABLE LIST</span><h2 id="tasks-heading">On your desk</h2></div><span className="task-count">{completed}/{state.tasks.length}</span></div><p className="task-help">What would you like to make room for?</p>
          <form className="add-task" onSubmit={e => { e.preventDefault(); if (title.trim()) { dispatch({ type: 'add', id: uid(), title: title.trim() }); setTitle(''); } }}><input aria-label="New task" placeholder="Add a little task…" value={title} maxLength={160} onChange={e => setTitle(e.target.value)}/><button type="submit" aria-label="Add task" disabled={!title.trim()}><Plus size={21}/></button></form>
          <div className="task-list">{state.tasks.length === 0 ? <div className="empty-tasks"><BookOpen size={34} weight="duotone"/><p>A clear desk, a fresh start.</p><span>Add your first task above.</span></div> : state.tasks.map(task => <div key={task.id} className={`task-row ${task.done ? 'done' : ''} ${state.selectedTaskId === task.id ? 'selected' : ''}`}>
            <button className="check-task" aria-label={`${task.done ? 'Reopen' : 'Complete'} ${task.title}`} onClick={() => dispatch({ type: 'toggle', id: task.id })}>{task.done ? <CheckCircle size={23} weight="fill"/> : <Circle size={23}/>}</button>
            <div className="task-info">{editing === task.id ? <form onSubmit={e => { e.preventDefault(); saveRename(task.id); }}><input className="rename-input" aria-label="Rename task" autoFocus maxLength={160} value={editTitle} onChange={e => setEditTitle(e.target.value)} onBlur={() => saveRename(task.id)} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); setEditing(null); } }}/></form> : <button className="task-title" disabled={task.done} aria-pressed={state.selectedTaskId === task.id} onClick={() => dispatch({ type: 'select', id: state.selectedTaskId === task.id ? null : task.id })}>{task.title}</button>}<span className="task-meta">{state.sessions.filter(s => s.taskId === task.id).length} pomodoros{state.selectedTaskId === task.id && !task.done && <span className="selected-label"> · up next</span>}</span></div>
            <div className="task-actions"><button className="icon-button" aria-label={`Rename ${task.title}`} onClick={() => { setEditing(task.id); setEditTitle(task.title); }}><PencilSimple size={16}/></button><button className="icon-button" aria-label={`Delete ${task.title}`} onClick={() => dispatch({ type: 'delete', id: task.id })}><Trash size={16}/></button></div>
          </div>)}</div>
          <div className="desk-corner"><DeskArt/><p>No rush. You’re growing at your own pace.</p></div>
        </section>
      </div>
      <section className="daily-progress" aria-label="Today's progress"><div className="daily-intro"><span className="daily-icon"><Coffee size={25} weight="duotone"/></span><div><h2>A little progress, today</h2><p>Every bit of focused time counts.</p></div></div><div className="stat"><strong>{today.length}</strong><span>pomodoros finished</span></div><div className="stat"><strong>{minutes}<small> min</small></strong><span>time well spent</span></div><div className="daily-message"><Check size={17}/>{today.length ? 'Look at you, showing up.' : 'Your first session is waiting.'}</div></section>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
    </main>
    <footer><span><Leaf size={15}/> A softer way to get things done.</span><span>Made for your pace.</span></footer>
    {showSettings && <Settings settings={state.settings} onClose={() => setShowSettings(false)} onSave={settings => { dispatch({ type: 'settings', settings }); setShowSettings(false); setAnnouncement('Settings saved.'); }}/>}</div>;
}
