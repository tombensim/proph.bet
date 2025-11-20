# Translation Management Guide

This document outlines best practices and tools for managing translations in the proph.bet application.

## 📁 Structure

- **Translation Files**: Located in `messages/` directory
  - `en.json` - Base locale (English) - Source of truth
  - `he.json` - Hebrew translations
  - Add more locales as needed

- **Configuration**:
  - `i18n/routing.ts` - Defines available locales and default locale
  - `i18n/request.ts` - Configures next-intl
  - `middleware.ts` - Handles locale routing

## 🔧 Tools

### 1. Translation Validation Script

Checks that all translations are in sync across all locales.

```bash
# Check translation status
npm run translations:validate

# Generate missing translation template files
npm run translations:validate -- --generate

# Check and exit with error if missing (used in CI/pre-commit)
npm run translations:check
```

**Features:**
- Detects missing translation keys in non-base locales
- Detects extra keys that don't exist in base locale
- Generates `.missing.json` files with English defaults for easy translation

### 2. TypeScript Type Generation

Generates TypeScript types from translation files for compile-time safety.

```bash
npm run translations:generate
```

**Benefits:**
- Autocomplete for translation keys
- Compile-time errors for missing/wrong keys
- Refactoring safety

### 3. Pre-commit Hook

Automatically validates translations before each commit to prevent broken translations from being committed.

## 📝 Best Practices

### Adding New Translations

1. **Always start with the base locale (en.json)**
   ```json
   // messages/en.json
   {
     "MyFeature": {
       "title": "My Feature Title",
       "description": "Feature description"
     }
   }
   ```

2. **Run validation to check what's missing**
   ```bash
   npm run translations:validate
   ```

3. **Generate missing translation templates**
   ```bash
   npm run translations:validate -- --generate
   ```

4. **Translate the missing keys**
   - Review the generated `.missing.json` files
   - Add proper translations to the respective locale files
   - Delete the `.missing.json` files when done

5. **Regenerate types**
   ```bash
   npm run translations:generate
   ```

### Using Translations in Code

#### Server Components (RSC)

```tsx
import { getTranslations } from 'next-intl/server';

export default async function MyPage() {
  const t = await getTranslations('MyFeature');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

#### Client Components

```tsx
"use client"

import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('MyFeature');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

#### With Parameters

```json
{
  "greeting": "Hello, {name}!",
  "itemCount": "{count} items"
}
```

```tsx
t('greeting', { name: 'John' })
// Output: "Hello, John!"

t('itemCount', { count: 5 })
// Output: "5 items"
```

#### Nested Keys

```tsx
// For nested keys, use dot notation in useTranslations/getTranslations
const t = await getTranslations('MyFeature.subSection');
t('key') // Accesses MyFeature.subSection.key
```

### Organization Guidelines

1. **Group by Feature/Page**
   - Use PascalCase for top-level keys (e.g., `Markets`, `Leaderboard`, `UserNav`)
   - Group related translations together

2. **Use Descriptive Keys**
   - ❌ Bad: `text1`, `label2`, `btn`
   - ✅ Good: `createMarket`, `submitButton`, `errorMessage`

3. **Keep Keys Consistent**
   - Use the same key names across locales
   - Use camelCase for nested keys

4. **Separate Common Translations**
   - Place frequently reused translations in `Common` section
   - Examples: `loading`, `save`, `cancel`, `delete`

## 🚨 Common Mistakes to Avoid

### 1. Hardcoded Text

❌ **Bad:**
```tsx
<button>Create Market</button>
```

✅ **Good:**
```tsx
const t = useTranslations('Markets');
<button>{t('createMarket')}</button>
```

### 2. Forgetting to Add Translation to All Locales

The validation script will catch this before commit!

### 3. Using Wrong Translation Namespace

❌ **Bad:**
```tsx
const t = useTranslations('Markets');
// Later trying to access a key from 'Common'
t('loading') // Will show "loading" as fallback
```

✅ **Good:**
```tsx
const t = useTranslations('Markets');
const tCommon = useTranslations('Common');
tCommon('loading')
```

### 4. Not Regenerating Types

Always regenerate types after adding new translations to get autocomplete and type safety:

```bash
npm run translations:generate
```

## 🔄 Workflow

### Adding a New Feature with Translations

1. ✅ Add translations to `messages/en.json`
2. ✅ Use translations in your code with `useTranslations` or `getTranslations`
3. ✅ Run `npm run translations:validate` to see missing translations
4. ✅ Run `npm run translations:validate -- --generate` to create template
5. ✅ Translate missing keys in other locale files
6. ✅ Run `npm run translations:generate` to update TypeScript types
7. ✅ Commit (pre-commit hook will validate automatically)

### Refactoring Translation Keys

1. ✅ Update key in `messages/en.json`
2. ✅ Update key in all other locale files (or let validation script tell you what's missing)
3. ✅ Update code that uses the old key
4. ✅ Regenerate types
5. ✅ TypeScript will show errors for any missed usages

## 🌍 Adding a New Locale

1. **Update routing configuration**
   ```typescript
   // i18n/routing.ts
   export const routing = defineRouting({
     locales: ['en', 'he', 'es'], // Add new locale
     defaultLocale: 'en'
   });
   ```

2. **Create translation file**
   ```bash
   cp messages/en.json messages/es.json
   ```

3. **Translate all keys**
   - You can use the validation script to help
   - Consider using AI tools for initial translation, then review

4. **Test the new locale**
   - Navigate to `/es/...` routes
   - Check that all text displays correctly

## 🤖 Automation

### CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Validate Translations
  run: npm run translations:check
```

This will fail the build if translations are out of sync.

### IDE Integration

For better DX, consider:
- Install i18n extensions for your IDE
- Set up format-on-save for JSON files
- Use code snippets for common translation patterns

## 📚 Resources

- [next-intl Documentation](https://next-intl-docs.vercel.app/)
- [Internationalization Guide](https://nextjs.org/docs/app/building-your-application/routing/internationalization)

## 🆘 Troubleshooting

### "Translation key appears as literal text like 'common.points'"

This means the translation key doesn't exist in the translation file.

**Solution:**
1. Check if the key exists in `messages/en.json`
2. Run `npm run translations:validate` to see all missing keys
3. Add the missing translation
4. Verify the namespace is correct in your component

### "Type error: Property 'xyz' does not exist"

**Solution:**
Regenerate types: `npm run translations:generate`

### "Pre-commit hook fails with translation errors"

**Solution:**
1. Run `npm run translations:validate` to see what's missing
2. Add missing translations
3. Verify with `npm run translations:check`
4. Try committing again

## 🎯 Quick Reference

| Command | Description |
|---------|-------------|
| `npm run translations:validate` | Check translation status and show report |
| `npm run translations:validate -- --generate` | Generate missing translation templates |
| `npm run translations:check` | Validate and exit with error if issues found |
| `npm run translations:generate` | Generate TypeScript types from translations |

## ✅ Checklist for New Developers

- [ ] Read this document
- [ ] Understand the translation file structure
- [ ] Know how to use `useTranslations` and `getTranslations`
- [ ] Run validation script to check current status
- [ ] Never commit hardcoded user-facing text
- [ ] Always add translations to base locale first
- [ ] Use the validation tools before committing

