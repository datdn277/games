// @ts-expect-error Node built-ins are provided by the Vitest runtime.
import { existsSync, readFileSync } from 'node:fs';
// @ts-expect-error Node built-ins are provided by the Vitest runtime.
import { dirname, resolve } from 'node:path';
// @ts-expect-error Node built-ins are provided by the Vitest runtime.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = resolve(projectRoot, '..');
const staticRoot = resolve(projectRoot, 'static');

describe('static deployment', () => {
  it('được liên kết từ trang chủ tới bản build có thể deploy', () => {
    const homeHtml = readFileSync(resolve(workspaceRoot, 'index.html'), 'utf8');

    expect(homeHtml).toMatch(/class="game-card bear-jumping"/);
    expect(homeHtml).toMatch(/href="\.\/bear-jumping\/static\/index\.html"/);
  });

  it('chỉ tham chiếu asset đã publish bằng đường dẫn tương đối', () => {
    const htmlPath = resolve(staticRoot, 'index.html');
    expect(existsSync(htmlPath), 'static/index.html must exist').toBe(true);

    const html = readFileSync(htmlPath, 'utf8');
    expect(html).not.toContain('/src/main.ts');
    expect(html).not.toMatch(/(?:src|href)="\/assets\//);

    const assetReferences = [...html.matchAll(/(?:src|href)="(\.\/assets\/[^"]+)"/g)];
    expect(assetReferences.length).toBeGreaterThanOrEqual(2);
    for (const [, reference] of assetReferences) {
      expect(existsSync(resolve(staticRoot, reference)), `${reference} must exist`).toBe(true);
    }
  });
});
