// PDF.js ships its worker as a side-effect module that registers
// `globalThis.pdfjsWorker`. It has no published type declarations, and the
// import exists only to make PDF.js use its in-thread fake worker.
declare module "pdfjs-dist/build/pdf.worker.mjs" {
  export const WorkerMessageHandler: unknown;
}
