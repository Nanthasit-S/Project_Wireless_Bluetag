#include "ble/bluetag_ble_server.h"

#include <cstdio>
#include <cinttypes>

#include "config/bluetag_config.h"

namespace {

float batteryDividerScale() {
  const float top = static_cast<float>(BlueTagConfig::kBatteryDividerTopOhms);
  const float bottom = static_cast<float>(BlueTagConfig::kBatteryDividerBottomOhms);
  if (bottom <= 0.0f) {
    return 1.0f;
  }
  return (top + bottom) / bottom;
}

uint8_t batteryPercentFromCurve(float batteryMv) {
  struct BatteryPoint {
    float mv;
    uint8_t percent;
  };

  // A simple Li-ion discharge curve gives a much more believable percentage than a linear map.
  static constexpr BatteryPoint kCurve[] = {
      {4200.0f, 100},
      {4150.0f, 96},
      {4100.0f, 90},
      {4050.0f, 84},
      {4000.0f, 76},
      {3950.0f, 68},
      {3900.0f, 58},
      {3850.0f, 48},
      {3800.0f, 38},
      {3750.0f, 28},
      {3700.0f, 20},
      {3650.0f, 14},
      {3600.0f, 9},
      {3550.0f, 6},
      {3500.0f, 4},
      {3450.0f, 2},
      {3300.0f, 0},
  };

  if (batteryMv >= kCurve[0].mv) {
    return 100;
  }
  if (batteryMv <= kCurve[sizeof(kCurve) / sizeof(kCurve[0]) - 1].mv) {
    return 0;
  }

  for (size_t i = 0; i + 1 < sizeof(kCurve) / sizeof(kCurve[0]); ++i) {
    const BatteryPoint upper = kCurve[i];
    const BatteryPoint lower = kCurve[i + 1];
    if (batteryMv > upper.mv || batteryMv < lower.mv) {
      continue;
    }

    const float span = upper.mv - lower.mv;
    if (span <= 0.0f) {
      return lower.percent;
    }

    const float ratio = (batteryMv - lower.mv) / span;
    const float percent = static_cast<float>(lower.percent) +
                          (static_cast<float>(upper.percent - lower.percent) * ratio);
    return static_cast<uint8_t>(constrain(static_cast<int>(percent + 0.5f), 0, 100));
  }

  return static_cast<uint8_t>(constrain(BlueTagConfig::kBatteryFallbackPercent, 0, 100));
}

}  // namespace
BlueTagBleServer::BlueTagBleServer(RingController& ring)
    : ring_(ring), ringCharCallbacks_(*this), serverCallbacks_(*this) {}

void BlueTagBleServer::begin() {
  initializeIdentity();
  preferences_.begin(BlueTagConfig::kStorageNamespace, false);
  loadBindingState();
  noteActivity();
  BLEDevice::init(tagId_.c_str());
  BLEServer* server = BLEDevice::createServer();
  server->setCallbacks(&serverCallbacks_);
  BLEService* service = server->createService(BlueTagConfig::kServiceUuid);
  BLEService* legacyService = server->createService(BlueTagConfig::kLegacyServiceUuid);
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

  legacyChar_ = legacyService->createCharacteristic(
      BlueTagConfig::kLegacyRingCharUuid,
      BLECharacteristic::PROPERTY_READ |
          BLECharacteristic::PROPERTY_WRITE |
          BLECharacteristic::PROPERTY_WRITE_NR |
          BLECharacteristic::PROPERTY_NOTIFY);
  legacyChar_->addDescriptor(new BLE2902());
  legacyChar_->setCallbacks(&ringCharCallbacks_);

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
  legacyService->start();
  fallbackService->start();
  immediateAlertService->start();
  batteryService->start();

  if (BlueTagConfig::kBatteryAdcPin >= 0) {
    pinMode(BlueTagConfig::kBatteryAdcPin, INPUT);
  }

  BLEDevice::setPower(ESP_PWR_LVL_N0);
  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  advertising->setMinPreferred(0x12);
  advertising->setMinInterval(BlueTagConfig::kAdvertisingMinIntervalUnits);
  advertising->setMaxInterval(BlueTagConfig::kAdvertisingMaxIntervalUnits);
  advertising->addServiceUUID(BlueTagConfig::kServiceUuid);
  advertising->addServiceUUID(BlueTagConfig::kLegacyServiceUuid);
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
  Serial.printf("[BLE] legacy=%s/%s\n",
                BlueTagConfig::kLegacyServiceUuid,
                BlueTagConfig::kLegacyRingCharUuid);
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
  noteActivity();
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
  noteActivity();
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
  noteActivity();
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
  sleepModeEnabled_ = false;
  preferences_.putBool(BlueTagConfig::kSleepModeEnabledKey, false);
}

bool BlueTagBleServer::setSleepModeEnabled(bool enabled) {
  (void)enabled;
  sleepModeEnabled_ = false;
  noteActivity(BlueTagConfig::kBurstAdvertisingWindowMs * 4);
  preferences_.putBool(BlueTagConfig::kSleepModeEnabledKey, false);
  return false;
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
  if (advertisingRestartPending_ && static_cast<int32_t>(now - nextAdvertisingRestartAtMs_) >= 0) {
    restartAdvertisingNow();
  }

  if (now < nextBatterySampleAtMs_) {
    return;
  }
  nextBatterySampleAtMs_ = now + nextBatteryUpdateIntervalMs();
  publishBattery(centralConnected_);
}

uint32_t BlueTagBleServer::nextBatteryUpdateIntervalMs() const {
  return centralConnected_ ? BlueTagConfig::kBatteryUpdateIntervalConnectedMs
                           : BlueTagConfig::kBatteryUpdateIntervalIdleMs;
}

void BlueTagBleServer::noteActivity(uint32_t extendMs) {
  stayAwakeUntilMs_ = millis() + extendMs;
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
  parent_.advertisingRestartPending_ = false;
  parent_.noteActivity(BlueTagConfig::kBurstAdvertisingWindowMs * 4);
  parent_.publishBattery(true);
  parent_.publishMode();
  Serial.println("[BLE] Central connected");
}

void BlueTagBleServer::ServerCallbacks::onDisconnect(BLEServer* server) {
  (void)server;
  parent_.centralConnected_ = false;
  parent_.noteActivity();
  // Keep current ring mode across transient disconnects.
  // The app intentionally reconnects per write; turning off here causes
  // audible on/off flicker even though no OFF command was sent.
  Serial.println("[BLE] Central disconnected -> keep ring mode, schedule advertising restart");
  parent_.scheduleAdvertisingRestart();
}

void BlueTagBleServer::handleRingWrite(const std::string& value) {
  noteActivity(BlueTagConfig::kBurstAdvertisingWindowMs * 4);
  if (value.empty()) {
    Serial.println("[RING] write empty payload, ignored");
    return;
  }

  uint8_t modeByte = static_cast<uint8_t>(value[0]);
  if (modeByte == 0xFA) {
    String clearedHash;
    technicianReset(&clearedHash);
    ring_.applyMode(RingMode::Off);
    publishMode();
    Serial.printf("[BLE] FACTORY_RESET_OK=%s\n", clearedHash.c_str());
    return;
  }

  if (modeByte == 0xA0) {
    sleepModeEnabled_ = false;
    publishMode();
    Serial.println("[POWER] sleep mode disabled by BLE");
    return;
  }

  if (modeByte == 0xA1) {
    sleepModeEnabled_ = false;
    publishMode();
    Serial.println("[POWER] sleep mode is removed; ON ignored");
    return;
  }

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
  if (legacyChar_ != nullptr) {
    legacyChar_->setValue(&mode, 1);
    if (centralConnected_) {
      legacyChar_->notify();
    }
  }
  if (immediateAlertChar_ != nullptr) {
    immediateAlertChar_->setValue(&mode, 1);
    if (centralConnected_) {
      immediateAlertChar_->notify();
    }
  }
}

void BlueTagBleServer::scheduleAdvertisingRestart(uint32_t delayMs) {
  advertisingRestartPending_ = true;
  nextAdvertisingRestartAtMs_ = millis() + delayMs;
}

void BlueTagBleServer::restartAdvertisingNow() {
  BLEAdvertising* advertising = BLEDevice::getAdvertising();
  if (advertising != nullptr) {
    advertising->stop();
    publishAdvertisingPayload();
  }
  BLEDevice::startAdvertising();
  advertisingRestartPending_ = false;
  Serial.println("[BLE] Advertising restarted");
}

void BlueTagBleServer::refreshRuntimeState(Stream* stream) {
  noteActivity();
  publishBattery(false);
  publishMode();
  scheduleAdvertisingRestart(0);
  if (stream != nullptr) {
    stream->println("REFRESH_OK");
    printSerialSummary(*stream);
    stream->flush();
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

  BLEAdvertisementData advertisementData;
  advertisementData.setName(BlueTagConfig::kLegacyAdvertisedName);
  advertisementData.setManufacturerData(manufacturerData);
  advertising->setAdvertisementData(advertisementData);

  BLEAdvertisementData scanResponse;
  scanResponse.setName(tagId_);
  advertising->setScanResponseData(scanResponse);
}

uint32_t BlueTagBleServer::readBatteryMilliVolts() const {
  if (BlueTagConfig::kBatteryAdcPin < 0) {
    const int fallbackPercent = constrain(BlueTagConfig::kBatteryFallbackPercent, 0, 100);
    return static_cast<uint32_t>(
        BlueTagConfig::kBatteryMvEmpty +
        (((BlueTagConfig::kBatteryMvFull - BlueTagConfig::kBatteryMvEmpty) * fallbackPercent) / 100));
  }

  for (int i = 0; i < BlueTagConfig::kBatteryWarmupReads; ++i) {
    analogReadMilliVolts(BlueTagConfig::kBatteryAdcPin);
    delay(BlueTagConfig::kBatterySampleDelayMs);
  }

  std::vector<int> samples;
  samples.reserve(BlueTagConfig::kBatterySampleCount);
  for (int i = 0; i < BlueTagConfig::kBatterySampleCount; ++i) {
    const int mv = analogReadMilliVolts(BlueTagConfig::kBatteryAdcPin);
    if (mv > 0) {
      samples.push_back(mv);
    }
    delay(BlueTagConfig::kBatterySampleDelayMs);
  }

  if (samples.empty()) {
    const int fallbackPercent = constrain(BlueTagConfig::kBatteryFallbackPercent, 0, 100);
    return static_cast<uint32_t>(
        BlueTagConfig::kBatteryMvEmpty +
        (((BlueTagConfig::kBatteryMvFull - BlueTagConfig::kBatteryMvEmpty) * fallbackPercent) / 100));
  }

  std::sort(samples.begin(), samples.end());

  int trimmedSum = 0;
  int trimmedCount = 0;
  size_t startIndex = 0;
  size_t endIndex = samples.size();
  if (samples.size() >= 7) {
    startIndex = 2;
    endIndex = samples.size() - 2;
  } else if (samples.size() >= 5) {
    startIndex = 1;
    endIndex = samples.size() - 1;
  }

  for (size_t i = startIndex; i < endIndex; ++i) {
    trimmedSum += samples[i];
    trimmedCount += 1;
  }

  if (trimmedCount <= 0) {
    const int fallbackPercent = constrain(BlueTagConfig::kBatteryFallbackPercent, 0, 100);
    return static_cast<uint32_t>(
        BlueTagConfig::kBatteryMvEmpty +
        (((BlueTagConfig::kBatteryMvFull - BlueTagConfig::kBatteryMvEmpty) * fallbackPercent) / 100));
  }

  const float measuredMv = static_cast<float>(trimmedSum) / static_cast<float>(trimmedCount);
  const float batteryMv =
      (measuredMv * batteryDividerScale()) + static_cast<float>(BlueTagConfig::kBatteryAdcOffsetMv);
  return static_cast<uint32_t>(std::max(0, static_cast<int>(batteryMv + 0.5f)));
}
uint8_t BlueTagBleServer::readBatteryPercent() const {
  const uint32_t batteryMv = readBatteryMilliVolts();
  return batteryPercentFromCurve(static_cast<float>(batteryMv));
}

void BlueTagBleServer::publishBattery(bool notify) {
  if (batteryChar_ == nullptr) {
    return;
  }

  const uint32_t batteryMv = readBatteryMilliVolts();
  const uint8_t batteryPercent = batteryPercentFromCurve(static_cast<float>(batteryMv));
  if (batteryPercent == lastBatteryPercent_ && batteryMv == lastBatteryMilliVolts_ && !notify) {
    return;
  }

  lastBatteryPercent_ = batteryPercent;
  lastBatteryMilliVolts_ = batteryMv;
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
  stream.printf("SLEEP_MODE=%s\n", sleepModeEnabled_ ? "ON" : "OFF");
  stream.printf("BATTERY=%u\n", static_cast<unsigned>(lastBatteryPercent_));
  stream.printf("BATTERY_MV=%lu\n", static_cast<unsigned long>(lastBatteryMilliVolts_));
  stream.printf("DEVICE_NAME=%s\n", BlueTagConfig::kLegacyAdvertisedName);
  stream.printf("SERVICE_1910=%s\n", BlueTagConfig::kServiceUuid);
  stream.printf("CHAR_2B10=%s\n", BlueTagConfig::kRingCharPrimaryUuid);
  stream.printf("CHAR_2B11=%s\n", BlueTagConfig::kRingCharSecondaryUuid);
  stream.printf("SERVICE_LEGACY=%s\n", BlueTagConfig::kLegacyServiceUuid);
  stream.printf("CHAR_LEGACY=%s\n", BlueTagConfig::kLegacyRingCharUuid);
  stream.printf("SERVICE_FFF0=%s\n", BlueTagConfig::kFallbackServiceUuid);
  stream.printf("CHAR_FFF1=%s\n", BlueTagConfig::kFallbackRingCharUuid);
  stream.printf("SERVICE_IAS=%s\n", BlueTagConfig::kImmediateAlertServiceUuid);
  stream.printf("CHAR_2A06=%s\n", BlueTagConfig::kImmediateAlertCharUuid);
}
