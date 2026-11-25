import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { previewCoverageMarkdown } from "@/lib/previewReport";

const file = path.join(process.cwd(), "docs", "PREVIEW_IMAGES.md");

it("docs/PREVIEW_IMAGES.md matches the image mapping (run `npm run previews:report` to refresh)", () => {
  const md = previewCoverageMarkdown();
  if (process.env.PREVIEW_REPORT_WRITE === "1") writeFileSync(file, md);
  expect(existsSync(file)).toBe(true);
  expect(readFileSync(file, "utf8")).toBe(md);
});
