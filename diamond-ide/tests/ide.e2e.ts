import { expect, test, type Page } from "@playwright/test";

async function openIde(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: /^Compile$/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("textarea[placeholder='Enter Input here']")).toBeVisible({ timeout: 30_000 });

  const boot = page.locator(".studio-boot");
  if (await boot.count()) {
    await expect(boot.first()).toBeHidden({ timeout: 30_000 });
  }

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
}

async function compileSource(page: Page) {
  await page.getByRole("button", { name: /^Compile$/i }).click();
  await expect(page.locator("footer")).toContainText(/Tokens\s+\d+/i, { timeout: 20_000 });
}

async function expectWheelScrollsPage(page: Page, selector: string, deltaY = 1200) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await page.waitForTimeout(150);

  const box = await page.locator(selector).first().boundingBox();
  expect(box).not.toBeNull();

  if (!box) {
    return;
  }

  await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height / 2, 280));
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, deltaY);
  await page.waitForTimeout(250);
  const after = await page.evaluate(() => window.scrollY);

  expect(after).toBeGreaterThan(before);
}

test("header cleanup and console shell match the updated production UI", async ({ page }) => {
  await openIde(page);

  const header = page.locator("header").first();
  await expect(header).toContainText(/diamond/i);
  await expect(header.getByRole("button", { name: /switch to light theme|switch to dark theme/i })).toBeVisible();
  await expect(header).not.toContainText(/wasm ready/i);
  await expect(page.getByRole("button", { name: /print pdf report/i })).toHaveCount(0);
  await expect(page.getByText(/compiler visuals and reports in one full-width view/i)).toHaveCount(0);
  await expect(page.getByText(/the lower workspace now stays fully open/i)).toHaveCount(0);
  await expect(page.locator(".console-box").first()).toBeVisible();
  await expect(page.locator(".console-box").nth(1)).toBeVisible();
});

test("mouse wheel scrolls the page while hovering editor and console surfaces", async ({ page }) => {
  await openIde(page);

  await expectWheelScrollsPage(page, ".monaco-editor");
  await expectWheelScrollsPage(page, "textarea[placeholder='Enter Input here']");
  await expectWheelScrollsPage(page, "[aria-live='polite']");
});

test("analysis and challenge sections render live compiler data across the main production tabs", async ({ page }) => {
  await openIde(page);
  await compileSource(page);

  await expect(page.locator(".react-flow__node").first()).toBeVisible();

  await page.getByRole("button", { name: /^Flowchart$/i }).click();
  await expect(page.locator(".react-flow__node").first()).toBeVisible();

  await page.getByRole("button", { name: /^Tokens$/i }).click();
  await expect(page.getByText("Total Tokens")).toBeVisible();
  await expect(page.getByText("Source Lines")).toBeVisible();

  await page.getByRole("button", { name: /^Symbols$/i }).click();
  await expect(page.getByRole("columnheader", { name: /Mem Addr/i })).toBeVisible();

  await page.getByRole("button", { name: /^Scopes$/i }).click();
  await expect(page.getByText(/Nested Scope Explorer/i)).toBeVisible();

  await page.getByRole("button", { name: /^Type Inference$/i }).click();
  await expect(page.getByText(/Expected vs Inferred/i)).toBeVisible();

  await page.getByRole("button", { name: /^IR \/ Codegen$/i }).click();
  await expect(page.getByText(/Intermediate Representation/i)).toBeVisible();
  await page.getByRole("button", { name: /^Raw TAC$/i }).click();
  await expect(page.getByRole("cell", { name: /^decl$/i }).first()).toBeVisible();
  await page.getByRole("button", { name: /^Assembly$/i }).click();
  await expect(page.locator("pre").first()).toContainText(/ALLOC number ; type=shonkha/i);

  await page.getByRole("button", { name: /^Diagnostics$/i }).click();
  await expect(page.getByText(/Diagnostics clear/i)).toBeVisible();

  await page.getByRole("button", { name: /^Challenges$/i }).click();
  await expect(page.getByText(/Challenge List/i)).toBeVisible();
  await expect(page.getByText(/Hidden Test Flow/i)).toBeVisible();

  await page.getByRole("button", { name: /^Analysis$/i }).last().click();
  await page.getByRole("button", { name: /^Test Suite$/i }).click();
  await page.getByRole("button", { name: /Run Test Suite/i }).click();
  await expect(page.getByRole("button", { name: /Run Again/i })).toBeVisible({ timeout: 30_000 });
});

test("creating a new file keeps previously opened tab sources unchanged", async ({ page }) => {
  await openIde(page);

  const templateSelect = page.locator("select").first();
  const output = page.locator(".console-box [aria-live='polite']").first();

  await templateSelect.selectOption("hello-world");
  await page.getByRole("button", { name: /^Run$/i }).click();
  await expect(output).toContainText("Hello Diamond", { timeout: 20_000 });

  await page.getByRole("button", { name: /New file/i }).click();
  await templateSelect.selectOption("simple-print");
  await page.getByRole("button", { name: /^Run$/i }).click();
  await expect(output).toContainText("Welcome to Diamond", { timeout: 20_000 });

  await page.getByText(/hello_world\.diu/i).click();
  await page.getByRole("button", { name: /^Run$/i }).click();
  await expect(output).toContainText("Hello Diamond", { timeout: 20_000 });
});

test("new tabs can be renamed and the header theme toggle still works in light mode", async ({ page }) => {
  await openIde(page);

  const header = page.locator("header").first();
  const themeToggle = header.getByRole("button", { name: /switch to light theme|switch to dark theme/i });

  await themeToggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: /New file/i }).click();
  await page.getByRole("button", { name: /Rename untitled_2\.diu/i }).click();
  await page.getByLabel(/Rename untitled_2\.diu/i).fill("Report Draft");
  await page.getByLabel(/Rename untitled_2\.diu/i).press("Enter");

  await expect(page.getByText(/report draft\.diu/i)).toBeVisible();
  await expect(header.getByLabel(/diamond compiler/i)).toBeVisible();
});

test("debugger feeds the memory panel with step data", async ({ page }) => {
  await openIde(page);

  await page.locator("textarea[placeholder='Enter Input here']").fill("4\nDiamond");
  await page.getByRole("button", { name: /Debug current program/i }).click();

  await expect(page.getByText(/Debugger/i)).toBeVisible();
  await expect(page.getByText(/Call Stack/i)).toBeVisible();

  await page.getByRole("button", { name: /Next/i }).click();
  await page.getByRole("button", { name: /Next/i }).click();

  await expect(page.locator(".memory-box").first()).toBeVisible({ timeout: 10_000 });
});
