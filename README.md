# BlueTag Mobile (React Native + Expo)

Single mobile app for:

- BLE scan (Wunderfind-like RSSI view)
- Ring control via GATT (`off/slow/fast`)
- Map view from BlueTag backend (`/api/tags`)

## Run

```bash
cd bluetag_mobile
npm install
npx expo run:android
```

## Profiles

This project supports 2 dependency profiles:

- `devbuild` (Expo SDK 55): for development builds / native workflow.
- `expo-go` (Expo SDK 54): for opening with Expo Go.

Switch profile with:

```bash
npm run use:devbuild
# or
npm run use:expo-go
```

Then run:

```bash
npm start
```

Important:

- `react-native-ble-plx` requires native build.
- Do not use Expo Go for BLE features in this app.

For iPhone testing:

- use `npm run ios` on macOS, or
- build with EAS/TestFlight.

## Ring Protocol

The app writes one byte to either:

- IAS: service `0x1802`, characteristic `0x2A06`
- Fallback custom: service `0xFFF0`, characteristic `0xFFF1`

Values:

- `0` = off
- `1` = slow beep
- `2` = fast beep

## Backend Map

Set backend base URL in app (default `http://127.0.0.1:8000`), then set target tag (e.g. `BTAG-59ADE300`) to pull map position.
# bluetag_mobile
# Project_Wireless_Bluetag
