# ESP32 BlueTag-Compatible Firmware

This firmware exposes BLE service/characteristics compatible with the app fallback:

- Service: `00001910-0000-1000-8000-00805f9b34fb`
- Chars: `00002b10-0000-1000-8000-00805f9b34fb`, `00002b11-0000-1000-8000-00805f9b34fb`
- Ring payload: 1 byte
  - `0` = off
  - `1` = slow beep
  - `2` = fast beep

Default buzzer pin: `GPIO2` (edit `kBuzzerPinPrimary` in `src/main.cpp` if needed).

## Flash with PlatformIO

1. Install PlatformIO Core.
2. Connect board (detected previously as `/dev/cu.usbmodem1101`).
3. Run:

```bash
cd firmware/esp32_bluetag_compat
pio run -t upload --upload-port /dev/cu.usbmodem1101
pio device monitor -b 115200 --port /dev/cu.usbmodem1101
```

## Flash with Arduino IDE

1. Create new sketch and paste `src/main.cpp` content.
2. Install ESP32 board package (`esp32 by Espressif Systems`).
3. Select board (e.g. `ESP32 Dev Module`) and port `/dev/cu.usbmodem1101`.
4. Upload.

## Verify quickly with nRF Connect

- Connect to `BlueTag-000001`.
- Write byte `0x02` to char `2b10` or `2b11`.
- Buzzer should start fast pattern.
