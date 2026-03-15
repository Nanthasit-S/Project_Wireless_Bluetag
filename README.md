# Project Wireless BlueTag

แอปและเฟิร์มแวร์สำหรับระบบติดตาม/ค้นหาอุปกรณ์ BlueTag ผ่าน Bluetooth Low Energy (BLE)

โปรเจกต์นี้ประกอบด้วย 2 ส่วนหลัก:
- Mobile App (React Native + Expo): สแกน BLE, สั่ง Ring/Buzzer, แสดงตำแหน่งจาก backend
- ESP32 Firmware (PlatformIO): จำลองอุปกรณ์ BlueTag-compatible เพื่อทดสอบกับแอป

## Tech Stack

### Mobile App
- React Native `0.83.2`
- Expo SDK `~55.0.4`
- React `19.2.0`
- TypeScript `~5.9.2`
- BLE: `react-native-ble-plx`
- Map: `react-native-maps`
- Styling: `nativewind` + `tailwindcss`

### Firmware
- ESP32 (Arduino framework)
- PlatformIO
- BLE GATT service/characteristics แบบ BlueTag-compatible

## Project Structure

```text
.
├── App.tsx
├── src/
│   ├── components/dashboard/
│   ├── constants/
│   ├── types/
│   └── utils/
├── firmware/
│   └── esp32_bluetag_compat/
│       ├── platformio.ini
│       └── src/
└── README.md
```

## Prerequisites

### Mobile
- Node.js 20+
- npm 10+
- Android Studio (สำหรับ `expo run:android`)
- Xcode (สำหรับ `expo run:ios` บน macOS)

### Firmware
- PlatformIO Core (`pio` command)
- บอร์ด ESP32 + สาย USB

## Installation

รันที่ root ของโปรเจกต์นี้:

```bash
npm install
```

## Run Mobile App

### 1) Development build (แนะนำสำหรับ BLE)

```bash
npm run android
# หรือ
npm run ios
```

หมายเหตุ:
- `react-native-ble-plx` ต้องใช้ native build
- BLE อาจใช้งานไม่ได้ครบถ้าเปิดด้วย Expo Go ตรงๆ

### 2) Start Metro bundler

```bash
npm start
```

### 3) Web (เฉพาะ UI/flow ที่ไม่พึ่ง native BLE)

```bash
npm run web
```

## Dependency Profiles

โปรเจกต์รองรับ 2 โปรไฟล์ dependencies:
- `devbuild` (Expo SDK 55) สำหรับ native/dev build
- `expo-go` (Expo SDK 54) สำหรับเปิดกับ Expo Go

สลับโปรไฟล์ได้ด้วย:

```bash
npm run use:devbuild
# หรือ
npm run use:expo-go
```

จากนั้น sync packages:

```bash
npm run sync:expo
```

## BLE Ring Protocol

แอปจะเขียนค่า 1 byte ไปยัง characteristic สำหรับสั่งเสียง:

- IAS: service `0x1802`, characteristic `0x2A06`
- Fallback custom:
  - service `0xFFF0`
  - characteristic `0xFFF1`

Payload:
- `0` = off
- `1` = slow beep
- `2` = fast beep

## Backend Map Integration

แอปรองรับการดึงตำแหน่ง tag จาก backend endpoint `/api/tags`

ตัวอย่างค่า base URL ที่ใช้งานใน local:
- `http://127.0.0.1:8000`

ตั้งค่า target tag เช่น `BTAG-59ADE300` เพื่อดึงตำแหน่งและแสดงบนแผนที่

## ESP32 Firmware Usage

ไปที่โฟลเดอร์ firmware:

```bash
cd firmware/esp32_bluetag_compat
```

แฟลชด้วย PlatformIO:

```bash
pio run -t upload --upload-port /dev/cu.usbmodem1101
pio device monitor -b 115200 --port /dev/cu.usbmodem1101
```

ค่าเริ่มต้น buzzer pin: `GPIO2`
- แก้ได้ที่ `kBuzzerPinPrimary` ใน `firmware/esp32_bluetag_compat/src/main.cpp`

## Git Workflow (แนะนำ)

```bash
git checkout -b feat/<feature-name>
git add .
git commit -m "feat: ..."
git push -u origin feat/<feature-name>
```

## Troubleshooting

- Push ไม่ผ่าน (403): ตรวจว่าใช้ GitHub account/SSH key ถูกบัญชี
- BLE scan ไม่เจอ: ตรวจสิทธิ์ Bluetooth/Location ในมือถือ
- Android build fail: sync dependencies ใหม่ด้วย `npm run sync:expo`
- Firmware upload fail: ตรวจ `--upload-port` ให้ตรงกับพอร์ตจริง

## Auth + Supabase (new)

This project now includes an auth backend in `backend/` using Express + Supabase Auth + Supabase Postgres.

### Mobile app auth flow
- App shows Login/Register first.
- Access token is stored locally in `AsyncStorage`.
- API calls to `/api/tags` send `Authorization: Bearer <token>`.
- App pushes local scanned tag coordinates to `POST /api/tags` automatically.

### Run backend

```bash
npm run backend:dev
```

Backend setup details: `backend/README.md`

### Connect mobile app to cloud backend
Set env var before running Expo:

```bash
EXPO_PUBLIC_BACKEND_BASE_URL=https://your-api-domain.com npm start
```

For Android emulator local testing, use `http://10.0.2.2:8000` instead of `127.0.0.1`.
