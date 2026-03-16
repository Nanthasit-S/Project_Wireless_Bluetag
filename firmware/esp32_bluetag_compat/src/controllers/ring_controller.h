#pragma once

#include "controllers/buzzer_controller.h"
#include "types/ring_types.h"

class RingController {
 public:
  explicit RingController(BuzzerController& buzzer);

  void applyMode(RingMode mode);
  void update();
  RingMode currentMode() const;

 private:
  BuzzerController& buzzer_;
  RingState state_;
};
