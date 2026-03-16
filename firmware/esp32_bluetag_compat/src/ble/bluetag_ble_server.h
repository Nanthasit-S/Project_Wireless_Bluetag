#pragma once

#include <Arduino.h>
#include <Preferences.h>
#include <string>
#include <esp_sleep.h>
#include <BLE2902.h>
#include <BLEAdvertising.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>

#include "config/bluetag_config.h"
#include "controllers/ring_controller.h"

class BlueTagBleServer {
 public:
  explicit BlueTagBleServer(RingController& ring);
  void begin();
  void update();
  void printSerialSummary(Stream& stream) const;
  const std::string& tagId() const { return tagId_; }
  bool bindWebId(const String& webId, String* resolvedHash = nullptr);
  bool unbindWebId(const String& webId, String* resolvedHash = nullptr);
  void technicianReset(String* clearedHash = nullptr);
  const std::string& boundWebIdHash() const { return boundWebIdHash_; }
  bool setSleepModeEnabled(bool enabled);
  bool isSleepModeEnabled() const { return sleepModeEnabled_; }
  void refreshRuntimeState(Stream* stream = nullptr);

 private:
  class RingCharacteristicCallbacks : public BLECharacteristicCallbacks {
   public:
    explicit RingCharacteristicCallbacks(BlueTagBleServer& parent);
    void onWrite(BLECharacteristic* characteristic) override;

   private:
    BlueTagBleServer& parent_;
  };

  class ServerCallbacks : public BLEServerCallbacks {
   public:
    explicit ServerCallbacks(BlueTagBleServer& parent);
    void onConnect(BLEServer* server) override;
    void onDisconnect(BLEServer* server) override;

   private:
    BlueTagBleServer& parent_;
  };

  void handleRingWrite(const std::string& value);
  void publishMode();
  void publishBattery(bool notify);
  void publishAdvertisingPayload();
  void initializeIdentity();
  void loadBindingState();
  void scheduleAdvertisingRestart(uint32_t delayMs = 60);
  void restartAdvertisingNow();
  uint32_t nextBatteryUpdateIntervalMs() const;
  void noteActivity(uint32_t extendMs = BlueTagConfig::kBurstAdvertisingWindowMs);
  bool canEnterTimedLightSleep() const;
  void enterTimedLightSleep();
  std::string resolveWebIdHash(const String& webId) const;
  uint32_t readBatteryMilliVolts() const;
  uint8_t readBatteryPercent() const;
  uint32_t resolveTagHash() const;

  RingController& ring_;
  Preferences preferences_;
  std::string tagId_;
  std::string boundWebIdHash_;
  BLECharacteristic* primaryChar_ = nullptr;
  BLECharacteristic* secondaryChar_ = nullptr;
  BLECharacteristic* legacyChar_ = nullptr;
  BLECharacteristic* fallbackChar_ = nullptr;
  BLECharacteristic* immediateAlertChar_ = nullptr;
  BLECharacteristic* batteryChar_ = nullptr;
  bool centralConnected_ = false;
  bool sleepModeEnabled_ = BlueTagConfig::kSleepModeDefaultEnabled;
  bool advertisingRestartPending_ = false;
  uint8_t lastBatteryPercent_ = 0;
  uint32_t advCounter_ = 0;
  uint32_t nextBatterySampleAtMs_ = 0;
  uint32_t nextAdvertisingRestartAtMs_ = 0;
  uint32_t stayAwakeUntilMs_ = 0;
  RingCharacteristicCallbacks ringCharCallbacks_;
  ServerCallbacks serverCallbacks_;
};
