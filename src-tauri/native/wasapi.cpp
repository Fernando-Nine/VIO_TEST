// WASAPI process loopback (Windows 11). No files, network or global audio hook.
#define NOMINMAX
#include <windows.h>
#include <audioclient.h>
#include <audioclientactivationparams.h>
#include <mmdeviceapi.h>
#include <bcrypt.h>
#include <wrl.h>
#include <tlhelp32.h>
#include <algorithm>
#include <atomic>
#include <chrono>
#include <condition_variable>
#include <memory>
#include <mutex>
#include <set>
#include <thread>
#include "wasapi.h"
#include "ring.hpp"

using Microsoft::WRL::ComPtr;
struct Handle {
  HANDLE value = nullptr;
  explicit Handle(HANDLE h = nullptr) : value(h) {}
  ~Handle() { if (value && value != INVALID_HANDLE_VALUE) CloseHandle(value); }
  Handle(const Handle&) = delete;
  Handle& operator=(const Handle&) = delete;
  HANDLE release() { auto result = value; value = nullptr; return result; }
};
static uint64_t processStarted(HANDLE process) {
  FILETIME created{}, exited{}, kernel{}, user{};
  if (!GetProcessTimes(process, &created, &exited, &kernel, &user)) return 0;
  return (uint64_t(created.dwHighDateTime) << 32) | created.dwLowDateTime;
}
uint32_t vio_windows_build() {
  using Version = LONG(WINAPI*)(OSVERSIONINFOW*);
  auto version = reinterpret_cast<Version>(GetProcAddress(GetModuleHandleW(L"ntdll.dll"), "RtlGetVersion"));
  OSVERSIONINFOW info{};
  info.dwOSVersionInfoSize = sizeof(info);
  return version && version(&info) == 0 ? info.dwBuildNumber : 0;
}
bool vio_random(uint8_t* output, uint32_t length) {
  return length <= 64 && BCryptGenRandom(nullptr, output, length, BCRYPT_USE_SYSTEM_PREFERRED_RNG) == 0;
}
struct Enumeration {
  VioSource* output;
  uint32_t capacity, count = 0;
  std::set<DWORD> excluded, seen;
};
uint32_t vio_sources(VioSource* output, uint32_t capacity) {
  Enumeration list{output, std::min(capacity, 128u)};
  list.excluded.insert(GetCurrentProcessId());
  Handle snapshot(CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0));
  if (snapshot.value != INVALID_HANDLE_VALUE) {
    // Exclude this host and all of its WebView2 subprocesses.
    bool changed = true;
    while (changed) {
      changed = false;
      PROCESSENTRY32W entry{};
      entry.dwSize = sizeof(entry);
      if (Process32FirstW(snapshot.value, &entry)) do {
        if (list.excluded.count(entry.th32ParentProcessID) && list.excluded.insert(entry.th32ProcessID).second)
          changed = true;
      } while (Process32NextW(snapshot.value, &entry));
    }
  }
  EnumWindows([](HWND window, LPARAM data) -> BOOL {
    auto& list = *reinterpret_cast<Enumeration*>(data);
    if (list.count >= list.capacity) return FALSE;
    if (!IsWindowVisible(window) || (GetWindowLongPtrW(window, GWL_EXSTYLE) & WS_EX_TOOLWINDOW)) return TRUE;
    DWORD pid = 0;
    GetWindowThreadProcessId(window, &pid);
    if (!pid || list.excluded.count(pid) || list.seen.count(pid)) return TRUE;
    VioSource source{};
    if (!GetWindowTextW(window, reinterpret_cast<wchar_t*>(source.title), 256)) return TRUE;
    Handle process(OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | SYNCHRONIZE, FALSE, pid));
    if (!process.value || !(source.started = processStarted(process.value))) return TRUE;
    source.window = reinterpret_cast<uint64_t>(window);
    source.pid = pid;
    list.output[list.count++] = source;
    list.seen.insert(pid);
    return TRUE;
  }, reinterpret_cast<LPARAM>(&list));
  return list.count;
}

// The callback owns its event and COM reference, even if activation times out.
// It must never retain a pointer into the capture worker's stack.
class Activation final : public Microsoft::WRL::RuntimeClass<
  Microsoft::WRL::RuntimeClassFlags<Microsoft::WRL::ClassicCom>,
  IActivateAudioInterfaceCompletionHandler, Microsoft::WRL::FtmBase> {
public:
  Handle ready{CreateEventW(nullptr, TRUE, FALSE, nullptr)};
  HRESULT result = E_PENDING;
  ComPtr<IAudioClient> client;
  STDMETHODIMP ActivateCompleted(IActivateAudioInterfaceAsyncOperation* operation) override {
    ComPtr<IUnknown> unknown;
    HRESULT activated = E_FAIL;
    result = operation->GetActivateResult(&activated, &unknown);
    if (SUCCEEDED(result)) result = activated;
    if (SUCCEEDED(result)) result = unknown.As(&client);
    SetEvent(ready.value);
    return S_OK;
  }
};
class Capture {
  Handle stopEvent{CreateEventW(nullptr, TRUE, FALSE, nullptr)};
  Handle samplesEvent{CreateEventW(nullptr, FALSE, FALSE, nullptr)};
  Handle process;
  DWORD pid;
  std::thread worker;
  std::mutex mutex;
  std::condition_variable available;
  AudioRing<9600> ring;
  uint32_t state = 0, error = 0, sequence = 0;
  std::atomic<bool> stopping{false};
  void finish(HRESULT hr) {
    std::lock_guard<std::mutex> lock(mutex);
    state = stopping || SUCCEEDED(hr) ? 2 : 3;
    error = FAILED(hr) && !stopping ? static_cast<uint32_t>(hr) : 0;
    ring.clear();
    available.notify_all();
  }
  HRESULT run() {
    AUDIOCLIENT_ACTIVATION_PARAMS parameters{};
    parameters.ActivationType = AUDIOCLIENT_ACTIVATION_TYPE_PROCESS_LOOPBACK;
    parameters.ProcessLoopbackParams.TargetProcessId = pid;
    parameters.ProcessLoopbackParams.ProcessLoopbackMode = PROCESS_LOOPBACK_MODE_INCLUDE_TARGET_PROCESS_TREE;
    PROPVARIANT property{};
    property.vt = VT_BLOB;
    property.blob.cbSize = sizeof(parameters);
    property.blob.pBlobData = reinterpret_cast<BYTE*>(&parameters);
    auto activation = Microsoft::WRL::Make<Activation>();
    if (!activation || !activation->ready.value) return E_OUTOFMEMORY;
    ComPtr<IActivateAudioInterfaceAsyncOperation> operation;
    auto hr = ActivateAudioInterfaceAsync(VIRTUAL_AUDIO_DEVICE_PROCESS_LOOPBACK,
      __uuidof(IAudioClient), &property, activation.Get(), &operation);
    if (FAILED(hr)) return hr;
    HANDLE activateEvents[] = {stopEvent.value, activation->ready.value};
    const auto activated = WaitForMultipleObjects(2, activateEvents, FALSE, 5000);
    if (activated == WAIT_OBJECT_0) return S_OK;
    if (activated != WAIT_OBJECT_0 + 1) return HRESULT_FROM_WIN32(ERROR_TIMEOUT);
    if (FAILED(activation->result)) return activation->result;
    auto client = activation->client;
    WAVEFORMATEX format{};
    format.wFormatTag = WAVE_FORMAT_PCM;
    format.nChannels = 2;
    format.nSamplesPerSec = 48000;
    format.wBitsPerSample = 16;
    format.nBlockAlign = 4;
    format.nAvgBytesPerSec = 192000;
    hr = client->Initialize(AUDCLNT_SHAREMODE_SHARED,
      AUDCLNT_STREAMFLAGS_LOOPBACK | AUDCLNT_STREAMFLAGS_EVENTCALLBACK | AUDCLNT_STREAMFLAGS_AUTOCONVERTPCM,
      0, 0, &format, nullptr);
    if (FAILED(hr)) return hr;
    ComPtr<IAudioCaptureClient> reader;
    hr = client->GetService(IID_PPV_ARGS(&reader));
    if (FAILED(hr)) return hr;
    if (FAILED(hr = client->SetEventHandle(samplesEvent.value))) return hr;
    if (FAILED(hr = client->Start())) return hr;
    {
      std::lock_guard<std::mutex> lock(mutex);
      state = 1;
      available.notify_all();
    }
    HANDLE events[] = {stopEvent.value, process.value, samplesEvent.value};
    while (!stopping) {
      const auto event = WaitForMultipleObjects(3, events, FALSE, 1000);
      if (event == WAIT_OBJECT_0 || event == WAIT_OBJECT_0 + 1) break;
      if (event == WAIT_TIMEOUT) continue;
      if (event != WAIT_OBJECT_0 + 2) { hr = E_FAIL; break; }
      UINT32 frames = 0;
      while (!stopping && SUCCEEDED(hr = reader->GetNextPacketSize(&frames)) && frames) {
        BYTE* bytes = nullptr;
        DWORD flags = 0;
        hr = reader->GetBuffer(&bytes, &frames, &flags, nullptr, nullptr);
        if (FAILED(hr)) break;
        {
          std::lock_guard<std::mutex> lock(mutex);
          if (flags & AUDCLNT_BUFFERFLAGS_DATA_DISCONTINUITY) {
            ring.clear();
            ++ring.dropped;
          }
          ring.push(reinterpret_cast<int16_t*>(bytes), frames, (flags & AUDCLNT_BUFFERFLAGS_SILENT) != 0);
          available.notify_one();
        }
        hr = reader->ReleaseBuffer(frames);
        if (FAILED(hr)) break;
      }
      if (FAILED(hr)) break;
    }
    client->Stop();
    return hr;
  }
public:
  Capture(HANDLE selected, DWORD selectedPid) : process(selected), pid(selectedPid) {}
  bool start() {
    if (!stopEvent.value || !samplesEvent.value) return false;
    worker = std::thread([this] {
      const auto hr = CoInitializeEx(nullptr, COINIT_MULTITHREADED);
      if (FAILED(hr)) { finish(hr); return; }
      try { finish(run()); } catch (...) { finish(E_FAIL); }
      CoUninitialize();
    });
    return true;
  }
  void stop() {
    stopping = true;
    SetEvent(stopEvent.value);
    available.notify_all();
  }
  VioPacket read(float* output, uint32_t frames) {
    std::unique_lock<std::mutex> lock(mutex);
    available.wait_for(lock, std::chrono::milliseconds(20), [this] {
      return ring.size() >= 480 || state >= 2 || stopping;
    });
    const auto copied = stopping ? 0 : ring.read(output, std::min(frames, 4800u));
    return {stopping ? 2u : state, sequence++, ring.dropped, static_cast<uint32_t>(copied), error};
  }
  ~Capture() { stop(); if (worker.joinable()) worker.join(); }
};
void* vio_capture_create(const VioSource* source) {
  if (!source || vio_windows_build() < 22000 || source->pid == GetCurrentProcessId()) return nullptr;
  DWORD current = 0;
  const auto window = reinterpret_cast<HWND>(source->window);
  if (!IsWindow(window) || !GetWindowThreadProcessId(window, &current) || current != source->pid) return nullptr;
  Handle process(OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | SYNCHRONIZE, FALSE, source->pid));
  if (!process.value) return nullptr;
  if (processStarted(process.value) != source->started || WaitForSingleObject(process.value, 0) != WAIT_TIMEOUT) {
    return nullptr;
  }
  try {
    auto capture = std::make_unique<Capture>(process.value, source->pid);
    process.release();
    if (!capture->start()) return nullptr;
    return capture.release();
  } catch (...) { return nullptr; }
}
void vio_capture_stop(void* capture) { if (capture) static_cast<Capture*>(capture)->stop(); }
VioPacket vio_capture_read(void* capture, float* output, uint32_t frames) {
  return static_cast<Capture*>(capture)->read(output, frames);
}
void vio_capture_destroy(void* capture) { delete static_cast<Capture*>(capture); }
