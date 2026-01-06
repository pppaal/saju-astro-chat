/**
 * Test script to verify share card generation
 * This creates a simple HTML page to test the card generation in a browser
 */

const fs = require('fs');
const path = require('path');

const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share Card Test</title>
  <style>
    body {
      font-family: sans-serif;
      padding: 2rem;
      background: #0d1225;
      color: #EAE6FF;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    button {
      padding: 1rem 2rem;
      margin: 1rem;
      background: linear-gradient(135deg, #8b5cf6, #63d2ff);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 1rem;
      cursor: pointer;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(139, 92, 246, 0.3);
    }
    .preview {
      margin-top: 2rem;
      border: 2px solid #8b5cf6;
      border-radius: 8px;
      padding: 1rem;
    }
    img {
      max-width: 100%;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌟 Share Card Generator Test</h1>

    <h2>Test Scenarios</h2>

    <div>
      <h3>1. Destiny Match Card</h3>
      <button onclick="testDestinyMatchCard()">Generate Destiny Match Card (OG)</button>
      <button onclick="testDestinyMatchCardStory()">Generate Destiny Match Card (Story)</button>
    </div>

    <div>
      <h3>2. Compatibility Card</h3>
      <button onclick="testCompatibilityCard()">Generate Compatibility Card (OG)</button>
      <button onclick="testCompatibilityCardStory()">Generate Compatibility Card (Story)</button>
    </div>

    <div id="preview" class="preview" style="display: none;">
      <h3>Preview:</h3>
      <img id="previewImage" src="" alt="Preview">
      <br>
      <a id="downloadLink" download="test-card.png">Download Image</a>
    </div>
  </div>

  <script type="module">
    // Import card generators (these would be from your actual implementation)

    function createCanvas(size) {
      const sizes = {
        story: { width: 1080, height: 1920 },
        og: { width: 1200, height: 630 },
      };
      const canvas = document.createElement('canvas');
      const { width, height } = sizes[size];
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      return { canvas, ctx, width, height };
    }

    async function testDestinyMatchCard() {
      const { canvas, ctx, width, height } = createCanvas('og');

      // Simple test drawing
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#0d1225');
      gradient.addColorStop(0.5, '#131a2e');
      gradient.addColorStop(1, '#1a2238');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.font = '700 48px sans-serif';
      ctx.fillStyle = '#EAE6FF';
      ctx.textAlign = 'center';
      ctx.fillText('🌟 Destiny Match', width / 2, 100);

      ctx.font = '600 36px sans-serif';
      ctx.fillStyle = '#63d2ff';
      ctx.fillText('Test User', width / 2, 200);

      ctx.font = '800 80px sans-serif';
      const scoreGradient = ctx.createLinearGradient(width/2 - 100, 300, width/2 + 100, 300);
      scoreGradient.addColorStop(0, '#fed6e3');
      scoreGradient.addColorStop(0.5, '#8b5cf6');
      scoreGradient.addColorStop(1, '#63d2ff');
      ctx.fillStyle = scoreGradient;
      ctx.fillText('5', width / 2, 300);

      ctx.font = '500 28px sans-serif';
      ctx.fillStyle = 'rgba(234, 230, 255, 0.85)';
      ctx.fillText('Matches Found', width / 2, 360);

      showPreview(canvas);
    }

    async function testDestinyMatchCardStory() {
      const { canvas, ctx, width, height } = createCanvas('story');

      // Simple test drawing for story format
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#0d1225');
      gradient.addColorStop(1, '#1a2238');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.font = '700 60px sans-serif';
      ctx.fillStyle = '#EAE6FF';
      ctx.textAlign = 'center';
      ctx.fillText('🌟 Destiny Match', width / 2, 200);

      ctx.font = '500 40px sans-serif';
      ctx.fillStyle = '#63d2ff';
      ctx.fillText('Story Format', width / 2, 300);

      showPreview(canvas);
    }

    async function testCompatibilityCard() {
      const { canvas, ctx, width, height } = createCanvas('og');

      // Simple test drawing
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#0d1225');
      gradient.addColorStop(1, '#1a2238');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.font = '700 40px sans-serif';
      ctx.fillStyle = '#EAE6FF';
      ctx.textAlign = 'center';
      ctx.fillText('💕 Compatibility', width * 0.35, 100);

      ctx.font = '700 42px sans-serif';
      ctx.fillText('Alice', width * 0.35, 280);

      ctx.font = '400 28px sans-serif';
      ctx.fillStyle = 'rgba(234, 230, 255, 0.6)';
      ctx.fillText('&', width * 0.35, 330);

      ctx.font = '700 42px sans-serif';
      ctx.fillStyle = '#EAE6FF';
      ctx.fillText('Bob', width * 0.35, 380);

      // Score circle
      const x = width * 0.72;
      const y = height / 2;
      const radius = 80;
      const score = 85;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();

      const scoreGradient = ctx.createLinearGradient(x - radius, y, x + radius, y);
      scoreGradient.addColorStop(0, '#63d2ff');
      scoreGradient.addColorStop(0.5, '#8b5cf6');
      scoreGradient.addColorStop(1, '#fed6e3');
      ctx.strokeStyle = scoreGradient;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * score) / 100;
      ctx.arc(x, y, radius, startAngle, endAngle);
      ctx.stroke();

      ctx.font = '700 48px sans-serif';
      ctx.fillStyle = '#EAE6FF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(\`\${score}%\`, x, y);

      showPreview(canvas);
    }

    async function testCompatibilityCardStory() {
      const { canvas, ctx, width, height } = createCanvas('story');

      // Simple test drawing for story format
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#0d1225');
      gradient.addColorStop(1, '#1a2238');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.font = '600 48px sans-serif';
      ctx.fillStyle = 'rgba(234, 230, 255, 0.6)';
      ctx.textAlign = 'center';
      ctx.fillText('COMPATIBILITY', width / 2, 150);

      ctx.font = '100px sans-serif';
      ctx.fillText('💕', width / 2, 280);

      ctx.font = '700 52px sans-serif';
      ctx.fillStyle = '#EAE6FF';
      ctx.fillText('Alice & Bob', width / 2, 400);

      ctx.font = '500 36px sans-serif';
      ctx.fillStyle = 'rgba(234, 230, 255, 0.85)';
      ctx.fillText('Story Format', width / 2, 500);

      showPreview(canvas);
    }

    function showPreview(canvas) {
      const preview = document.getElementById('preview');
      const img = document.getElementById('previewImage');
      const link = document.getElementById('downloadLink');

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        img.src = url;
        link.href = url;
        preview.style.display = 'block';
      });
    }

    // Make functions global
    window.testDestinyMatchCard = testDestinyMatchCard;
    window.testDestinyMatchCardStory = testDestinyMatchCardStory;
    window.testCompatibilityCard = testCompatibilityCard;
    window.testCompatibilityCardStory = testCompatibilityCardStory;
  </script>
</body>
</html>
`;

// Write the HTML file
const outputPath = path.join(__dirname, '..', 'test-share-cards.html');
fs.writeFileSync(outputPath, htmlContent, 'utf-8');

console.log('✅ Test HTML file created successfully!');
console.log(`📁 Location: ${outputPath}`);
console.log('\n🚀 To test:');
console.log('   1. Open the HTML file in your browser');
console.log('   2. Click the buttons to generate test cards');
console.log('   3. Verify that cards are generated correctly');
console.log('\n💡 Note: This is a simplified test. For full testing, use the actual application.');
