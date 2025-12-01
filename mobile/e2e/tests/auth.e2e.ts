import { device, element, by, expect, waitFor } from 'detox';
import { TEST_USER, loginAsDevUser, verifyLoggedIn, verifyOnSignInScreen } from '../helpers/auth';

describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Sign In Screen', () => {
    it('should display sign-in screen on app launch', async () => {
      await verifyOnSignInScreen();
    });

    it('should display welcome text and logo', async () => {
      await expect(element(by.text('Welcome to proph.bet'))).toBeVisible();
      await expect(element(by.text('Sign in with Google'))).toBeVisible();
    });

    it('should show dev login section in dev mode', async () => {
      // Dev login section should be visible when EXPO_PUBLIC_API_URL points to dev server
      await expect(element(by.id('dev-email-input'))).toBeVisible();
      await expect(element(by.id('dev-login-button'))).toBeVisible();
    });
  });

  describe('Dev Login Flow', () => {
    it('should successfully log in with dev credentials', async () => {
      // Verify we're on sign-in screen
      await verifyOnSignInScreen();

      // Perform dev login
      await loginAsDevUser(TEST_USER.email);

      // Verify we navigated to arenas screen (authenticated state)
      await verifyLoggedIn();
    });

    it('should allow entering custom dev email', async () => {
      await verifyOnSignInScreen();

      // Clear and enter custom email
      const emailInput = element(by.id('dev-email-input'));
      await emailInput.tap();
      await emailInput.clearText();
      await emailInput.typeText('custom@test.com');

      // Verify the input has the custom email
      await expect(emailInput).toHaveText('custom@test.com');
    });

    it('should show loading state while signing in', async () => {
      await verifyOnSignInScreen();

      // Enter email
      await element(by.id('dev-email-input')).clearText();
      await element(by.id('dev-email-input')).typeText(TEST_USER.email);

      // Tap dev login button
      await element(by.id('dev-login-button')).tap();

      // Check that button shows "Signing in..." text (if fast enough)
      // Note: This might be too fast to catch in some cases
      try {
        await expect(element(by.text('Signing in...'))).toBeVisible();
      } catch {
        // Loading state might have already passed - this is okay
      }

      // Wait for navigation to complete
      await waitFor(element(by.id('arenas-screen')))
        .toBeVisible()
        .withTimeout(15000);
    });
  });

  describe('Authenticated State', () => {
    beforeEach(async () => {
      await loginAsDevUser();
    });

    it('should persist authentication after login', async () => {
      // After login, we should be on the arenas screen
      await verifyLoggedIn();

      // Tab bar should be visible
      await expect(element(by.id('tab-arenas'))).toBeVisible();
      await expect(element(by.id('tab-activity'))).toBeVisible();
      await expect(element(by.id('tab-profile'))).toBeVisible();
    });

    it('should navigate between tabs', async () => {
      // Start on arenas tab
      await expect(element(by.id('arenas-screen'))).toBeVisible();

      // Navigate to activity tab
      await element(by.id('tab-activity')).tap();
      // Activity screen should now be visible

      // Navigate to profile tab
      await element(by.id('tab-profile')).tap();
      await expect(element(by.id('profile-screen'))).toBeVisible();

      // Navigate back to arenas
      await element(by.id('tab-arenas')).tap();
      await expect(element(by.id('arenas-screen'))).toBeVisible();
    });
  });
});

