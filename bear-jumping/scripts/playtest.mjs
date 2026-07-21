import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const url = process.env.PLAYTEST_URL ?? 'http://127.0.0.1:4173/';
const debugUrl = new URL(url);
debugUrl.searchParams.set('debug', '1');
const homeUrl = process.env.PLAYTEST_HOME_URL;
const executablePath =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const artifactDirectory = fileURLToPath(new URL('../playtest-artifacts/', import.meta.url));
await mkdir(artifactDirectory, { recursive: true });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const consoleProblems = [];
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') {
    consoleProblems.push(`${message.type()}: ${message.text()}`);
  }
});
page.on('pageerror', (error) => consoleProblems.push(`pageerror: ${error.message}`));

try {
  if (homeUrl) {
    await page.goto(homeUrl, { waitUntil: 'networkidle' });
    const gameCard = page.locator('a.game-card.bear-jumping');
    await gameCard.waitFor({ state: 'visible' });
    await gameCard.scrollIntoViewIfNeeded();
    assert(
      (await gameCard.getAttribute('href')) === './bear-jumping/static/index.html',
      'Home menu does not point to the deployable bear-jumping entry.',
    );
    await page.screenshot({ path: `${artifactDirectory}/00-home-menu.png`, fullPage: false });
    await Promise.all([
      page.waitForURL(url, { waitUntil: 'networkidle' }),
      gameCard.click(),
    ]);
    await page.goto(debugUrl.href, { waitUntil: 'networkidle' });
  } else {
    await page.goto(debugUrl.href, { waitUntil: 'networkidle' });
  }
  await page.locator('#game-canvas').waitFor({ state: 'visible' });

  const desktop = await page.evaluate(() => {
    const canvas = document.querySelector('#game-canvas');
    const rect = canvas?.getBoundingClientRect();
    return {
      canvasCount: document.querySelectorAll('#game-canvas').length,
      webgl: canvas instanceof HTMLCanvasElement && Boolean(canvas.getContext('webgl2')),
      width: rect?.width ?? 0,
      height: rect?.height ?? 0,
      fallbackVisible: !document.querySelector('#webgl-fallback')?.hasAttribute('hidden'),
    };
  });
  assert(desktop.canvasCount === 1, 'Canvas must appear exactly once.');
  assert(desktop.webgl && !desktop.fallbackVisible, 'WebGLRenderer did not initialize.');
  assert(desktop.width > 700 && desktop.height > 550, 'Desktop playfield is unexpectedly small.');
  await page.screenshot({ path: `${artifactDirectory}/01-initial-desktop.png`, fullPage: false });

  const canvasBox = await page.locator('#game-canvas').boundingBox();
  assert(canvasBox, 'Canvas bounding box is unavailable.');
  await page.dragAndDrop('[data-tool="down"]', '#game-canvas', {
    targetPosition: { x: canvasBox.width * 0.5, y: canvasBox.height * 0.187 },
  });
  const dropMessage = await page.locator('#status-message').innerText();
  assert(dropMessage.includes('hàng 1, cột 1'), 'Desktop drag/drop did not raycast to the start cell.');

  await page.locator('[data-tool="right"]').click();
  await page.mouse.click(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.187);
  assert((await page.locator('#status-title').innerText()) === 'Đã đổi câu lệnh!', 'Command replacement failed.');

  await page.locator('[data-tool="erase"]').click();
  await page.mouse.click(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.187);
  assert((await page.locator('#status-title').innerText()) === 'Đã xóa câu lệnh', 'Erase tool failed.');

  await page.waitForTimeout(450);
  await page.screenshot({ path: `${artifactDirectory}/10-direction-picker.png`, fullPage: false });
  const rightChoice = await page.evaluate(() => window.__BEAR_GAME__?.directionChoiceScreenPosition('right'));
  assert(rightChoice, 'The contextual direction picker is not visible at the bear.');
  await page.mouse.click(rightChoice.x, rightChoice.y);
  assert(
    (await page.locator('#status-title').innerText()) === 'Ôi, phía trước là hồ!',
    'The direct picker did not reject a step into the pond.',
  );

  const downChoice = await page.evaluate(() => window.__BEAR_GAME__?.directionChoiceScreenPosition('down'));
  assert(downChoice, 'The down direction choice is unavailable.');
  await page.mouse.click(downChoice.x, downChoice.y);
  await page.waitForFunction(() => document.querySelector('#status-title')?.textContent === 'Đã đi một bước!');
  assert(
    (await page.locator('#status-message').innerText()).includes('hàng 2, cột 1'),
    'Direct step did not move the bear to row 2, column 1.',
  );
  await page.screenshot({ path: `${artifactDirectory}/11-direct-step.png`, fullPage: false });

  const soundButton = page.locator('#sound-button');
  await soundButton.click();
  assert((await soundButton.getAttribute('aria-pressed')) === 'false', 'Sound toggle did not mute audio.');
  await soundButton.click();
  assert((await soundButton.getAttribute('aria-pressed')) === 'true', 'Sound toggle did not restore audio.');

  const planModeButton = page.locator('[data-play-mode="plan-first"]');
  const guidedModeButton = page.locator('[data-play-mode="guided-step"]');
  await planModeButton.click();
  assert((await planModeButton.getAttribute('aria-pressed')) === 'true', 'Plan-first mode was not selected.');
  assert((await guidedModeButton.getAttribute('aria-pressed')) === 'false', 'Guided mode remained selected.');
  assert(
    await page.evaluate(() => window.__BEAR_GAME__?.directionChoiceScreenPosition('down') === null),
    'Direction choices must be hidden in plan-first mode.',
  );
  assert(
    (await page.locator('#status-title').innerText()) === 'Chế độ: Lập trình trước',
    'Plan-first mode did not explain its workflow.',
  );
  await page.locator('#clear-button').click();
  assert(
    (await planModeButton.getAttribute('aria-pressed')) === 'true' &&
      (await guidedModeButton.getAttribute('aria-pressed')) === 'false',
    'Clearing commands unexpectedly changed the selected play mode.',
  );
  await page.screenshot({ path: `${artifactDirectory}/12-plan-first-mode.png`, fullPage: false });
  await page.locator('#debug-stats').evaluate((element) => {
    element.style.display = 'none';
  });

  await page.evaluate(() => window.__BEAR_GAME__?.loadSamplePath());
  await page.screenshot({ path: `${artifactDirectory}/02-sample-commands.png`, fullPage: false });
  await page.locator('#speed-select').selectOption('430');
  await page.locator('#run-button').click();
  await page.waitForTimeout(320);
  assert(await planModeButton.isDisabled(), 'Mode switch must be disabled while the bear is running.');
  await page.screenshot({ path: `${artifactDirectory}/03-bear-walking.png`, fullPage: false });
  await page.locator('#success-modal').waitFor({ state: 'visible', timeout: 8000 });
  assert(
    (await page.locator('#status-title').innerText()) === 'Đến nhà Thỏ rồi!',
    'The sample command chain did not reach the rabbit house.',
  );
  await page.screenshot({ path: `${artifactDirectory}/06-success.png`, fullPage: false });
  await page.locator('#try-again-button').click();

  await page.locator('.level-options summary').click();
  await page.locator('#level-layout-select').selectOption('random-all');
  await page.locator('#obstacle-count-select').selectOption('12');
  await page.locator('#new-level-button').click();
  const generatedSummary = await page.locator('#level-summary').innerText();
  const generatedStatus = await page.locator('#status-message').innerText();
  assert(generatedSummary.includes('Tất cả ngẫu nhiên'), 'Random-all mode was not applied.');
  assert(generatedSummary.includes('12 hồ'), 'Challenge mode did not create twelve obstacles.');
  assert(generatedStatus.includes('Luôn có ít nhất một đường đi'), 'Solvable-level feedback is missing.');
  await page.screenshot({
    path: `${artifactDirectory}/09-random-all-12-ponds.png`,
    fullPage: false,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => {
    const canvas = document.querySelector('#game-canvas');
    const stage = document.querySelector('.stage-card');
    const toolbar = document.querySelector('.direction-toolbar');
    const buttonRects = [...document.querySelectorAll('.tool-button')].map((button) => {
      const rect = button.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    const canvasRect = canvas?.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      canvasCount: document.querySelectorAll('#game-canvas').length,
      squareCanvas: canvasRect ? Math.abs(canvasRect.width - canvasRect.height) < 1 : false,
      toolbarBeforeCanvas:
        (toolbar?.getBoundingClientRect().top ?? Infinity) <
        (stage?.getBoundingClientRect().top ?? -Infinity),
      touchTargetsLargeEnough: buttonRects.every(
        ({ width, height }) => width >= 44 && height >= 44,
      ),
      modeTargetsLargeEnough: [...document.querySelectorAll('.play-mode-button')].every((button) => {
        const rect = button.getBoundingClientRect();
        return rect.width >= 44 && rect.height >= 44;
      }),
    };
  });
  assert(!mobile.overflow, 'Mobile layout has horizontal overflow.');
  assert(mobile.canvasCount === 1 && mobile.squareCanvas, 'Mobile canvas is not a single square playfield.');
  assert(mobile.toolbarBeforeCanvas, 'Mobile toolbar must appear before the playfield.');
  assert(mobile.touchTargetsLargeEnough, 'A mobile toolbar button is smaller than 44×44 px.');
  assert(mobile.modeTargetsLargeEnough, 'A mobile mode button is smaller than 44×44 px.');
  await page.screenshot({ path: `${artifactDirectory}/07-mobile-390x844.png`, fullPage: false });
  await page.locator('#game-canvas').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${artifactDirectory}/13-plan-first-mobile-board.png`, fullPage: false });
  assert(
    await page.evaluate(() => window.__BEAR_GAME__?.directionChoiceScreenPosition('down') === null),
    'Plan-first mode unexpectedly rendered contextual arrows on mobile.',
  );
  await guidedModeButton.click();
  await page.waitForTimeout(450);
  assert((await guidedModeButton.getAttribute('aria-pressed')) === 'true', 'Guided mode was not restored.');
  assert(
    await page.evaluate(() => window.__BEAR_GAME__?.directionChoiceScreenPosition('down') !== null),
    'Guided mode did not restore contextual arrows on mobile.',
  );
  await page.locator('#game-canvas').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${artifactDirectory}/14-guided-mobile-board.png`, fullPage: false });
  assert(consoleProblems.length === 0, `Browser console problems:\n${consoleProblems.join('\n')}`);

  console.log(JSON.stringify({
    desktop,
    dragDrop: dropMessage,
    generatedLevel: generatedSummary,
    mobile,
    consoleProblems,
  }, null, 2));
} finally {
  await browser.close();
}
