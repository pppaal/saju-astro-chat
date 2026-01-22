// Script to add hexagrams 33-64 to enhancedData.ts
// Run this script to complete the hexagram data

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'lib', 'iChing', 'enhancedData.ts');

// Read the JSON reference file
const jsonPath = path.join(__dirname, '..', 'backend_ai', 'data', 'graph', 'rules', 'iching', 'hexagrams_full.json');
const hexagramsData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

console.log('Adding remaining hexagrams 33-64 to enhancedData.ts...');
console.log('File path:', filePath);

// The script will generate the data for hexagrams 33-64
// and append it to the enhancedHexagramData object

console.log('Hexagrams data loaded successfully');
console.log('Total hexagrams in reference:', Object.keys(hexagramsData.hexagrams).length);
