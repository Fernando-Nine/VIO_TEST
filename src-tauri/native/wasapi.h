#pragma once
#include <stdint.h>

extern "C" {
struct VioSource {
  uint64_t window;
  uint64_t started;
  uint32_t pid;
  uint16_t title[256];
};
// State: 0 = starting, 1 = running, 2 = stopped, 3 = error.
struct VioPacket {
  uint32_t state, sequence, dropped, frames, error;
};
uint32_t vio_windows_build();
uint32_t vio_sources(VioSource* output, uint32_t capacity);
bool vio_random(uint8_t* output, uint32_t length);
void* vio_capture_create(const VioSource* source);
void vio_capture_stop(void* capture);
VioPacket vio_capture_read(void* capture, float* output, uint32_t frames);
void vio_capture_destroy(void* capture);
}
