#include "ble/bluetag_ble_server.h"

#include "config/bluetag_config.h"

BlueTagBleServer::BlueTagBleServer(RingController& ring)
    : ring_(ring), ringCharCallbacks_(*this), serverCallbacks_(*this) {}

void BlueTagBleServer::begin() {
  BLEDevice::init(BlueTagConfig::kDeviceName);
  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(&serverCallbacks_);
  BLEService* service = server->createService(BlueTagConfig::kServiceUuid);
  BLEService* batteryService = server->createService(BlueTagConfig::kBatteryServiceUuid);

  primaryChar_ = service->createCharacteristic(
      BlueTagConfig::kRingCharPrimaryUuid,
      BLECharacteristic::PROPERTY_READ |
          BLECharacteristic::PROPERTY_WRITE |
          BLECharacteristic::PROPERTY_WRITE_NR |
          BLECharacteristic::PROPERTY_NOTIFY);
  primaryChar_->addDescriptor(new BLE2902());
  primaryChar_->setCallbacks(&ringCharCallbacks_);

  secondaryChar_ = service->createCharacteristic(
      BlueTagConfig::kRingCharSecondaryUuid,
      BLECharacteristic::PROPERTY_READ |
          BLECharacteristic::PROPERTY_WRITE |
          BLECharacteristic::PROPERTY_WRITE_NR |
          BLECharacteristic::PROPERTY_NOTIFY);
  secondaryChar_->addDescriptor(new BLE2902());
  secondaryChar_->setCallbacks(&ringCharCallbacks_);

  batteryChar_ = batteryService->createCharacteristic(
      BlueTagConfig::kBatteryLevelCharUuid,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  batteryChar_->addDescriptor(new BLE2902());

  publishMode();
  publishBattery(false);
  service->start();
  batteryService->start();

  if (BlueTagConfig::kBatteryAdcPin >= 0) {
    pinMode(BlueTagConfig::kBatteryAdcPin, INPUT);
  }

  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(BlueTagConfig::kServiceUuid);
  advertising->addServiceUUID(BlueTagConfig::kBatteryServiceUuid);
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  advertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Advertising started");
  Serial.printf("[BLE] service=%s\n", BlueTagConfig::kServiceUuid);
  Serial.printf("[BLE] chars=%s, %s\n",
                BlueTagConfig::kRingCharPrimaryUuid,
                BlueTagConfig::kRingCharSecondaryUuid);
  Serial.printf("[BLE] battery=%s/%s\n",
                BlueTagConfig::kBatteryServiceUuid,
                BlueTagConfig::kBatteryLevelCharUuid);
}

void BlueTagBleServer::update() {
  const uint32_t now = millis();
  if (now < nextBatterySampleAtMs_) {
    return;
  }
  nextBatterySampleAtMs_ = now + BlueTagConfig::kBatteryUpdateIntervalMs;
  publishBattery(centralConnected_);
}

BlueTagBleServer::RingCharacteristicCallbacks::RingCharacteristicCallbacks(BlueTagBleServer& parent)
    : parent_(parent) {}

void BlueTagBleServer::RingCharacteristicCallbacks::onWrite(BLECharacteristic* characteristic) {
  parent_.handleRingWrite(characteristic->getValue());
}

BlueTagBleServer::ServerCallbacks::ServerCallbacks(BlueTagBleServer& parent) : parent_(parent) {}

void BlueTagBleServer::ServerCallbacks::onConnect(BLEServer* server) {
  (void)server;
  parent_.centralConnected_ = true;
  parent_.publishBattery(true);
  Serial.println("[BLE] Central connected");
}

void BlueTagBleServer::ServerCallbacks::onDisconnect(BLEServer* server) {
  (void)server;
  parent_.centralConnected_ = false;
  // Keep current ring mode across transient disconnects.
  // The app intentionally reconnects per write; turning off here causes
  // audible on/off flicker even though no OFF command was sent.
  Serial.println("[BLE] Central disconnected -> keep ring mode, restart advertising");
  BLEDevice::startAdvertising();
}

void BlueTagBleServer::handleRingWrite(const std::string& value) {
  if (value.empty()) {
    Serial.println("[RING] write empty payload, ignored");
    return;
  }

  uint8_t modeByte = static_cast<uint8_t>(value[0]);
  if (modeByte > 2) {
    if (value[0] == '0' || value[0] == '1' || value[0] == '2') {
      modeByte = static_cast<uint8_t>(value[0] - '0');
    } else {
      Serial.printf("[RING] unsupported payload byte=0x%02X\n", static_cast<uint8_t>(value[0]));
      return;
    }
  }

  ring_.applyMode(static_cast<RingMode>(modeByte));
  publishMode();
}

void BlueTagBleServer::publishMode() {
  uint8_t mode = static_cast<uint8_t>(ring_.currentMode());
  if (primaryChar_ != nullptr) {
    primaryChar_->setValue(&mode, 1);
    if (centralConnected_) {
      primaryChar_->notify();
    }
  }
  if (secondaryChar_ != nullptr) {
    secondaryChar_->setValue(&mode, 1);
    if (centralConnected_) {
      secondaryChar_->notify();
    }
  }
}

uint8_t BlueTagBleServer::readBatteryPercent() const {
  if (BlueTagConfig::kBatteryAdcPin < 0) {
    return static_cast<uint8_t>(constrain(BlueTagConfig::kBatteryFallbackPercent, 0, 100));
  }

  int mvSum = 0;
  int validSamples = 0;
  for (int i = 0; i < BlueTagConfig::kBatterySampleCount; ++i) {
    int mv = analogReadMilliVolts(BlueTagConfig::kBatteryAdcPin);
    if (mv > 0) {
      mvSum += mv;
      validSamples += 1;
    }
    delay(2);
  }

  if (validSamples <= 0) {
    return static_cast<uint8_t>(constrain(BlueTagConfig::kBatteryFallbackPercent, 0, 100));
  }

  const float measuredMv = static_cast<float>(mvSum) / static_cast<float>(validSamples);
  const float batteryMv = measuredMv * BlueTagConfig::kBatteryAdcScale;
  const float ratio =
      (batteryMv - static_cast<float>(BlueTagConfig::kBatteryMvEmpty)) /
      static_cast<float>(BlueTagConfig::kBatteryMvFull - BlueTagConfig::kBatteryMvEmpty);
  const int percent = static_cast<int>(ratio * 100.0f + 0.5f);
  return static_cast<uint8_t>(constrain(percent, 0, 100));
}

void BlueTagBleServer::publishBattery(bool notify) {
  if (batteryChar_ == nullptr) {
    return;
  }

  const uint8_t batteryPercent = readBatteryPercent();
  if (batteryPercent == lastBatteryPercent_ && !notify) {
    return;
  }

  lastBatteryPercent_ = batteryPercent;
  batteryChar_->setValue(&lastBatteryPercent_, 1);
  if (notify && centralConnected_) {
    batteryChar_->notify();
  }
}
