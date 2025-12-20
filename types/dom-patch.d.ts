// /types/dom-patch.d.ts
declare global {
  interface AnalyserNode {
    getByteTimeDomainData(array: Uint8Array<ArrayBufferLike>): void;
    getByteFrequencyData(array: Uint8Array<ArrayBufferLike>): void;
  }
}
export {};
