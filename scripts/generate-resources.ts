#!/usr/bin/env npx tsx
/**
 * Reads the OpenAPI spec and generates typed resource class files in src/resources/.
 *
 * Usage: npx tsx scripts/generate-resources.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseSpec } from './lib/parse-spec.js';
import { tagToFileName } from './lib/naming.js';
import {
  generateResourceFile,
  generateBarrel,
  generateClientResourceImports,
} from './lib/code-generation.js';
import { FIELD_ALIASES } from './lib/response-patching.js';

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const rootDir = path.resolve(import.meta.dirname, '..');
  const specPath = path.join(rootDir, 'spec', 'openapi.json');
  const resourcesDir = path.join(rootDir, 'src', 'resources');

  console.log(`Reading spec from ${specPath}...`);
  const groups = parseSpec(specPath);
  console.log(`Found ${groups.length} resource groups.`);

  const fieldAliases = FIELD_ALIASES;
  console.log(
    `Loaded ${fieldAliases.length} field alias patch(es) from response-patching.ts`,
  );

  // Ensure resources dir exists
  fs.mkdirSync(resourcesDir, { recursive: true });

  // Clean old generated files
  for (const file of fs.readdirSync(resourcesDir)) {
    if (file.endsWith('.ts')) {
      fs.unlinkSync(path.join(resourcesDir, file));
    }
  }

  // Write resource files
  for (const group of groups) {
    const fileName = tagToFileName(group.tag) + '.ts';
    const filePath = path.join(resourcesDir, fileName);
    const content = generateResourceFile(group, fieldAliases);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ${fileName} (${group.operations.length} methods)`);
  }

  // Write barrel
  const barrelPath = path.join(resourcesDir, 'index.ts');
  fs.writeFileSync(barrelPath, generateBarrel(groups), 'utf-8');
  console.log(`  index.ts (barrel)`);

  // Print client wiring summary
  const wiring = generateClientResourceImports(groups);
  console.log(`\nClient wiring (${groups.length} resources):`);
  console.log(
    `  Imports: ${wiring.imports.split('\n').length} resource classes`,
  );
  console.log(
    `  Properties: ${wiring.properties.split('\n').length} interface members`,
  );
  console.log(
    `  Assignments: ${wiring.assignments.split('\n').length} constructor initializations`,
  );

  console.log('\nDone!');
}

main();
