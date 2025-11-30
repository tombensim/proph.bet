const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force resolving nested modules to the folders below
config.resolver.disableHierarchicalLookup = true;

// Exclude Next.js app directories and other non-mobile files from Metro bundling
// This prevents Metro from trying to process .ico files and other web-specific assets
config.resolver.blockList = [
  // Next.js app directory (contains favicon.ico that Jimp can't process)
  new RegExp(`${monorepoRoot}/app/.*`),
  // Next.js build output
  new RegExp(`${monorepoRoot}/\\.next/.*`),
  // Components directory (web-specific React components)
  new RegExp(`${monorepoRoot}/components/.*`),
  // Web-specific lib files (avoid conflicts with mobile/lib)
  new RegExp(`${monorepoRoot}/lib/.*`),
  // Public assets (web-specific)
  new RegExp(`${monorepoRoot}/public/.*`),
];

module.exports = config;
