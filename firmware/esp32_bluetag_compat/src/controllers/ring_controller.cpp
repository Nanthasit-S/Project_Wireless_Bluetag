#include "controllers/ring_controller.h"

#include "config/bluetag_config.h"

RingController::RingController(BuzzerController& buzzer) : buzzer_(buzzer) {}

void RingController::applyMode(RingMode mode) {
  if (mode == state_.mode) {
    return;
  }

  state_.mode = mode;
  state_.toneOn = false;
  state_.toneNextToggleAtMs = 0;
  state_.toneNextHopAtMs = 0;
  state_.useAltFreq = false;
  buzzer_.setToneFrequency(BlueTagConfig::kBuzzerFreqHz);

  if (mode == RingMode::Off) {
    buzzer_.setEnabled(false);
  } else {
    // Start pattern immediately; cadence continues locally on device
    // and is not tied to BLE packet timing.
    buzzer_.setEnabled(true);
    state_.toneOn = true;
    const uint32_t onMs = (mode == RingMode::Fast) ? 20 : 100;
    state_.toneNextToggleAtMs = millis() + onMs;
    state_.toneNextHopAtMs = millis() + 70;
  }

  Serial.printf("[RING] mode=%u\n", static_cast<uint8_t>(mode));
}

void RingController::update() {
  if (state_.mode == RingMode::Off) {
    return;
  }

  const uint32_t now = millis();
  if (now >= state_.toneNextToggleAtMs) {
    state_.toneOn = !state_.toneOn;
    buzzer_.setEnabled(state_.toneOn);

    const uint32_t onMs = (state_.mode == RingMode::Fast) ? 20 : 100;
    const uint32_t offMs = (state_.mode == RingMode::Fast) ? 20 : 140;
    state_.toneNextToggleAtMs = now + (state_.toneOn ? onMs : offMs);

    if (state_.toneOn) {
      state_.toneNextHopAtMs = now + 70;
    }
  }

  if (!buzzer_.usesActiveBuzzer() && state_.toneOn && now >= state_.toneNextHopAtMs) {
    state_.useAltFreq = !state_.useAltFreq;
    buzzer_.setToneFrequency(state_.useAltFreq ? BlueTagConfig::kBuzzerFreqAltHz
                                               : BlueTagConfig::kBuzzerFreqHz);
    state_.toneNextHopAtMs = now + 70;
  }
}

RingMode RingController::currentMode() const { return state_.mode; }
