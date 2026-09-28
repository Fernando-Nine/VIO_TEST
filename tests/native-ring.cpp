#include "../src-tauri/native/ring.hpp"
#include <cassert>
#include <iostream>
int main() {
  AudioRing<4> queue;
  int16_t first[]{32767, -32768, 16384, -16384, 8192, -8192};
  float output[8]{};
  queue.push(first, 3, false);
  assert(queue.read(output, 2) == 2);
  assert(output[0] > .999f && output[1] == -1 && output[2] == .5f && output[3] == -.5f);
  queue.push(nullptr, 3, true);
  assert(queue.read(output, 4) == 4);
  assert(output[0] == .25f && output[1] == -.25f && output[2] == 0 && output[7] == 0);
  queue.push(first, 3, false);
  queue.push(first, 3, false);
  assert(queue.size() == 4 && queue.dropped == 2);
  queue.read(output, 4);
  assert(output[0] == .25f && output[2] > .999f);
  int16_t oversized[]{1,1,2,2,3,3,4,4,5,5,6,6};
  queue.push(oversized, 6, false);
  assert(queue.size() == 4 && queue.dropped == 4);
  queue.read(output, 4);
  assert(output[0] == 3 / 32768.0f && output[6] == 6 / 32768.0f);
  queue.clear();
  assert(queue.size() == 0 && queue.read(output, 4) == 0);
  std::cout << "PASS: stereo, silence, wraparound, bounded overflow and cleanup\n";
}
