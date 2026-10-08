import sharp from 'sharp';

/** Matches canvas.drawImage: preserve the complete upper icon and stretch to the descriptor. */
export async function colorFingerprint(bytes: Buffer): Promise<string> {
  const metadata = await sharp(bytes).metadata();
  if (!metadata.width || !metadata.height) throw new Error('Ícone sem dimensões.');
  const raw = await sharp(bytes)
    .flatten({ background: '#000000' })
    .extract({
      left: 0,
      top: 0,
      width: metadata.width,
      height: Math.max(1, Math.floor(metadata.height * 0.8)),
    })
    .resize(8, 8, { fit: 'fill', kernel: 'cubic' })
    .removeAlpha()
    .toColourspace('srgb')
    .raw()
    .toBuffer();
  if (raw.length !== 192) throw new Error('Assinatura de cor inválida.');
  return raw.toString('base64');
}
