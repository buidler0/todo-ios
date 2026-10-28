# todo-ios

A one-screen Expo app; [README.md](README.md) says what it does and how to run it.

## Checking a change on the iOS simulator

Use a release build with Maestro. The JavaScript is built into the app, so it opens straight to the to-do list with no Expo Go, dev menu or server picker for Maestro to trip over. Use your own simulator and output folder, because other agents may be testing at the same time.

```bash
U=$(xcrun simctl create my-sim com.apple.CoreSimulator.SimDeviceType.iPhone-18-Pro com.apple.CoreSimulator.SimRuntime.iOS-27-0)
xcrun simctl boot $U
CI=1 npx expo run:ios --configuration Release --device $U --no-bundler   # rebuild after every code change
JAVA_HOME=/opt/homebrew/opt/openjdk@17 maestro --device $U test .maestro/smoke.yaml --test-output-dir <your own folder>
```

- `.maestro/smoke.yaml` is the tested starting flow; copy its first lines (launch, swipe, wait for `All` to be enabled) into any new flow, since taps before the saved list loads can be lost.
- Maestro MCP is set up in `.mcp.json`; use its `inspect_screen` to see what is on screen instead of guessing.
- Delete your simulator when done: `xcrun simctl delete $U`.
