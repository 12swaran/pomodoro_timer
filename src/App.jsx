import React, { useEffect, useReducer, useRef, useState } from 'react';
import { BookOpen, GearSix, Play, Pause, ArrowCounterClockwise, SkipForward, Plus, Check, PencilSimple, Trash, X, SpeakerHigh, SpeakerSlash, Circle, CheckCircle, ArrowsIn, ArrowsOut, Drop, Tree, Coffee, Campfire, Waves, Stop } from '@phosphor-icons/react';
import { defaults, labels, localDay, reducer, remaining } from './timer.js';
import { createBrowserStorage } from './storage.js';

const storage = createBrowserStorage();
const uid = () => crypto.randomUUID();

function useAmbience(type, volume, isPlaying) {
  const ctx = useRef(null);
  const engine = useRef(null);
  useEffect(() => {
    if (!isPlaying || type === 'off') {
      if (engine.current) { engine.current.source.stop(); engine.current.source.disconnect(); engine.current = null; }
      return;
    }
    if (!ctx.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) ctx.current = new AudioContext();
    }
    if (!ctx.current) return;
    if (ctx.current.state === 'suspended') ctx.current.resume().catch(()=>{});

    const bufferSize = ctx.current.sampleRate * 2;
    const buffer = ctx.current.createBuffer(1, bufferSize, ctx.current.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    }
    
    const noise = ctx.current.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    
    const filter = ctx.current.createBiquadFilter();
    if (type === 'rain') { filter.type = 'lowpass'; filter.frequency.value = 1200; }
    else if (type === 'fireplace') { filter.type = 'lowpass'; filter.frequency.value = 400; }
    else if (type === 'forest') { filter.type = 'bandpass'; filter.frequency.value = 2500; filter.Q.value = 0.5; }
    else if (type === 'cafe') { filter.type = 'lowpass'; filter.frequency.value = 800; filter.Q.value = 0.5; }
    else { filter.type = 'lowpass'; filter.frequency.value = 1000; }
    
    const gain = ctx.current.createGain();
    gain.gain.value = (volume / 100) * 0.8;
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.current.destination);
    noise.start();
    engine.current = { source: noise, gain };
    
    return () => {
      if (engine.current) { engine.current.source.stop(); engine.current.source.disconnect(); engine.current = null; }
    };
  }, [type, isPlaying]);

  useEffect(() => {
    if (engine.current && ctx.current) {
      engine.current.gain.gain.setValueAtTime((volume / 100) * 0.8, ctx.current.currentTime);
    }
  }, [volume]);
}

function AmbienceControls({ settings, dispatch, playing, setPlaying }) {
  const options = [
    { id: 'off', label: 'Off', icon: SpeakerSlash },
    { id: 'rain', label: 'Rain', icon: Drop },
    { id: 'forest', label: 'Forest', icon: Tree },
    { id: 'cafe', label: 'Café', icon: Coffee },
    { id: 'fireplace', label: 'Fire', icon: Campfire },
    { id: 'soft', label: 'Noise', icon: Waves },
  ];
  return <div className="ambience-controls">
    <div className="ambience-toggles" role="group" aria-label="Ambience sounds">
      {options.map(opt => {
        const Icon = opt.icon;
        return <button key={opt.id} aria-pressed={settings.ambience === opt.id} onClick={() => {
          dispatch({ type: 'settings', settings: { ...settings, ambience: opt.id } });
          setPlaying(opt.id !== 'off');
        }} title={opt.label} aria-label={opt.label}><Icon size={18}/></button>
      })}
    </div>
    {settings.ambience !== 'off' && <div className="ambience-volume">
      <button onClick={() => setPlaying(!playing)} aria-label={playing ? "Pause ambience" : "Play ambience"}>{playing ? <Stop size={16} weight="fill"/> : <Play size={16} weight="fill"/>}</button>
      <input type="range" aria-label="Ambience volume" min="0" max="100" value={settings.volume} onChange={e => dispatch({ type: 'settings', settings: { ...settings, volume: parseInt(e.target.value, 10) } })} />
    </div>}
  </div>;
}

function Heatmap({ sessions }) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const days = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    days.push({ date: localDay(d.getTime()), count: 0, mins: 0 });
  }
  sessions.forEach(s => {
    const lDay = localDay(s.completedAt);
    const day = days.find(d => d.date === lDay);
    if (day) { day.count++; day.mins += s.minutes; }
  });
  return <div className="heatmap-container">
    <div className="heatmap-header"><span className="eyebrow">CONSISTENCY</span><h3>Activity</h3></div>
    <div className="heatmap-grid" aria-label="Activity over last 12 weeks">
      {days.map(d => (
        <div key={d.date} className={`heatmap-cell intensity-${Math.min(4, d.count)}`} title={`${d.date}: ${d.count} sessions, ${Math.round(d.mins)} mins`} />
      ))}
    </div>
  </div>;
}

function Analytics({ sessions }) {
  const now = Date.now();
  const todayL = localDay(now);
  const todaySessions = sessions.filter(s => localDay(s.completedAt) === todayL);
  const todayMins = Math.round(todaySessions.reduce((sum, s) => sum + s.minutes, 0));
  const weekSessions = sessions.filter(s => s.completedAt > now - 7 * 86400000);
  const weekMins = Math.round(weekSessions.reduce((sum, s) => sum + s.minutes, 0));

  let currentStreak = 0;
  let checkDate = new Date(now);
  while(true) {
    const lDay = localDay(checkDate.getTime());
    const has = sessions.some(s => localDay(s.completedAt) === lDay);
    if (has) { currentStreak++; }
    else if (currentStreak > 0 || checkDate.getTime() < now - 86400000) { break; }
    checkDate = new Date(checkDate.getTime() - 86400000);
  }

  return <section className="analytics-panel" aria-label="Progress analytics">
    <div className="analytics-stats">
      <div className="stat"><strong>{todaySessions.length}</strong><span>Sessions Today</span></div>
      <div className="stat"><strong>{todayMins}m</strong><span>Time Today</span></div>
      <div className="stat"><strong>{weekMins}m</strong><span>This Week</span></div>
      <div className="stat"><strong>{currentStreak}</strong><span>Day Streak</span></div>
    </div>
    <Heatmap sessions={sessions} />
  </section>;
}

function Garden({ sessions }) {
  const count = sessions.length;
  let stage = 0, msg = "A fresh seed";
  if (count >= 1) { stage = 1; msg = "Sprouting gently"; }
  if (count >= 5) { stage = 2; msg = "Growing leaves"; }
  if (count >= 15) { stage = 3; msg = "Flourishing plant"; }
  if (count >= 30) { stage = 4; msg = "A beautiful garden"; }

  return <section className="garden-panel" aria-label="Focus garden">
    <div className="garden-header"><span className="eyebrow">YOUR GARDEN</span><h3>Growth</h3></div>
    <div className={`garden-illustration stage-${stage}`}>
      <div className="plant-pot"></div>
      {stage >= 1 && <div className="plant-stem"></div>}
      {stage >= 2 && <div className="plant-leaf leaf-left"></div>}
      {stage >= 3 && <div className="plant-leaf leaf-right"></div>}
      {stage >= 4 && <div className="plant-flower"></div>}
    </div>
    <div className="garden-status">{msg}</div>
  </section>;
}

function Settings({ settings, onSave, onClose }) {
  const dialog = useRef(null);
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState('');
  useEffect(() => { dialog.current.showModal(); }, []);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const f = Number(draft.focus);
    const s = Number(draft.short);
    const l = Number(draft.long);
    if (!Number.isInteger(f) || f < 1 || f > 180 || !Number.isInteger(s) || s < 1 || s > 180 || !Number.isInteger(l) || l < 1 || l > 180) {
      setError('Durations must be whole numbers between 1 and 180.'); return;
    }
    setError('');
    onSave({ ...draft, focus: f, short: s, long: l });
  };

  return <dialog ref={dialog} className="settings-dialog" aria-labelledby="settings-heading" onClose={onClose} onClick={e => { if (e.target === dialog.current) onClose(); }}>
    <form onSubmit={handleSubmit}>
      <div className="dialog-top"><h2 id="settings-heading">Your focus rhythm</h2><button type="button" className="icon-button close-button" aria-label="Close settings" onClick={onClose}><X size={21}/></button></div>
      <p className="dialog-subtitle">A little structure, at your own pace.</p>
      {error && <div className="settings-error" role="alert">{error}</div>}
      <div className="duration-fields">
        {Object.keys(labels).map(mode => (
          <label key={mode} className="duration-label">
            {labels[mode]}
            <span className="duration-input-wrapper">
              <input type="number" min="1" max="180" step="1" required value={draft[mode]} onChange={e => setDraft({ ...draft, [mode]: e.target.value })}/>
              <span className="duration-unit">min</span>
            </span>
          </label>
        ))}
      </div>
      <div className="theme-selector-group">
        <label className="theme-label">Visual Theme</label>
        <select className="theme-select" value={draft.theme} onChange={e => setDraft({ ...draft, theme: e.target.value })}>
          <option value="botanical">Warm Botanical</option>
          <option value="midnight">Midnight Forest</option>
          <option value="paper">Warm Paper</option>
        </select>
      </div>
      <label className="sound-setting">
        <span className="sound-setting-label"><SpeakerHigh size={22}/> Play a gentle completion chime</span>
        <input type="checkbox" checked={!draft.muted} onChange={e => setDraft({ ...draft, muted: !e.target.checked })}/>
      </label>
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
  const [focusMode, setFocusMode] = useState(false);
  const [ambiencePlaying, setAmbiencePlaying] = useState(false);
  const audio = useRef(null);
  const previous = useRef(state);

  useAmbience(state.settings.ambience, state.settings.volume, ambiencePlaying);

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
  const focusedTask = state.tasks.find(task => task.id === (t.status === 'idle' ? state.selectedTaskId : t.taskId));
  const completed = state.tasks.filter(task => task.done).length;
  
  useEffect(() => { document.title = t.status === 'running' ? `${timeText} · ${labels[t.mode]} · Little Study` : 'Little Study · One thing at a time'; }, [timeText, t.status, t.mode]);

  return <div className={`study-page theme-${state.settings.theme} ${focusMode ? 'focus-mode-active' : ''}`}>
    <header className="site-header">
      <a className="brand" href="/" aria-label="Little Study home">
        <span className="brand-mark"><BookOpen weight="duotone" size={20}/></span>
        little study<span className="brand-period">.</span>
      </a>
      <div className="header-right">
        <AmbienceControls settings={state.settings} dispatch={dispatch} playing={ambiencePlaying} setPlaying={setAmbiencePlaying} />
        <button className="icon-button" aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"} onClick={() => setFocusMode(!focusMode)}>
          {focusMode ? <ArrowsIn size={20}/> : <ArrowsOut size={20}/>}
        </button>
        <button className="settings-button" aria-label="Settings" onClick={() => setShowSettings(true)}>
          <GearSix size={20}/>
        </button>
      </div>
    </header>
    <main>
      <div className="intro">
        <span className="eyebrow">A MOMENT FOR YOURSELF</span>
        <h1>One thing at a time.</h1>
        <p>Make a little space for what matters today.</p>
      </div>
      {notice && <p className="storage-notice" role="status">{notice}</p>}
      <div className="workspace">
        <section className={`timer-panel mode-${t.mode}`} aria-label="Pomodoro timer">
          <div className="mode-tabs" role="group" aria-label="Timer phase">
            {Object.entries(labels).map(([mode, label]) => <button key={mode} aria-pressed={t.mode === mode} disabled={t.status !== 'idle' && mode !== t.mode} onClick={() => { dispatch({ type: 'mode', mode }); setAnnouncement(`${label} ready.`); }}>{label}</button>)}
          </div>
          <div className="timer-content">
            <span className="phase-caption">{t.mode === 'focus' ? 'TIME TO FOCUS' : t.mode === 'short' ? 'A MOMENT TO RESET' : 'TIME TO RECHARGE'}</span>
            <div className="time-display" role="timer" aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`}>{timeText}</div>
            <p className="timer-message">{t.status === 'paused' ? 'Paused. Pick up whenever you\'re ready.' : t.mode === 'focus' ? 'Settle in and find your flow.' : t.mode === 'short' ? 'Stand up, stretch, take a breath.' : 'Step away. You\'ve earned a longer rest.'}</p>
            <div className="timer-controls">
              <button className="icon-button" title="Reset current phase" aria-label="Reset current phase" onClick={() => { dispatch({ type: 'reset' }); setAnnouncement('Timer reset.'); }}><ArrowCounterClockwise size={24}/></button>
              <button className="primary-button start-button" onClick={t.status === 'running' ? () => { dispatch({ type: 'pause' }); setAnnouncement('Timer paused.'); } : start}>
                {t.status === 'running' ? <Pause size={20} weight="fill"/> : <Play size={20} weight="fill"/>}
                {t.status === 'running' ? 'Pause' : t.status === 'paused' ? 'Resume' : t.mode === 'focus' ? 'Start focusing' : 'Start break'}
              </button>
              <button className="icon-button" title="Skip current phase" aria-label="Skip current phase" onClick={() => { dispatch({ type: 'skip' }); setAnnouncement('Phase skipped. The next phase is ready.'); }}><SkipForward size={24}/></button>
            </div>
            <div className="cycle-indicator" aria-label={`${state.cycle % 4} of 4 sessions toward a long break`}>
              {[0,1,2,3].map(i => <span key={i} className={i < state.cycle % 4 ? 'filled' : ''}><Circle size={10} weight={i < state.cycle % 4 ? 'fill' : 'regular'}/></span>)}
              <span className="cycle-label">long break after 4 sessions</span>
            </div>
          </div>
          <div className="timer-bottom">
            <span className="focus-label">
              {focusedTask ? (
                <>
                  <span className="status-dot"/>
                  <span className="focus-prefix">{t.mode === 'focus' ? 'Focusing on' : 'Taking a break from'}</span>
                  <strong>{focusedTask.title}</strong>
                </>
              ) : (
                <span>No task selected</span>
              )}
            </span>
            <button className="icon-button sound-toggle" aria-label={state.settings.muted ? 'Unmute completion chime' : 'Mute completion chime'} onClick={() => dispatch({ type: 'settings', settings: { ...state.settings, muted: !state.settings.muted } })}>
              {state.settings.muted ? <SpeakerSlash size={19}/> : <SpeakerHigh size={19}/>}
            </button>
          </div>
        </section>

        <section className="tasks-panel" aria-labelledby="tasks-heading">
          <div className="tasks-heading">
            <div>
              <span className="eyebrow">YOUR FOCUS LIST</span>
              <h2 id="tasks-heading">On your desk</h2>
            </div>
            <div className="task-heading-right">
              <span className="task-count">{completed} / {state.tasks.length}</span>
            </div>
          </div>
          <p className="task-help">Small steps add up.</p>
          <form className="add-task" onSubmit={e => { e.preventDefault(); if (title.trim()) { dispatch({ type: 'add', id: uid(), title: title.trim() }); setTitle(''); } }}>
            <input aria-label="New task" placeholder="Add a task for today…" value={title} maxLength={160} onChange={e => setTitle(e.target.value)}/>
            <button type="submit" aria-label="Add task" disabled={!title.trim()}><Plus size={21}/></button>
          </form>
          <div className="task-list">
            {state.tasks.length === 0 ? (
              <div className="empty-tasks">
                <BookOpen size={32} weight="duotone"/>
                <p>A fresh page.</p>
                <span>Add your first task and make room to focus.</span>
              </div>
            ) : (
              state.tasks.map(task => (
                <div key={task.id} className={`task-row ${task.done ? 'done' : ''} ${state.selectedTaskId === task.id ? 'selected' : ''}`}>
                  <button className="check-task" aria-label={`${task.done ? 'Reopen' : 'Complete'} ${task.title}`} onClick={() => dispatch({ type: 'toggle', id: task.id })}>
                    {task.done ? <CheckCircle size={24} weight="fill"/> : <Circle size={24}/>}
                  </button>
                  <div className="task-info">
                    {editing === task.id ? (
                      <form onSubmit={e => { e.preventDefault(); saveRename(task.id); }}>
                        <input className="rename-input" aria-label="Rename task" autoFocus maxLength={160} value={editTitle} onChange={e => setEditTitle(e.target.value)} onBlur={() => saveRename(task.id)} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); setEditing(null); } }}/>
                      </form>
                    ) : (
                      <button className="task-title" disabled={task.done} aria-pressed={state.selectedTaskId === task.id} onClick={() => dispatch({ type: 'select', id: state.selectedTaskId === task.id ? null : task.id })}>{task.title}</button>
                    )}
                    <span className="task-meta">
                      {state.sessions.filter(s => s.taskId === task.id).length} pomodoros
                      {state.selectedTaskId === task.id && !task.done && <span className="selected-label"> · NEXT UP</span>}
                    </span>
                  </div>
                  <div className="task-actions">
                    <button className="icon-button" aria-label={`Rename ${task.title}`} onClick={() => { setEditing(task.id); setEditTitle(task.title); }}><PencilSimple size={18}/></button>
                    <button className="icon-button" aria-label={`Delete ${task.title}`} onClick={() => dispatch({ type: 'delete', id: task.id })}><Trash size={18}/></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
      
      <div className="secondary-workspace">
        <Analytics sessions={state.sessions} />
        <Garden sessions={state.sessions} />
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
    </main>
    <footer><span>A gentler way to get things done.</span></footer>
    {showSettings && <Settings settings={state.settings} onClose={() => setShowSettings(false)} onSave={settings => { dispatch({ type: 'settings', settings }); setShowSettings(false); setAnnouncement('Settings saved.'); }}/>}
  </div>;
}
