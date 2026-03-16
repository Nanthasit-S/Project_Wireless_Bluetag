#pragma once
#include <cstdint>

namespace BlueTagConfig {
static constexpr const char* kTagIdPrefix = "BTAG-";
static constexpr const char* kLegacyAdvertisedName = "BLUETAG";
static constexpr const char* kServiceUuid = "00001910-0000-1000-8000-00805f9b34fb";
static constexpr const char* kRingCharPrimaryUuid = "00002b10-0000-1000-8000-00805f9b34fb";
static constexpr const char* kRingCharSecondaryUuid = "00002b11-0000-1000-8000-00805f9b34fb";
static constexpr const char* kLegacyServiceUuid = "12345678-1234-1234-1234-1234567890ab";
static constexpr const char* kLegacyRingCharUuid = "abcd1234-5678-90ab-cdef-1234567890ab";
static constexpr const char* kFallbackServiceUuid = "0000fff0-0000-1000-8000-00805f9b34fb";
static constexpr const char* kFallbackRingCharUuid = "0000fff1-0000-1000-8000-00805f9b34fb";
static constexpr const char* kImmediateAlertServiceUuid = "00001802-0000-1000-8000-00805f9b34fb";
static constexpr const char* kImmediateAlertCharUuid = "00002a06-0000-1000-8000-00805f9b34fb";
static constexpr const char* kBatteryServiceUuid = "0000180f-0000-1000-8000-00805f9b34fb";
static constexpr const char* kBatteryLevelCharUuid = "00002a19-0000-1000-8000-00805f9b34fb";
static constexpr uint16_t kManufacturerCompanyId = 0x1234;
static constexpr const char* kStorageNamespace = "bluetag";
static constexpr const char* kBoundWebIdHashKey = "bound_web_hash";
static constexpr const char* kSleepModeEnabledKey = "sleep_enabled";
static constexpr uint16_t kAdvertisingMinIntervalUnits = 400;   // 250 ms
static constexpr uint16_t kAdvertisingMaxIntervalUnits = 560;   // 350 ms
static constexpr uint32_t kBurstAdvertisingWindowMs = 120000;
static constexpr uint32_t kLightSleepIntervalMs = 800;
static constexpr bool kSleepModeDefaultEnabled = true;

static constexpr int kBuzzerPinPrimary = 2;
static constexpr int kBuzzerPinSecondary = -1;
static constexpr int kBuzzerLedcChannel = 0;
static constexpr int kBuzzerLedcResBits = 8;
static constexpr int kBuzzerFreqHz = 3200;
static constexpr int kBuzzerFreqAltHz = 4200;
static constexpr int kBuzzerDutyOn = 255;
static constexpr bool kUseActiveBuzzer = true;
static constexpr bool kBuzzerActiveLow = true;
static constexpr uint32_t kRingCommandLeaseMs = 3200;

// Battery reporting:
// - Set kBatteryAdcPin to your VBAT ADC pin (or keep -1 to use fallback percent).
// - If there is a divider on VBAT, set kBatteryAdcScale accordingly (e.g. 2.0f).
// - Use kBatteryAdcOffsetMv to calibrate against a multimeter if needed.
static constexpr int kBatteryAdcPin = 3;
static constexpr int kBatteryAdcAttenuationDb = 11;
static constexpr float kBatteryAdcScale = 2.0f;
static constexpr int kBatteryAdcOffsetMv = 110;
static constexpr int kBatteryMvEmpty = 3300;
static constexpr int kBatteryMvFull = 4200;
static constexpr int kBatteryFallbackPercent = 100;
static constexpr int kBatteryWarmupReads = 2;
static constexpr int kBatterySampleCount = 12;
static constexpr uint32_t kBatterySampleDelayMs = 4;
static constexpr uint32_t kBatteryUpdateIntervalIdleMs = 60000;
static constexpr uint32_t kBatteryUpdateIntervalConnectedMs = 15000;
}  // namespace BlueTagConfig
