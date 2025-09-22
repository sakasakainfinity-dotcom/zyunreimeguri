import { test, expect } from '@playwright/test';

test.describe('巡礼マップ happy path', () => {
  test('トップページでナビゲーションと地図の初期UIを表示する', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: '巡礼マップ' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ミッション' })).toBeVisible();
  });

  test('ミッション一覧でカードが表示される', async ({ page }) => {
    await page.goto('/missions');
    await expect(page.getByRole('heading', { name: 'ミッション一覧' })).toBeVisible();
  });
});
