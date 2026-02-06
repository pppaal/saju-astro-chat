/**
 * Script to generate OpenAPI specification JSON file
 *
 * Run with: npx tsx scripts/generate-openapi.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { generateOpenApiDocument } from '../src/lib/api/openapi/generator'

const OUTPUT_PATH = path.join(process.cwd(), 'public', 'openapi.json')

async function main() {
  console.log('🚀 Generating OpenAPI specification...')

  try {
    const document = generateOpenApiDocument()

    // Ensure public directory exists
    const publicDir = path.dirname(OUTPUT_PATH)
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    // Write the spec file
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(document, null, 2), 'utf-8')

    console.log(`✅ OpenAPI spec generated successfully!`)
    console.log(`📄 Output: ${OUTPUT_PATH}`)
    console.log(`📊 Stats:`)
    console.log(`   - Paths: ${Object.keys(document.paths || {}).length}`)
    console.log(`   - Schemas: ${Object.keys(document.components?.schemas || {}).length}`)
    console.log(`   - Tags: ${(document.tags || []).length}`)
  } catch (error) {
    console.error('❌ Error generating OpenAPI spec:', error)
    process.exit(1)
  }
}

main()
