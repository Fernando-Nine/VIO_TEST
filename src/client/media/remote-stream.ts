/** addTrack/removeTrack called by script do not emit MediaStream track events.
 * Consumers keep the same stream object, so explicitly notify them after mutation. */
export function addRemoteTrack(stream: MediaStream, track: MediaStreamTrack) {
  if (stream.getTracks().some((current) => current.id === track.id)) return;
  stream.addTrack(track);
  stream.dispatchEvent(new MediaStreamTrackEvent("addtrack", { track }));
}

export function removeRemoteTrack(
  stream: MediaStream,
  track: MediaStreamTrack,
) {
  if (!stream.getTracks().includes(track)) return;
  stream.removeTrack(track);
  stream.dispatchEvent(new MediaStreamTrackEvent("removetrack", { track }));
}
