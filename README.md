# To-do (iOS)
A small iOS to-do app (add, tick done, edit, delete with undo, filter by All/Active/Done, count what's left, clear completed, pin, undo mark all, remembered filter, due dates with an Overdue marker, filter by #tag, sort Manual/A-Z/Done last, a Stats tab, kept between launches) built by a crew of coding agents as a practice app. Expo SDK 57 + Expo Router + TypeScript, run as its own iPhone app (no Expo Go).

Stage: prototype · Works: yes (checked 2026-10-27) · Next: try add, tick, edit and delete on the simulator · Decide by: 2026-11-23
Why: a small, real app for practising agent-driven development with firstmate and no-mistakes.

## Run
npm install
npm test                                   # Jest: every list action
npx expo run:ios --device <simulator UDID>  # development build with Metro and live reload

The screen is `app/(tabs)/index.tsx`; the list is saved with AsyncStorage on every change.
`plugins/withSceneLifecycle.js` switches on the UIScene life cycle, which iOS 27 requires and Expo 57's template lacks.
Testing on the simulator with Maestro is in [AGENTS.md](AGENTS.md).
