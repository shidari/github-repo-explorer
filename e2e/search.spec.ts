import { expect, test } from "@playwright/test";
import { mockTestRepos } from "../src/repository/mock";

// seed 固定のモックデータから最初のリポジトリを取得
const firstRepo = mockTestRepos[0];
const SEARCH_QUERY = firstRepo.owner.username;

test.describe("検索 → 詳細の流れ", () => {
  test("キーワードを入力すると検索結果一覧が表示される", async ({ page }) => {
    await page.goto("/search");

    const input = page.getByRole("searchbox", { name: "リポジトリを検索" });
    await input.pressSequentially(SEARCH_QUERY, { delay: 50 });

    // リポジトリが少なくとも1件表示される
    await expect(page.locator("[data-repo]").first()).toBeVisible({
      timeout: 60_000,
    });
  });

  test("検索結果を選択すると詳細ページに遷移し情報が表示される", async ({
    page,
  }) => {
    await page.goto("/search");

    const input = page.getByRole("searchbox", { name: "リポジトリを検索" });
    await input.pressSequentially(SEARCH_QUERY, { delay: 50 });

    // 最初の結果をクリックして詳細ページに遷移
    await page.locator("[data-repo]").first().click({ timeout: 60_000 });
    await page.waitForURL(/\/repos\//, { timeout: 60_000 });

    // 詳細情報が表示される（最低動作要件）
    // - リポジトリ名
    await expect(page.locator(`text=${SEARCH_QUERY}`).first()).toBeVisible({
      timeout: 60_000,
    });
    // - オーナーアイコン
    await expect(page.getByRole("img").first()).toBeVisible();
    // - Stars, Watchers, Forks, Issues
    await expect(page.getByText("Stars")).toBeVisible();
    await expect(page.getByText("Watchers")).toBeVisible();
    await expect(page.getByText("Forks")).toBeVisible();
    await expect(page.getByText("Issues")).toBeVisible();
  });
});
