#!/usr/bin/env npx tsx
/**
 * Reads the Sigma Computing OpenAPI spec version and writes it to the
 * `sigmaApiVersion` field in package.json so published packages record
 * which API version they were generated from.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const rootDir = path.resolve(import.meta.dirname, '..');
const specPath = path.join(rootDir, 'spec', 'openapi.json');
const pkgPath = path.join(rootDir, 'package.json');

const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

const specVersion: string = spec.info.version;
pkg.sigmaApiVersion = specVersion;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
console.log(`Synced sigmaApiVersion to ${specVersion}`);
