const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputPath = path.join(__dirname, '../public/logo/logo.png');
const outputDir = path.join(__dirname, '../public/icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(inputPath)
      .resize(size, size, { fit: 'contain', background: { r: 13, g: 18, b: 37, alpha: 1 } })
      .png()
      .toFile(outputPath);
    console.log(`Generated: icon-${size}x${size}.png`);
  }

  // Generate favicon.ico (32x32)
  const faviconPath = path.join(__dirname, '../public/favicon.ico');
  await sharp(inputPath)
    .resize(32, 32, { fit: 'contain', background: { r: 13, g: 18, b: 37, alpha: 1 } })
    .png()
    .toFile(faviconPath);
  console.log('Generated: favicon.ico');
}

generateIcons().then(() => {
  console.log('All icons generated successfully!');
}).catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
