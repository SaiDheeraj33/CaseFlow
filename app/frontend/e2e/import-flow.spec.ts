import { test, expect } from '@playwright/test';

test.describe('Import Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('/upload');
    });

    test('should display upload page', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('Upload CSV');
        await expect(page.locator('.dropzone')).toBeVisible();
    });

    test('should upload CSV and navigate to validation', async ({ page }) => {
        // Create a test CSV file
        const csvContent = `case_id,applicant_name,dob,email,phone,category,priority
C-1001,John Doe,1990-01-01,john@example.com,+12025551234,TAX,HIGH`;

        // Upload file using file chooser
        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.locator('.dropzone').click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles({
            name: 'test.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent),
        });

        // Should navigate to validate page
        await page.waitForURL('/validate');
        await expect(page.locator('h1')).toContainText('Validate');
    });

    test('should display validation errors', async ({ page }) => {
        // Upload file with errors
        const csvContent = `case_id,applicant_name,dob,email,phone,category,priority
C-1001,,1990-01-01,invalid-email,123,INVALID,`;

        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.locator('.dropzone').click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles({
            name: 'test-errors.csv',
            mimeType: 'text/csv',
            buffer: Buffer.from(csvContent),
        });

        await page.waitForURL('/validate');

        // Should show error count
        await expect(page.locator('.stat-errors .stat-value')).not.toHaveText('0');
    });
});

test.describe('Cases List', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForURL('/upload');
    });

    test('should display cases page', async ({ page }) => {
        await page.goto('/cases');
        await expect(page.locator('h1')).toContainText('Cases');
    });

    test('should filter cases by status', async ({ page }) => {
        await page.goto('/cases');
        await page.selectOption('.filter-select', 'PENDING');
        // Page should reload with filtered results
        await expect(page.url()).toContain('status=PENDING');
    });
});
