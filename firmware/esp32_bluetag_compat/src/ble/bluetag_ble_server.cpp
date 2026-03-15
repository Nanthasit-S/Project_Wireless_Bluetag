#include "ble/bluetag_ble_server.h"

#include <cstdio>
#include <cinttypes>

#include "config/bluetag_config.h"

BlueTagBleServer::BlueTagBleServer(RingController& ring)
    : ring_(ring), ringCharCallbacks_(*this), serverCallbacks_(*this) {}

void BlueTagBleServer::begin() {
  initializeIdentity();
  preferences_.begin(BlueTagConfig::kStorageNamespace, false);
  loadBindingState();
  BLEDevice::init(tagId_.c_str());
  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(&serverCallbacks_);
  BLEService* service = server->createService(BlueTagConfig::kServiceUuid);
  BLEService* fallbackService = server->createService(BlueTagConfig::kFallbackServiceUuid);
  BLEService* immediateAlertService = server->createService(BlueTagConfig::kImmediateAlertServiceUuid);
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

  fallbackChar_ = fallbackService->createCharacteristic(
      BlueTagConfig::kFallbackRingCharUuid,
      BLECharacteristic::PROPERTY_READ |
          BLECharacteristic::PROPERTY_WRITE |
          BLECharacteristic::PROPERTY_WRITE_NR |
          BLECharacteristic::PROPERTY_NOTIFY);
  fallbackChar_->addDescriptor(new BLE2902());
  fallbackChar_->setCallbacks(&ringCharCallbacks_);

  immediateAlertChar_ = immediateAlertService->createCharacteristic(
      BlueTagConfig::kImmediateAlertCharUuid,
      BLECharacteristic::PROPERTY_READ |
          BLECharacteristic::PROPERTY_WRITE |
          BLECharacteristic::PROPERTY_WRITE_NR |
          BLECharacteristic::PROPERTY_NOTIFY);
  immediateAlertChar_->addDescriptor(new BLE2902());
  immediateAlertChar_->setCallbacks(&ringCharCallbacks_);

  batteryChar_ = batteryService->createCharacteristic(
      BlueTagConfig::kBatteryLevelCharUuid,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  batteryChar_->addDescriptor(new BLE2902());

  publishMode();
  publishBattery(false);
  service->start();
  fallbackService->start();
  immediateAlertService->start();
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
  publishAdvertisingPayload();
  BLEDevice::startAdvertising();

  Serial.println("[BLE] Advertising started");
  Serial.printf("[BLE] tag_id=%s\n", tagId_.c_str());
  Serial.printf("[BLE] tag_hash=%08" PRIX32 "\n", resolveTagHash());
  Serial.printf("[BLE] battery=%u%%\n", static_cast<unsigned>(lastBatteryPercent_));
  Serial.printf("[BLE] bound_web_id_hash=%s\n", boundWebIdHash_.empty() ? "-" : boundWebIdHash_.c_str());
  Serial.printf("[BLE] service=%s\n", BlueTagConfig::kServiceUuid);
  Serial.printf("[BLE] chars=%s, %s\n",
                BlueTagConfig::kRingCharPrimaryUuid,
                BlueTagConfig::kRingCharSecondaryUuid);
  Serial.printf("[BLE] fallback=%s/%s\n",
                BlueTagConfig::kFallbackServiceUuid,
                BlueTagConfig::kFallbackRingCharUuid);
  Serial.printf("[BLE] immediate_alert=%s/%s\n",
                BlueTagConfig::kImmediateAlertServiceUuid,
                BlueTagConfig::kImmediateAlertCharUuid);
  Serial.printf("[BLE] battery=%s/%s\n",
                BlueTagConfig::kBatteryServiceUuid,
                BlueTagConfig::kBatteryLevelCharUuid);
}

bool BlueTagBleServer::bindWebId(const String& webId, String* resolvedHash) {
  const std::string normalizedHash = resolveWebIdHash(webId);

  if (normalizedHash.empty()) {
    if (resolvedHash != nullptr) {
      *resolvedHash = "";
    }
    return false;
  }

  if (!boundWebIdHash_.empty() && boundWebIdHash_ != normalizedHash) {
    if (resolvedHash != nullptr) {
      *resolvedHash = boundWebIdHash_.c_str();
    }
    return false;
  }

  const size_t stored = preferences_.putString(BlueTagConfig::kBoundWebIdHashKey, normalizedHash.c_str());
  if (stored == 0) {
    if (resolvedHash != nullptr) {
      *resolvedHash = "";
    }
    return false;
  }

  boundWebIdHash_ = normalizedHash;
  if (resolvedHash != nullptr) {
    *resolvedHash = boundWebIdHash_.c_str();
  }
  return true;
}

bool BlueTagBleServer::unbindWebId(const String& webId, String* resolvedHash) {
  const std::string normalizedHash = resolveWebIdHash(webId);

  if (boundWebIdHash_.empty()) {
    if (resolvedHash != nullptr) {
      *resolvedHash = "";
    }
    return true;
  }

  if (normalizedHash.empty() || boundWebIdHash_ != normalizedHash) {
    if (resolvedHash != nullptr) {
      *resolvedHash = boundWebIdHash_.c_str();
    }
    return false;
  }

  preferences_.remove(BlueTagConfig::kBoundWebIdHashKey);
  boundWebIdHash_.clear();
  if (resolvedHash != nullptr) {
    *resolvedHash = normalizedHash.c_str();
  }
  return true;
}

void BlueTagBleServer::technicianReset(String* clearedHash) {
  if (clearedHash != nullptr) {
    *clearedHash = boundWebIdHash_.c_str();
  }

  preferences_.remove(BlueTagConfig::kBoundWebIdHashKey);
  boundWebIdHash_.clear();
}

void BlueTagBleServer::initializeIdentity() {
  if (!tagId_.empty()) {
    return;
  }

  const uint64_t chipMac = ESP.getEfuseMac();
  const uint32_t suffix = static_cast<uint32_t>(chipMac & 0xFFFFFFFFu);
  char buffer[32];
  std::snprintf(buffer, sizeof(buffer), "%s%08" PRIX32, BlueTagConfig::kTagIdPrefix, suffix);
  tagId_ = buffer;
  Serial.printf("[BLE] chip_mac=%04" PRIX32 "%08" PRIX32 "\n",
                static_cast<uint32_t>(chipMac >> 32),
                static_cast<uint32_t>(chipMac & 0xFFFFFFFFu));
}

void BlueTagBleServer::loadBindingState() {
  String stored = preferences_.getString(BlueTagConfig::kBoundWebIdHashKey, "");
  stored.trim();
  stored.toUpperCase();
  boundWebIdHash_ = stored.c_str();
}

std::string BlueTagBleServer::resolveWebIdHash(const String& webId) const {
  String normalized = webId;
  normalized.trim();
  normalized.toUpperCase();
  if (normalized.isEmpty()) {
    return "";
  }

  uint32_t hash = 2166136261u;
  for (size_t index = 0; index < normalized.length(); index += 1) {
    hash ^= static_cast<uint8_t>(normalized[index]);
    hash *= 16777619u;
  }

  char buffer[16];
  std::snprintf(buffer, sizeof(buffer), "%08" PRIX32, hash);
  return buffer;
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
  if (fallbackChar_ != nullptr) {
    fallbackChar_->setValue(&mode, 1);
    if (centralConnected_) {
      fallbackChar_->notify();
    }
  }
  if (immediateAlertChar_ != nullptr) {
    immediateAlertChar_->setValue(&mode, 1);
    if (centralConnected_) {
      immediateAlertChar_->notify();
    }
  }
}

uint32_t BlueTagBleServer::resolveTagHash() const {
  unsigned int parsed = 0;
  if (std::sscanf(tagId_.c_str(), "BTAG-%8x", &parsed) == 1) {
    return static_cast<uint32_t>(parsed);
  }

  uint32_t hash = 2166136261u;
  const char* cursor = tagId_.c_str();
  while (*cursor != '\0') {
    hash ^= static_cast<uint8_t>(*cursor);
    hash *= 16777619u;
    ++cursor;
  }
  return hash;
}

void BlueTagBleServer::publishAdvertisingPayload() {
  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  if (advertising == nullptr) {
    return;
  }

  std::string manufacturerData;
  manufacturerData.reserve(16);
  manufacturerData.push_back(static_cast<char>(BlueTagConfig::kManufacturerCompanyId & 0xFF));
  manufacturerData.push_back(static_cast<char>((BlueTagConfig::kManufacturerCompanyId >> 8) & 0xFF));
  manufacturerData.append("BTAG", 4);
  manufacturerData.push_back(static_cast<char>(0x01));
  manufacturerData.push_back(static_cast<char>(lastBatteryPercent_));

  advCounter_ += 1;
  for (int shift = 24; shift >= 0; shift -= 8) {
    manufacturerData.push_back(static_cast<char>((advCounter_ >> shift) & 0xFF));
  }

  const uint32_t tagHash = resolveTagHash();
  for (int shift = 24; shift >= 0; shift -= 8) {
    manufacturerData.push_back(static_cast<char>((tagHash >> shift) & 0xFF));
  }

  BLEAdvertisementData scanResponse;
  scanResponse.setName(tagId_);
  scanResponse.setManufacturerData(manufacturerData);
  advertising->setScanResponseData(scanResponse);
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
  publishAdvertisingPayload();
  if (notify && centralConnected_) {
    batteryChar_->notify();
  }
}

void BlueTagBleServer::printSerialSummary(Stream& stream) const {
  stream.println("BLUETAG_USB_READY");
  stream.printf("TAG_ID=%s\n", tagId_.c_str());
  stream.printf("BOUND_WEB_ID_HASH=%s\n", boundWebIdHash_.empty() ? "" : boundWebIdHash_.c_str());
  stream.printf("LOCK_STATE=%s\n", boundWebIdHash_.empty() ? "UNBOUND" : "LOCKED");
  stream.printf("BATTERY=%u\n", static_cast<unsigned>(lastBatteryPercent_));
  stream.printf("SERVICE_1910=%s\n", BlueTagConfig::kServiceUuid);
  stream.printf("CHAR_2B10=%s\n", BlueTagConfig::kRingCharPrimaryUuid);
  stream.printf("CHAR_2B11=%s\n", BlueTagConfig::kRingCharSecondaryUuid);
  stream.printf("SERVICE_FFF0=%s\n", BlueTagConfig::kFallbackServiceUuid);
  stream.printf("CHAR_FFF1=%s\n", BlueTagConfig::kFallbackRingCharUuid);
  stream.printf("SERVICE_IAS=%s\n", BlueTagConfig::kImmediateAlertServiceUuid);
  stream.printf("CHAR_2A06=%s\n", BlueTagConfig::kImmediateAlertCharUuid);
}
