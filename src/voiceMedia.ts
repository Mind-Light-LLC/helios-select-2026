export async function requestMicrophone(generation: number, currentGeneration: () => number): Promise<MediaStream> {
  return new Promise<MediaStream>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      settled = true;
      reject(new Error('Microphone access timed out. You can continue by typing.'));
    }, 8000);
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then((stream) => {
      window.clearTimeout(timer);
      if (settled || generation !== currentGeneration()) {
        stream.getTracks().forEach((track) => track.stop());
        if (!settled) { settled = true; reject(new Error('Microphone request cancelled.')); }
        return;
      }
      settled = true;
      resolve(stream);
    }).catch((cause: unknown) => {
      window.clearTimeout(timer);
      if (settled) return;
      settled = true;
      reject(cause);
    });
  });
}
