#!/usr/bin/env node

/**
 * setup-android-keystore.js
 * Run this after `expo prebuild --clean` to restore the release keystore configuration
 * 
 * Usage: node scripts/setup-android-keystore.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MOBILE_DIR = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(MOBILE_DIR, 'android');
const APP_DIR = path.join(ANDROID_DIR, 'app');

// Keystore configuration
const KEYSTORE_FILE = path.join(APP_DIR, 'release.keystore');
const KEYSTORE_PROPS = path.join(ANDROID_DIR, 'keystore.properties');
const BUILD_GRADLE = path.join(APP_DIR, 'build.gradle');

// Keystore parameters (change password for production!)
const KEY_ALIAS = 'prophbet';
const STORE_PASSWORD = 'prophbet123';
const KEY_PASSWORD = 'prophbet123';
const DNAME = 'CN=Proph.bet, OU=Mobile, O=Proph.bet, L=Tel Aviv, ST=Israel, C=IL';
const VALIDITY = 10000;

console.log('🔐 Setting up Android release keystore...\n');

// Check if android directory exists
if (!fs.existsSync(ANDROID_DIR)) {
  console.error('❌ Android directory not found. Run "npx expo prebuild --platform android" first.');
  process.exit(1);
}

// Generate keystore if it doesn't exist
if (!fs.existsSync(KEYSTORE_FILE)) {
  console.log('📝 Generating release keystore...');
  try {
    execSync(
      `keytool -genkeypair -v -storetype PKCS12 -keystore "${KEYSTORE_FILE}" ` +
      `-alias "${KEY_ALIAS}" -keyalg RSA -keysize 2048 -validity ${VALIDITY} ` +
      `-storepass "${STORE_PASSWORD}" -keypass "${KEY_PASSWORD}" -dname "${DNAME}"`,
      { stdio: 'inherit' }
    );
    console.log(`✅ Keystore generated at ${KEYSTORE_FILE}\n`);
  } catch (error) {
    console.error('❌ Failed to generate keystore:', error.message);
    process.exit(1);
  }
} else {
  console.log(`✅ Keystore already exists at ${KEYSTORE_FILE}\n`);
}

// Create keystore.properties
console.log('📝 Creating keystore.properties...');
const keystorePropsContent = `storePassword=${STORE_PASSWORD}
keyPassword=${KEY_PASSWORD}
keyAlias=${KEY_ALIAS}
storeFile=app/release.keystore
`;
fs.writeFileSync(KEYSTORE_PROPS, keystorePropsContent);
console.log(`✅ Created ${KEYSTORE_PROPS}\n`);

// Update build.gradle
console.log('📝 Updating build.gradle...');
let buildGradle = fs.readFileSync(BUILD_GRADLE, 'utf8');

if (buildGradle.includes('keystorePropertiesFile')) {
  console.log('✅ build.gradle already configured for release signing\n');
} else {
  // Add keystore loading code before android {
  const keystoreLoadingCode = `// Load keystore properties for release signing
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {`;

  buildGradle = buildGradle.replace('android {', keystoreLoadingCode);

  // Add release signing config after debug signing config
  const debugSigningConfigEnd = `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

  const withReleaseSigningConfig = `signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile rootProject.file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }`;

  buildGradle = buildGradle.replace(debugSigningConfigEnd, withReleaseSigningConfig);

  // Update release build type to use release signing config
  buildGradle = buildGradle.replace(
    /release \{[\s\S]*?\/\/ Caution![\s\S]*?signingConfig signingConfigs\.debug/,
    `release {
            signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug`
  );

  fs.writeFileSync(BUILD_GRADLE, buildGradle);
  console.log('✅ Updated build.gradle with release signing configuration\n');
}

// Print SHA256 fingerprint
console.log('📋 Keystore SHA256 Fingerprint (for assetlinks.json):');
try {
  const result = execSync(
    `keytool -list -v -keystore "${KEYSTORE_FILE}" -alias "${KEY_ALIAS}" -storepass "${STORE_PASSWORD}" 2>/dev/null | grep SHA256`,
    { encoding: 'utf8' }
  );
  console.log(result);
} catch (error) {
  console.log('   (Run keytool manually to get fingerprint)\n');
}

console.log('✅ Android keystore setup complete!\n');
console.log('Next steps:');
console.log('1. Build release APK: cd android && ./gradlew assembleRelease');
console.log('2. Install on device: adb install -r app/build/outputs/apk/release/app-release.apk');
console.log('');

