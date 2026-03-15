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

String gSerialCommandBuffer;

void handleSerialCommand(String command) {
  command.trim();
  command.toUpperCase();
  if (command.isEmpty()) {
    return;
  }

  if (command == "PING") {
    Serial.println("PONG");
    return;
  }

  if (command == "ID" || command == "STATUS" || command == "INFO") {
    gBle.printSerialSummary(Serial);
    return;
  }

  if (command.startsWith("BIND ")) {
    String webId = command.substring(5);
    String resolvedWebId;
    if (gBle.bindWebId(webId, &resolvedWebId)) {
      Serial.printf("BIND_OK=%s\n", resolvedWebId.c_str());
    } else if (resolvedWebId.isEmpty()) {
      Serial.println("BIND_ERROR=WEB_ID_REQUIRED");
    } else {
      Serial.printf("BIND_DENIED=%s\n", resolvedWebId.c_str());
    }
    return;
  }

  if (command.startsWith("UNBIND ")) {
    String webId = command.substring(7);
    String resolvedWebId;
    if (gBle.unbindWebId(webId, &resolvedWebId)) {
      Serial.printf("UNBIND_OK=%s\n", resolvedWebId.c_str());
    } else {
      Serial.printf("UNBIND_DENIED=%s\n", resolvedWebId.c_str());
    }
    return;
  }

  if (command == "TECH_RESET") {
    String clearedHash;
    gBle.technicianReset(&clearedHash);
    Serial.printf("TECH_RESET_OK=%s\n", clearedHash.c_str());
    return;
  }

  if (command == "RING 0") {
    gRing.applyMode(RingMode::Off);
    Serial.println("RING_MODE=0");
    return;
  }

  if (command == "RING 1") {
    gRing.applyMode(RingMode::Slow);
    Serial.println("RING_MODE=1");
    return;
  }

  if (command == "RING 2") {
    gRing.applyMode(RingMode::Fast);
    Serial.println("RING_MODE=2");
    return;
  }

  Serial.printf("UNKNOWN_COMMAND=%s\n", command.c_str());
}

void pollSerialCommands() {
  while (Serial.available() > 0) {
    const char ch = static_cast<char>(Serial.read());
    if (ch == '\r') {
      continue;
    }
    if (ch == '\n') {
      handleSerialCommand(gSerialCommandBuffer);
      gSerialCommandBuffer = "";
      continue;
    }
    if (gSerialCommandBuffer.length() < 96) {
      gSerialCommandBuffer += ch;
    }
  }
}

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
  Serial.println("[USB] Ready. Commands: ID, STATUS, INFO, PING, BIND <WEB_ID>, UNBIND <WEB_ID>, TECH_RESET, RING 0, RING 1, RING 2");
}

void loop() {
  pollSerialCommands();
  gRing.update();
  gBle.update();
  delay(5);
}
