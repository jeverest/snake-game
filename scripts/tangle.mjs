#!/usr/bin/env node
// scripts/tangle.mjs — Extract code blocks from lit/*.md into source files

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs'
import { join, dirname, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const litDir = join(root, 'lit')

// Read all .md files from lit/ sorted alphabetically
const mdFiles = readdirSync(litDir)
  .filter(f => f.endsWith('.md'))
  .sort()

// Parse code blocks with {file=<path>} annotations
const codeBlockRegex = /^```\w*\s*\{file=([^}]+)\}\s*\n([\s\S]*?)^```$/gm

const fileBlocks = new Map() // path -> string[]

for (const mdFile of mdFiles) {
  const content = readFileSync(join(litDir, mdFile), 'utf-8')
  let match
  while ((match = codeBlockRegex.exec(content)) !== null) {
    const targetPath = match[1].trim()
    const code = match[2].replace(/\n+$/, '') // strip trailing newlines
    if (!fileBlocks.has(targetPath)) {
      fileBlocks.set(targetPath, [])
    }
    fileBlocks.get(targetPath).push(code)
  }
}

// Comment syntax by file extension
function headerComment(filePath) {
  const ext = extname(filePath)
  const msg = 'Generated from lit/*.md — edits here should be synced back to lit files'
  switch (ext) {
    case '.html': return `<!-- ${msg} -->`
    case '.css': return `/* ${msg} */`
    default: return `// ${msg}`
  }
}

// Write output files
console.log('Tangling lit/*.md:\n')
for (const [filePath, blocks] of fileBlocks) {
  const fullPath = join(root, filePath)
  mkdirSync(dirname(fullPath), { recursive: true })
  const header = headerComment(filePath)
  const content = header + '\n' + blocks.join('\n\n') + '\n'
  writeFileSync(fullPath, content)
  console.log(`  ${filePath} (${blocks.length} blocks)`)
}

console.log(`\nTangled ${fileBlocks.size} files from ${mdFiles.length} markdown files.`)
