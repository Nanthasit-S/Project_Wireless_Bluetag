#include <Arduino.h>

#include "ble/bluetag_ble_server.h"
#include "config/bluetag_config.h"
#include "controllers/buzzer_controller.h"
#include "controllers/ring_controller.h"
#include "types/ring_types.h"

BuzzerController gBuzzer(
    BlueTagConfig::kBuzzerPinPrimary,
    BlueTagConfig::kBuzzerPinSecondary,
    BlueTagConfig::kBuzzerLedcChannel,
    BlueTagConfig::kBuzzerLedcResBits,
    BlueTagConfig::kBuzzerFreqHz,
    BlueTagConfig::kBuzzerDutyOn,
    BlueTagConfig::kUseActiveBuzzer,
    BlueTagConfig::kBuzzerActiveLow);
RingController gRing(gBuzzer);
BlueTagBleServer gBle(gRing);

void setup() {
  Serial.begin(115200);
  delay(300);

  gBuzzer.begin();
  gRing.applyMode(RingMode::Off);
  gBle.begin();

  Serial.printf("[BUZZER] pins=%d,%d freq=%dHz\n",
                BlueTagConfig::kBuzzerPinPrimary,
                BlueTagConfig::kBuzzerPinSecondary,
                BlueTagConfig::kBuzzerFreqHz);
}

void loop() {
  gRing.update();
  gBle.update();
  delay(5);
}
