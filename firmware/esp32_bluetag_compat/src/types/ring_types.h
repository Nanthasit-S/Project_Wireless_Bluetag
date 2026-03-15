#pragma once

#include <Arduino.h>

enum class RingMode : uint8_t {
  Off = 0,
  Slow = 1,
  Fast = 2,
};

struct RingState {
  RingMode mode = RingMode::Off;
  bool toneOn = false;
  uint32_t toneNextToggleAtMs = 0;
  uint32_t toneNextHopAtMs = 0;
  bool useAltFreq = false;
};
