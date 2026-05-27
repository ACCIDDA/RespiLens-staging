import { expect, test } from "@playwright/test";

test("documentation route loads its core content", async ({ page }) => {
  await page.goto("/documentation");

  await expect(page).toHaveTitle(/RespiLens/i);
  await expect(page.getByText("MyRespiLens documentation")).toBeVisible();
});
