// Global type declaration for BarcodeDetector Web API
declare global {
  class BarcodeDetector {
    constructor(options?: { formats: string[] });
    static getSupportedFormats(): Promise<string[]>;
    detect(image: ImageBitmapSource): Promise<Array<{ rawValue: string; format: string }>>;
  }
}

export {};
