import sharp from "sharp";

export async function embedLSB(imageBuffer: Buffer, payloadBuffer: Buffer): Promise<Buffer> {
  const img = await sharp(imageBuffer).raw().toBuffer({ resolveWithObject: true });
  const { data, info } = img;
  const width = info.width;
  const height = info.height;
  const channels = info.channels;

  const lengthHeader = Buffer.alloc(4);
  lengthHeader.writeUInt32BE(payloadBuffer.length, 0);
  const fullPayload = Buffer.concat([lengthHeader, payloadBuffer]);

  const totalPixels = width * height;
  const maxCapacity = totalPixels * channels; 

  if (fullPayload.length * 8 > maxCapacity) {
    throw new Error('Payload too large for image capacity');
  }

  const out = Buffer.from(data); 

  let payloadIdx = 0;
  let bitIdx = 0;

  for (let i = 0; i < out.length && payloadIdx < fullPayload.length; i++) {
    const byte = fullPayload[payloadIdx];
    for (let b = 0; b < 8 && payloadIdx < fullPayload.length; b++) {
      if (bitIdx >= out.length) break;
      const bit = (byte >> (7 - b)) & 1;
      out[bitIdx] = (out[bitIdx] & 0xFE) | bit; // set LSB
      bitIdx++;
    }
    payloadIdx++;
  }

  const png = await sharp(out, { raw: { width, height, channels } }).png().toBuffer();
  return png;
}

export async function extractLSB(imageBuffer: Buffer): Promise<Buffer> {
  const img = await sharp(imageBuffer).raw().toBuffer({ resolveWithObject: true });
  const { data } = img;

  let length = 0;
  for (let i = 0; i < 32; i++) {
    const bit = data[i] & 1;
    length |= bit << (31 - i);
  }

  const payload: number[] = [];
  let bitIdx = 32; 
  for (let byteIdx = 0; byteIdx < length; byteIdx++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      if (bitIdx >= data.length) break;
      const bit = data[bitIdx] & 1;
      byte |= bit << (7 - b);
      bitIdx++;
    }
    payload.push(byte);
  }

  return Buffer.from(payload);
}
