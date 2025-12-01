import { element, by, expect, waitFor } from 'detox';

/**
 * Test user credentials for E2E testing
 * These should match a seeded user in the test database
 */
export const TEST_USER = {
  email: 'dev@genoox.com',
  name: 'Dev User',
};

/**
 * Helper to perform dev login for E2E tests
 * Uses the dev login bypass that's available when EXPO_PUBLIC_API_URL points to a dev server
 */
export async function loginAsDevUser(email: string = TEST_USER.email): Promise<void> {
  // Wait for sign-in screen to appear
  await waitFor(element(by.id('signin-screen')))
    .toBeVisible()
    .withTimeout(10000);

  // Enter dev email
  await element(by.id('dev-email-input')).tap();
  await element(by.id('dev-email-input')).clearText();
  await element(by.id('dev-email-input')).typeText(email);

  // Tap dev login button
  await element(by.id('dev-login-button')).tap();

  // Wait for navigation to tabs
  await waitFor(element(by.id('arenas-screen')))
    .toBeVisible()
    .withTimeout(15000);
}

/**
 * Helper to verify user is logged in
 */
export async function verifyLoggedIn(): Promise<void> {
  await expect(element(by.id('arenas-screen'))).toBeVisible();
}

/**
 * Helper to verify user is on sign-in screen
 */
export async function verifyOnSignInScreen(): Promise<void> {
  await expect(element(by.id('signin-screen'))).toBeVisible();
}

/**
 * Helper to logout (if implemented)
 * This would navigate to profile and tap logout
 */
export async function logout(): Promise<void> {
  // Navigate to profile tab
  await element(by.id('tab-profile')).tap();
  
  // Wait for profile screen
  await waitFor(element(by.id('profile-screen')))
    .toBeVisible()
    .withTimeout(5000);
  
  // Tap logout button if it exists
  try {
    await element(by.id('logout-button')).tap();
    
    // Wait for sign-in screen
    await waitFor(element(by.id('signin-screen')))
      .toBeVisible()
      .withTimeout(10000);
  } catch {
    // Logout may not be implemented yet
    console.log('Logout button not found - skipping logout');
  }
}

