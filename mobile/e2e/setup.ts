import { device, beforeAll, afterAll } from 'detox';

beforeAll(async () => {
  await device.launchApp({
    newInstance: true,
  });
});

afterAll(async () => {
  await device.terminateApp();
});

