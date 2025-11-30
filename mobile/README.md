# Proph.bet Mobile App

React Native mobile app for Proph.bet prediction markets platform, built with Expo.

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your mobile device (for development)

## Getting Started

1. Install dependencies from the root of the monorepo:

```bash
npm install
```

2. Create environment file:

```bash
cd mobile
cp .env.example .env
```

3. Configure your `.env` file with:
   - `EXPO_PUBLIC_API_URL` - Your API server URL
   - `EXPO_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth client ID

4. Start the development server:

```bash
npm start
# or
npx expo start
```

5. Scan the QR code with Expo Go (Android) or Camera app (iOS)

## Project Structure

```
mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Main tab screens
│   │   ├── arenas/        # Arena and market screens
│   │   ├── activity.tsx   # Notifications screen
│   │   ├── profile.tsx    # User profile screen
│   │   └── index.tsx      # Arenas list screen
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry point
├── components/            # Reusable components
├── hooks/                 # Custom React hooks
│   ├── useAuth.ts
│   ├── useArenas.ts
│   ├── useBets.ts
│   ├── useMarkets.ts
│   └── useNotifications.ts
├── lib/                   # Utilities and services
│   ├── api.ts            # API client
│   └── auth.ts           # Auth manager
└── assets/               # Images and fonts
```

## Features

- Google OAuth authentication
- Browse and switch between arenas
- View prediction markets with real-time odds
- Place bets on market outcomes
- Track notifications and activity
- View leaderboards
- User profile with bet history

## Building for Production

### Android

```bash
npx expo prebuild --platform android
npx expo build:android
# or with EAS
eas build --platform android
```

### iOS

```bash
npx expo prebuild --platform ios
npx expo build:ios
# or with EAS
eas build --platform ios
```

## Configuration

### Google OAuth Setup

1. Create OAuth credentials in Google Cloud Console
2. Add Android and iOS client IDs
3. Configure redirect URIs for Expo

### EAS Build Setup

1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configure: `eas build:configure`
4. Update `app.json` with your EAS project ID

## Development Notes

- Uses React Query for data fetching and caching
- Secure storage for authentication tokens
- Automatic token refresh on expiration
- Deep linking support for market sharing
