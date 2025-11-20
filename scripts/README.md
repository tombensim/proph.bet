# Translation Scripts

This directory contains scripts for managing translations in the proph.bet application.

## Scripts

### `validate-translations.ts`

Validates that all translation files are in sync with the base locale (English).

**Usage:**

```bash
# Check translation status
npm run translations:validate

# Generate missing translation template files
npm run translations:validate -- --generate

# Check and exit with error if missing (CI/pre-commit)
npm run translations:check
```

**Features:**
- Detects missing translation keys in non-base locales
- Detects extra keys that don't exist in base locale
- Generates `.missing.json` files with English defaults for easy translation
- Can be used in CI/CD pipelines

**Output:**
- Shows detailed report of missing and extra translations
- Groups by locale for easy review
- Provides base English text as reference

### `generate-translation-types.ts`

Generates TypeScript types from translation files for compile-time type safety.

**Usage:**

```bash
npm run translations:generate
```

**Output:**
- Creates `types/translations.ts` with TypeScript interfaces
- Includes `Messages` type for the entire translation structure
- Includes `TranslationKey` union type for all flat keys

**Benefits:**
- Autocomplete for translation keys in IDE
- Compile-time errors for missing/wrong keys
- Refactoring safety when renaming keys
- Better developer experience

## Integration

### Pre-commit Hook

The translation validation is automatically run before each commit via Husky:

```bash
# .husky/pre-commit
npm run translations:check
npm run build
```

This prevents commits with missing translations.

### CI/CD

Add to your CI pipeline:

```yaml
- name: Validate Translations
  run: npm run translations:check
```

## Workflow

1. Add translations to `messages/en.json` (base locale)
2. Use translations in code with `useTranslations` or `getTranslations`
3. Run `npm run translations:validate` to check status
4. Run `npm run translations:validate -- --generate` to create templates
5. Translate missing keys in other locale files
6. Run `npm run translations:generate` to update TypeScript types
7. Commit (validation runs automatically)

## Development

### Running Scripts Directly

```bash
# With tsx
npx tsx scripts/validate-translations.ts
npx tsx scripts/generate-translation-types.ts

# Make executable and run
chmod +x scripts/*.ts
./scripts/validate-translations.ts
```

### Modifying Scripts

When modifying these scripts:
1. Update the script file
2. Test with various scenarios
3. Update this README if behavior changes
4. Update the main documentation in `docs/TRANSLATIONS.md`

## Troubleshooting

### Script Errors

If you encounter errors:
1. Ensure all translation files are valid JSON
2. Check that `messages/` directory exists
3. Verify `en.json` exists as base locale
4. Run with `npx tsx` for better error messages

### False Positives

If the script reports issues incorrectly:
1. Check for trailing commas in JSON files
2. Verify file encoding is UTF-8
3. Look for invisible characters in keys
4. Ensure consistent key naming across locales

## See Also

- [Main Translation Documentation](../docs/TRANSLATIONS.md)
- [next-intl Documentation](https://next-intl-docs.vercel.app/)

