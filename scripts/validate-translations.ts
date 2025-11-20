#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';

const MESSAGES_DIR = path.join(process.cwd(), 'messages');
const BASE_LOCALE = 'en';

interface TranslationStructure {
  [key: string]: string | TranslationStructure;
}

interface MissingTranslation {
  key: string;
  locale: string;
  baseValue?: string;
}

interface ExtraTranslation {
  key: string;
  locale: string;
}

function flattenKeys(
  obj: TranslationStructure,
  prefix = '',
  result: Map<string, string> = new Map()
): Map<string, string> {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result.set(fullKey, value);
    } else {
      flattenKeys(value, fullKey, result);
    }
  }
  return result;
}

function unflattenKeys(flatMap: Map<string, string>): TranslationStructure {
  const result: TranslationStructure = {};
  
  for (const [key, value] of flatMap.entries()) {
    const parts = key.split('.');
    let current: any = result;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }
  
  return result;
}

function loadTranslations(locale: string): Map<string, string> {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(content);
  return flattenKeys(parsed);
}

function getAllLocales(): string[] {
  return fs.readdirSync(MESSAGES_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));
}

function validateTranslations(): {
  missing: MissingTranslation[];
  extra: ExtraTranslation[];
  isValid: boolean;
} {
  const locales = getAllLocales();
  const baseTranslations = loadTranslations(BASE_LOCALE);
  const missing: MissingTranslation[] = [];
  const extra: ExtraTranslation[] = [];

  for (const locale of locales) {
    if (locale === BASE_LOCALE) continue;

    const translations = loadTranslations(locale);

    // Check for missing keys
    for (const [key, value] of baseTranslations.entries()) {
      if (!translations.has(key)) {
        missing.push({
          key,
          locale,
          baseValue: value,
        });
      }
    }

    // Check for extra keys (keys that don't exist in base)
    for (const key of translations.keys()) {
      if (!baseTranslations.has(key)) {
        extra.push({
          key,
          locale,
        });
      }
    }
  }

  return {
    missing,
    extra,
    isValid: missing.length === 0 && extra.length === 0,
  };
}

function generateMissingTranslationsFile(): void {
  const { missing } = validateTranslations();
  
  if (missing.length === 0) {
    console.log('✅ No missing translations found!');
    return;
  }

  // Group by locale
  const byLocale = new Map<string, MissingTranslation[]>();
  for (const item of missing) {
    if (!byLocale.has(item.locale)) {
      byLocale.set(item.locale, []);
    }
    byLocale.get(item.locale)!.push(item);
  }

  // Generate files for each locale
  for (const [locale, items] of byLocale.entries()) {
    const flatMap = new Map<string, string>();
    for (const item of items) {
      flatMap.set(item.key, item.baseValue || '');
    }
    
    const nested = unflattenKeys(flatMap);
    const outputPath = path.join(MESSAGES_DIR, `${locale}.missing.json`);
    
    fs.writeFileSync(
      outputPath,
      JSON.stringify(nested, null, 2) + '\n',
      'utf-8'
    );
    
    console.log(`📝 Generated missing translations for ${locale}: ${outputPath}`);
    console.log(`   ${items.length} missing keys`);
  }
}

function printReport(): void {
  const { missing, extra, isValid } = validateTranslations();

  console.log('\n🌍 Translation Validation Report\n');
  console.log('='.repeat(60));

  if (isValid) {
    console.log('\n✅ All translations are in sync!\n');
    return;
  }

  if (missing.length > 0) {
    console.log('\n❌ Missing Translations:\n');
    
    const byLocale = new Map<string, MissingTranslation[]>();
    for (const item of missing) {
      if (!byLocale.has(item.locale)) {
        byLocale.set(item.locale, []);
      }
      byLocale.get(item.locale)!.push(item);
    }

    for (const [locale, items] of byLocale.entries()) {
      console.log(`\n  ${locale}:`);
      for (const item of items) {
        console.log(`    - ${item.key}`);
        if (item.baseValue) {
          const preview = item.baseValue.substring(0, 50);
          console.log(`      Base: "${preview}${item.baseValue.length > 50 ? '...' : ''}"`);
        }
      }
      console.log(`\n  Total: ${items.length} missing keys in ${locale}`);
    }
  }

  if (extra.length > 0) {
    console.log('\n⚠️  Extra Translations (not in base):\n');
    
    const byLocale = new Map<string, ExtraTranslation[]>();
    for (const item of extra) {
      if (!byLocale.has(item.locale)) {
        byLocale.set(item.locale, []);
      }
      byLocale.get(item.locale)!.push(item);
    }

    for (const [locale, items] of byLocale.entries()) {
      console.log(`\n  ${locale}:`);
      for (const item of items) {
        console.log(`    - ${item.key}`);
      }
      console.log(`\n  Total: ${items.length} extra keys in ${locale}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`   Missing: ${missing.length}`);
  console.log(`   Extra: ${extra.length}`);
  console.log('\n💡 Run with --generate to create missing translation files\n');
}

// Main
const args = process.argv.slice(2);
const shouldGenerate = args.includes('--generate') || args.includes('-g');
const shouldFix = args.includes('--fix') || args.includes('-f');

if (shouldGenerate) {
  generateMissingTranslationsFile();
} else if (shouldFix) {
  console.log('🔧 Fix mode: Will exit with error code if translations are missing');
  const { isValid } = validateTranslations();
  printReport();
  process.exit(isValid ? 0 : 1);
} else {
  printReport();
}

