const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Source image
const sourceImage = path.join(__dirname, '../public/FloHub_Logo_Transparent.png');

// Regular icon sizes
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Generate regular icons
sizes.forEach(size => {
  sharp(sourceImage)
    .resize(size, size)
    .toFile(path.join(iconsDir, `icon-${size}x${size}.png`))
    .then(() => console.log(`Generated icon-${size}x${size}.png`))
    .catch(err => console.error(`Error generating icon-${size}x${size}.png:`, err));
});

// Generate maskable icons (with padding to ensure the logo is within the safe area)
[192, 512].forEach(size => {
  // For maskable icons, we add padding to ensure the logo is within the safe area
  const padding = Math.floor(size * 0.1); // 10% padding
  const logoSize = size - (padding * 2);
  
  sharp(sourceImage)
    .resize(logoSize, logoSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
    })
    .toFile(path.join(iconsDir, `maskable-icon-${size}x${size}.png`))
    .then(() => console.log(`Generated maskable-icon-${size}x${size}.png`))
    .catch(err => console.error(`Error generating maskable-icon-${size}x${size}.png:`, err));
});

// Apple icon sizes
const appleSizes = [152, 167, 180];

// Generate Apple icons
appleSizes.forEach(size => {
  sharp(sourceImage)
    .resize(size, size)
    .toFile(path.join(iconsDir, `apple-icon-${size}x${size}.png`))
    .then(() => console.log(`Generated apple-icon-${size}x${size}.png`))
    .catch(err => console.error(`Error generating apple-icon-${size}x${size}.png:`, err));
});

// Also create a generic apple-icon-180.png
sharp(sourceImage)
  .resize(180, 180)
  .toFile(path.join(iconsDir, `apple-icon-180.png`))
  .then(() => console.log(`Generated apple-icon-180.png`))
  .catch(err => console.error(`Error generating apple-icon-180.png:`, err));

// Apple splash screen sizes
const appleSplashSizes = [
  { width: 2048, height: 2732 }, // iPad Pro 12.9"
  { width: 1668, height: 2388 }, // iPad Pro 11"
  { width: 1536, height: 2048 }, // iPad Air 10.5"
  { width: 1125, height: 2436 }, // iPhone X/XS
  { width: 1242, height: 2688 }, // iPhone XS Max
  { width: 828, height: 1792 },  // iPhone XR
  { width: 750, height: 1334 },  // iPhone 8/7/6s/6
  { width: 640, height: 1136 }   // iPhone SE
];

// Generate Apple splash screens
appleSplashSizes.forEach(({ width, height }) => {
  // Create a white background
  sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
    }
  })
    .toBuffer()
    .then(buffer => {
      // Resize the logo to be 30% of the smallest dimension
      const logoSize = Math.floor(Math.min(width, height) * 0.3);
      
      return sharp(sourceImage)
        .resize(logoSize, logoSize)
        .toBuffer()
        .then(logoBuffer => {
          // Composite the logo onto the background
          return sharp(buffer)
            .composite([{
              input: logoBuffer,
              gravity: 'center'
            }])
            .toFile(path.join(iconsDir, `apple-splash-${width}-${height}.png`));
        });
    })
    .then(() => console.log(`Generated apple-splash-${width}-${height}.png`))
    .catch(err => console.error(`Error generating apple-splash-${width}-${height}.png:`, err));
});

console.log('PWA icon generation complete!');