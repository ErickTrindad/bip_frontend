const { MultiFormatReader, BarcodeFormat, DecodeHintType, RGBLuminanceSource, BinaryBitmap, HybridBinarizer } = require('@zxing/library');
const { Jimp } = require('jimp');

async function testDecode() {
  const image = await Jimp.read('FotoBarcode.jpeg');
  
  function tryDecode(img, description) {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.QR_CODE
    ]);
    // hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new MultiFormatReader();
    reader.setHints(hints);

    const width = img.bitmap.width;
    const height = img.bitmap.height;
    
    // RGBLuminanceSource takes Int32Array
    const rgba = img.bitmap.data; // Buffer
    const int32Data = new Int32Array(width * height);
    for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
      int32Data[j] = (rgba[i] << 16) | (rgba[i+1] << 8) | rgba[i+2]; // Ignore alpha
    }

    const luminanceSource = new RGBLuminanceSource(int32Data, width, height);
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

    try {
      const result = reader.decode(binaryBitmap, hints);
      console.log(`[${description}] SUCCESS:`, result.getText());
      return result.getText();
    } catch (e) {
      console.log(`[${description}] FAILED`);
      return null;
    }
  }

  console.log(`Original Size: ${image.bitmap.width}x${image.bitmap.height}`);
  tryDecode(image, 'Original');

  // Try variations (scaling down, cropping)
  for (const scale of [0.8, 0.5, 0.3]) {
    const resized = image.clone().scale(scale);
    tryDecode(resized, `Scaled ${scale}`);
  }

  // Try center crops
  for (const cropPct of [0.7, 0.5, 0.3]) {
    const w = image.bitmap.width;
    const h = image.bitmap.height;
    const cw = w * cropPct;
    const ch = h * cropPct;
    const cropped = image.clone().crop({ x: (w - cw)/2, y: (h - ch)/2, w: cw, h: ch });
    tryDecode(cropped, `Center Crop ${cropPct}`);
    
    // Cropped and scaled
    const croppedScaled = cropped.clone().scale(0.5);
    tryDecode(croppedScaled, `Center Crop ${cropPct} + Scaled 0.5`);
  }
}

testDecode().catch(console.error);
