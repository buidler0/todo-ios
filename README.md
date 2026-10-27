# To-do (iOS)
A one-screen iOS to-do app (add, tick done, edit, delete, kept between launches) built by a crew of coding agents as a practice app. Expo SDK 54 + Expo Router + TypeScript.

Stage: prototype · Works: yes (checked 2026-10-26) · Next: try add, tick, edit and delete on the simulator · Decide by: 2026-11-23
Why: a small, real app for practising agent-driven development with firstmate and no-mistakes.

## Run
npm install
npm test                 # Jest: adds, ticks done and edits a to-do
npx expo start --ios     # opens in Expo Go on the iOS simulator

The screen is `app/(tabs)/index.tsx`; the list is saved with AsyncStorage on every change.
`--ios` needs Xcode's Simulator app; without it, boot a simulator and run `npx expo start`, then open `exp://127.0.0.1:8081` in Expo Go.
