/**
 * Extract blog-posts.ts to JSON files
 * Splits the 103KB file into individual post files for better code splitting
 */

import fs from 'fs';
import path from 'path';
import { blogPosts } from '../src/data/blog-posts';

// Create output directory
const outputDir = path.join(__dirname, '../public/data/blog');
fs.mkdirSync(outputDir, { recursive: true });

console.log('📦 Extracting blog posts to JSON...');
console.log(`Total posts: ${blogPosts.length}\n`);

// Create individual post files
let totalSize = 0;
for (const post of blogPosts) {
  const filename = `${post.slug}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(post, null, 2));

  const size = fs.statSync(filepath).size;
  totalSize += size;
  console.log(`✓ ${filename} (${(size / 1024).toFixed(2)}KB)`);
}

// Create index file with metadata only (no content)
const index = blogPosts.map(post => ({
  slug: post.slug,
  title: post.title,
  titleKo: post.titleKo,
  excerpt: post.excerpt,
  excerptKo: post.excerptKo,
  category: post.category,
  categoryKo: post.categoryKo,
  icon: post.icon,
  date: post.date,
  readTime: post.readTime,
  featured: post.featured
}));

const indexPath = path.join(outputDir, 'index.json');
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
const indexSize = fs.statSync(indexPath).size;

console.log(`\n✓ Created index.json (${(indexSize / 1024).toFixed(2)}KB)`);
console.log(`\n🎉 Successfully extracted all blog posts!`);
console.log(`📊 Total size: ${(totalSize / 1024).toFixed(2)}KB across ${blogPosts.length} files`);
console.log(`💡 Index size: ${(indexSize / 1024).toFixed(2)}KB (${((indexSize / totalSize) * 100).toFixed(1)}% of total)`);
