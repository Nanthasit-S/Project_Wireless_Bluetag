# ESP32 BlueTag-Compatible Firmware

This firmware exposes BLE service/characteristics compatible with the current app flow and future web-side BLE fallback:

- Service: `00001910-0000-1000-8000-00805f9b34fb`
- Chars: `00002b10-0000-1000-8000-00805f9b34fb`, `00002b11-0000-1000-8000-00805f9b34fb`
- Fallback service: `0000fff0-0000-1000-8000-00805f9b34fb`
- Fallback char: `0000fff1-0000-1000-8000-00805f9b34fb`
- IAS service: `00001802-0000-1000-8000-00805f9b34fb`
- IAS char: `00002a06-0000-1000-8000-00805f9b34fb`
- Device name / tag id: auto-generated as `BTAG-XXXXXXXX` from the board eFuse MAC
- Manufacturer data: `BTAG` payload with battery, counter, and tag hash for scan-time detection
- Ring payload: 1 byte
  - `0` = off
  - `1` = slow beep
  - `2` = fast beep

Default buzzer pin: `GPIO2` (edit `kBuzzerPinPrimary` in `src/main.cpp` if needed).
You can flash the same firmware to every board. Each board generates its own unique `BTAG-XXXXXXXX` automatically.

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

- Connect to the generated `BTAG-XXXXXXXX` device name shown in scan results.
- Write byte `0x02` to char `2b10`, `2b11`, `fff1`, or `2a06`.
- Buzzer should start fast pattern.

## Serial demo output

On boot, the serial monitor should show lines similar to:

```text
[BLE] chip_mac=...
[BLE] Advertising started
[BLE] tag_id=BTAG-XXXXXXXX
[BLE] tag_hash=XXXXXXXX
[BLE] battery=100%
[BLE] fallback=...
[BLE] immediate_alert=...
```
