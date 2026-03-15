#include "controllers/buzzer_controller.h"

BuzzerController::BuzzerController(int primaryPin,
                                   int secondaryPin,
                                   int ledcChannel,
                                   int ledcResolutionBits,
                                   int baseFreqHz,
                                   int dutyOn,
                                   bool useActiveBuzzer,
                                   bool activeLow)
    : primaryPin_(primaryPin),
      secondaryPin_(secondaryPin),
      ledcChannel_(ledcChannel),
      ledcResolutionBits_(ledcResolutionBits),
      baseFreqHz_(baseFreqHz),
      dutyOn_(dutyOn),
      useActiveBuzzer_(useActiveBuzzer),
      activeLow_(activeLow),
      currentFreqHz_(baseFreqHz) {}

void BuzzerController::begin() {
  if (!useActiveBuzzer_) {
    ledcSetup(ledcChannel_, baseFreqHz_, ledcResolutionBits_);
    if (secondaryPin_ >= 0) {
      pinMode(secondaryPin_, OUTPUT);
      ledcAttachPin(secondaryPin_, ledcChannel_);
    }
  }
  pinMode(primaryPin_, INPUT);
  setEnabled(false);
}

void BuzzerController::setEnabled(bool enabled) {
  if (useActiveBuzzer_) {
    pinMode(primaryPin_, OUTPUT);
    const int onLevel = activeLow_ ? LOW : HIGH;
    const int offLevel = activeLow_ ? HIGH : LOW;
    digitalWrite(primaryPin_, enabled ? onLevel : offLevel);
    return;
  }

  if (enabled) {
    if (!primaryAttached_) {
      pinMode(primaryPin_, OUTPUT);
      ledcAttachPin(primaryPin_, ledcChannel_);
      primaryAttached_ = true;
    }
    ledcWriteTone(ledcChannel_, currentFreqHz_);
    ledcWrite(ledcChannel_, dutyOn_);
    return;
  }

  if (primaryAttached_) {
    ledcWrite(ledcChannel_, 0);
    ledcDetachPin(primaryPin_);
    primaryAttached_ = false;
  }
  // Hi-Z off: prevents constant buzz on boards with inverted buzzer circuits.
  pinMode(primaryPin_, INPUT);
}

void BuzzerController::setToneFrequency(int freqHz) {
  currentFreqHz_ = freqHz;
  if (!useActiveBuzzer_ && primaryAttached_) {
    ledcWriteTone(ledcChannel_, currentFreqHz_);
  }
}

bool BuzzerController::usesActiveBuzzer() const { return useActiveBuzzer_; }
