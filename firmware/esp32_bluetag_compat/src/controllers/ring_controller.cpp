#include "controllers/ring_controller.h"

#include "config/bluetag_config.h"

RingController::RingController(BuzzerController& buzzer) : buzzer_(buzzer) {}

void RingController::applyMode(RingMode mode) {
  const uint32_t now = millis();
  if (mode == state_.mode) {
    if (mode != RingMode::Off) {
      state_.toneLeaseExpiresAtMs = now + BlueTagConfig::kRingCommandLeaseMs;
    }
    return;
  }

  state_.mode = mode;
  state_.toneOn = false;
  state_.toneNextToggleAtMs = 0;
  state_.toneNextHopAtMs = 0;
  state_.toneLeaseExpiresAtMs = 0;
  state_.useAltFreq = false;
  buzzer_.setToneFrequency(BlueTagConfig::kBuzzerFreqHz);

  if (mode == RingMode::Off) {
    buzzer_.setEnabled(false);
  } else {
    state_.toneLeaseExpiresAtMs = now + BlueTagConfig::kRingCommandLeaseMs;
    if (mode == RingMode::Fast) {
      // Keep FAST as short repeating pulses that continue locally on device,
      // so the sound stays steady without turning into one long held tone.
      buzzer_.setEnabled(true);
      state_.toneOn = true;
      state_.toneNextToggleAtMs = now + 28;
      state_.toneNextHopAtMs = now + 60;
    } else {
      // Start pattern immediately; cadence continues locally on device
      // and is not tied to BLE packet timing.
      buzzer_.setEnabled(true);
      state_.toneOn = true;
      state_.toneNextToggleAtMs = now + 100;
      state_.toneNextHopAtMs = now + 70;
    }
  }

  Serial.printf("[RING] mode=%u\n", static_cast<uint8_t>(mode));
}

void RingController::update() {
  if (state_.mode == RingMode::Off) {
    return;
  }

  const uint32_t now = millis();
  if (state_.toneLeaseExpiresAtMs != 0 && static_cast<int32_t>(now - state_.toneLeaseExpiresAtMs) >= 0) {
    Serial.println("[RING] lease expired -> auto off");
    applyMode(RingMode::Off);
    return;
  }

  if (state_.mode == RingMode::Fast) {
    if (now >= state_.toneNextToggleAtMs) {
      state_.toneOn = !state_.toneOn;
      buzzer_.setEnabled(state_.toneOn);
      const uint32_t onMs = 28;
      const uint32_t offMs = 42;
      state_.toneNextToggleAtMs = now + (state_.toneOn ? onMs : offMs);

      if (state_.toneOn) {
        state_.toneNextHopAtMs = now + 60;
      }
    }

    if (!buzzer_.usesActiveBuzzer() && state_.toneOn && now >= state_.toneNextHopAtMs) {
      state_.useAltFreq = !state_.useAltFreq;
      buzzer_.setToneFrequency(state_.useAltFreq ? BlueTagConfig::kBuzzerFreqAltHz
                                                 : BlueTagConfig::kBuzzerFreqHz);
      state_.toneNextHopAtMs = now + 60;
    }
    return;
  }

  if (now >= state_.toneNextToggleAtMs) {
    state_.toneOn = !state_.toneOn;
    buzzer_.setEnabled(state_.toneOn);

    const uint32_t onMs = 100;
    const uint32_t offMs = 140;
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
