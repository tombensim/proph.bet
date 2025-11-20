#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

const MESSAGES_DIR = path.join(process.cwd(), 'messages');
const OUTPUT_FILE = path.join(process.cwd(), 'types/translations.ts');

interface TranslationStructure {
  [key: string]: string | TranslationStructure;
}

function generateTypeFromStructure(obj: TranslationStructure, depth = 0): string {
  const indent = '  '.repeat(depth);
  let result = '{\n';
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result += `${indent}  "${key}": string;\n`;
    } else {
      result += `${indent}  "${key}": ${generateTypeFromStructure(value, depth + 1)};\n`;
    }
  }
  
  result += `${indent}}`;
  return result;
}

function generateTranslationTypes(): void {
  // Read the base locale (English) as the source of truth
  const baseLocaleFile = path.join(MESSAGES_DIR, 'en.json');
  const baseTranslations: TranslationStructure = JSON.parse(
    fs.readFileSync(baseLocaleFile, 'utf-8')
  );

  // Generate TypeScript interface
  const typeDefinition = `// This file is auto-generated. Do not edit manually.
// Run 'npm run generate:translations' to regenerate.

export type Messages = ${generateTypeFromStructure(baseTranslations)};

// Utility type to get all possible translation keys as a flat union type
export type TranslationKey = 
${generateAllKeys(baseTranslations).map(key => `  | "${key}"`).join('\n')};
`;

  // Ensure the directory exists
  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, typeDefinition, 'utf-8');
  console.log(`✅ Generated translation types: ${OUTPUT_FILE}`);
}

function generateAllKeys(obj: TranslationStructure, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      keys.push(fullKey);
    } else {
      keys.push(...generateAllKeys(value, fullKey));
    }
  }
  
  return keys;
}

// Run the generator
generateTranslationTypes();

