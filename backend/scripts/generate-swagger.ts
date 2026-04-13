import swaggerJSDoc from 'swagger-jsdoc'
import fs from 'fs'
import path from 'path'
import { swaggerOptions } from '../src/swagger.config'

const outputPath = path.resolve(__dirname, '../../docs/swagger.json')

interface SwaggerSpec {
  paths?: Record<string, unknown>
  [key: string]: unknown
}

const spec = swaggerJSDoc(swaggerOptions) as SwaggerSpec
const json = JSON.stringify(spec, null, 2) + '\n'

const isValidate = process.argv.includes('--validate')

if (isValidate) {
  const existing = fs.readFileSync(outputPath, 'utf-8').trim()
  const generated = json.trim()
  if (existing !== generated) {
    console.error('❌ docs/swagger.json is out of date. Run: npm run docs:generate')
    process.exit(1)
  }
  console.log('✓ docs/swagger.json is up to date')
} else {
  fs.writeFileSync(outputPath, json)
  const pathCount = Object.keys(spec.paths ?? {}).length
  console.log(`✓ Generated docs/swagger.json (${pathCount} paths)`)
}
