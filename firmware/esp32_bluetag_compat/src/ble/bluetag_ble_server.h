#pragma once

#include <Arduino.h>
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>

#include "controllers/ring_controller.h"

class BlueTagBleServer {
 public:
  explicit BlueTagBleServer(RingController& ring);
  void begin();
  void update();

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
  uint8_t readBatteryPercent() const;

  RingController& ring_;
  BLECharacteristic* primaryChar_ = nullptr;
  BLECharacteristic* secondaryChar_ = nullptr;
  BLECharacteristic* batteryChar_ = nullptr;
  bool centralConnected_ = false;
  uint8_t lastBatteryPercent_ = 0;
  uint32_t nextBatterySampleAtMs_ = 0;
  RingCharacteristicCallbacks ringCharCallbacks_;
  ServerCallbacks serverCallbacks_;
};
