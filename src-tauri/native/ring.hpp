#pragma once
#include <algorithm>
#include <array>
#include <cstdint>

// Interleaved stereo PCM. The caller holds the capture mutex.
// Drop the oldest frames instead of accumulating latency after a slow consumer.
template <size_t Frames> class AudioRing {
  std::array<float, Frames * 2> data_{};
  size_t head_ = 0, size_ = 0;
public:
  uint32_t dropped = 0;
  size_t size() const { return size_; }
  void clear() { head_ = size_ = 0; }
  void push(const int16_t* pcm, size_t frames, bool silent) {
    if (frames > Frames) {
      dropped += static_cast<uint32_t>(frames - Frames);
      if (!silent) pcm += (frames - Frames) * 2;
      frames = Frames;
    }
    const auto discard = size_ + frames > Frames ? size_ + frames - Frames : 0;
    head_ = (head_ + discard) % Frames;
    size_ -= discard;
    dropped += static_cast<uint32_t>(discard);
    for (size_t i = 0; i < frames; ++i) {
      const auto offset = ((head_ + size_ + i) % Frames) * 2;
      for (size_t ch = 0; ch < 2; ++ch)
        data_[offset + ch] = silent ? 0.0f : pcm[i * 2 + ch] / 32768.0f;
    }
    size_ += frames;
  }
  size_t read(float* output, size_t frames) {
    frames = std::min(frames, size_);
    for (size_t i = 0; i < frames; ++i) {
      const auto offset = ((head_ + i) % Frames) * 2;
      output[i * 2] = data_[offset];
      output[i * 2 + 1] = data_[offset + 1];
    }
    head_ = (head_ + frames) % Frames;
    size_ -= frames;
    return frames;
  }
};
