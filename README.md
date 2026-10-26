# To-do (iOS)
A one-screen iOS to-do app (add, tick done, delete, kept between launches) that Jason builds to practise running firstmate. Expo SDK 54 + Expo Router + TypeScript.

Stage: prototype · Works: yes (checked 2026-10-26) · Next: Jason adds, ticks and deletes a to-do on the simulator · Decide by: 2026-11-23
Why: practice app for the firstmate trial, `~/Labs/workflow-lab/scouts/kun-chen/NOTES.md`

## Run
npm install
npm test                 # Jest: adds a to-do and ticks it done
npx expo start --ios     # opens in Expo Go on the iOS simulator

The screen is `app/(tabs)/index.tsx`; the list is saved with AsyncStorage on every change.
`--ios` needs Xcode's Simulator app; without it, boot a simulator and run `npx expo start`, then open `exp://127.0.0.1:8081` in Expo Go.
