#!/bin/bash

# setup-android-keystore.sh
# Run this after `expo prebuild --clean` to restore the release keystore configuration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(dirname "$SCRIPT_DIR")"
ANDROID_DIR="$MOBILE_DIR/android"
APP_DIR="$ANDROID_DIR/app"

# Keystore configuration
KEYSTORE_FILE="$APP_DIR/release.keystore"
KEYSTORE_PROPS="$ANDROID_DIR/keystore.properties"
BUILD_GRADLE="$APP_DIR/build.gradle"

# Keystore parameters (change password for production!)
KEY_ALIAS="prophbet"
STORE_PASSWORD="prophbet123"
KEY_PASSWORD="prophbet123"
DNAME="CN=Proph.bet, OU=Mobile, O=Proph.bet, L=Tel Aviv, ST=Israel, C=IL"
VALIDITY=10000

echo "🔐 Setting up Android release keystore..."

# Check if android directory exists
if [ ! -d "$ANDROID_DIR" ]; then
    echo "❌ Android directory not found. Run 'npx expo prebuild --platform android' first."
    exit 1
fi

# Generate keystore if it doesn't exist
if [ ! -f "$KEYSTORE_FILE" ]; then
    echo "📝 Generating release keystore..."
    keytool -genkeypair -v \
        -storetype PKCS12 \
        -keystore "$KEYSTORE_FILE" \
        -alias "$KEY_ALIAS" \
        -keyalg RSA \
        -keysize 2048 \
        -validity "$VALIDITY" \
        -storepass "$STORE_PASSWORD" \
        -keypass "$KEY_PASSWORD" \
        -dname "$DNAME"
    echo "✅ Keystore generated at $KEYSTORE_FILE"
else
    echo "✅ Keystore already exists at $KEYSTORE_FILE"
fi

# Create keystore.properties
echo "📝 Creating keystore.properties..."
cat > "$KEYSTORE_PROPS" << EOF
storePassword=$STORE_PASSWORD
keyPassword=$KEY_PASSWORD
keyAlias=$KEY_ALIAS
storeFile=app/release.keystore
EOF
echo "✅ Created $KEYSTORE_PROPS"

# Update build.gradle to use release keystore
echo "📝 Updating build.gradle..."

# Check if already configured
if grep -q "keystorePropertiesFile" "$BUILD_GRADLE"; then
    echo "✅ build.gradle already configured for release signing"
else
    # Create the keystore loading code
    KEYSTORE_CONFIG='// Load keystore properties for release signing
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {'

    # Replace the android { block opening
    sed -i.bak 's/^android {/'"$(echo "$KEYSTORE_CONFIG" | sed 's/\//\\\//g' | sed 's/$/\\/' | sed '$ s/\\$//')"'/' "$BUILD_GRADLE"
    
    # Add release signing config
    sed -i.bak '/signingConfigs {/,/^    }/ {
        /^    }/ a\
        release {\
            if (keystorePropertiesFile.exists()) {\
                keyAlias keystoreProperties['"'"'keyAlias'"'"']\
                keyPassword keystoreProperties['"'"'keyPassword'"'"']\
                storeFile rootProject.file(keystoreProperties['"'"'storeFile'"'"'])\
                storePassword keystoreProperties['"'"'storePassword'"'"']\
            }\
        }
    }' "$BUILD_GRADLE"
    
    # Update release build type to use release signing config
    sed -i.bak 's/signingConfig signingConfigs.debug$/signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug/' "$BUILD_GRADLE"
    
    # Clean up backup files
    rm -f "$BUILD_GRADLE.bak"
    
    echo "✅ Updated build.gradle with release signing configuration"
fi

# Print SHA256 fingerprint
echo ""
echo "📋 Keystore SHA256 Fingerprint (for assetlinks.json):"
keytool -list -v -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" -storepass "$STORE_PASSWORD" 2>/dev/null | grep SHA256

echo ""
echo "✅ Android keystore setup complete!"
echo ""
echo "Next steps:"
echo "1. Build release APK: cd android && ./gradlew assembleRelease"
echo "2. Install on device: adb install -r app/build/outputs/apk/release/app-release.apk"

