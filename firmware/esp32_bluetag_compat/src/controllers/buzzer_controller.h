#pragma once

#include <Arduino.h>

class BuzzerController {
 public:
  BuzzerController(int primaryPin,
                   int secondaryPin,
                   int ledcChannel,
                   int ledcResolutionBits,
                   int baseFreqHz,
                   int dutyOn,
                   bool useActiveBuzzer,
                   bool activeLow);

  void begin();
  void setEnabled(bool enabled);
  void setToneFrequency(int freqHz);
  bool usesActiveBuzzer() const;

 private:
  const int primaryPin_;
  const int secondaryPin_;
  const int ledcChannel_;
  const int ledcResolutionBits_;
  const int baseFreqHz_;
  const int dutyOn_;
  const bool useActiveBuzzer_;
  const bool activeLow_;

  int currentFreqHz_;
  bool primaryAttached_ = false;
};
