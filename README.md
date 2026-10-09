# Little Study

A cozy Pomodoro workspace built with React, JavaScript, Vite, and custom CSS.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. Run `npm test` for timer and storage checks, or `npm run build` to create the static production output in `dist`.

## How it works

Focus for 25 minutes, take a 5-minute break, and take a 15-minute break after every fourth completed focus session. Durations are editable from 1 to 180 minutes. Every phase waits for you to start it. Reset and skip do not count as completed sessions.

Select a task before starting to credit it with the completed Pomodoro. Switching the selection during a session changes the next session's task. Completing a task is manual. Deleting a task preserves its session records in daily totals.

Tasks, settings, progress, and the current timer are saved to this browser. An expired timer is recorded once when the app reopens, using its actual completion time. Browser storage can be cleared by the browser and is not a cross-device backup. Sign-in and sync are deferred; `src/storage.js` exposes the replaceable storage adapter.

No account, backend, or deployment is included. Completion audio uses the browser Web Audio API, unlocked when you start a session. A closed or suspended page cannot play a timely chime; completion is reconciled when it resumes.
