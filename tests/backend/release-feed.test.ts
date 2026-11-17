import { describe, it, expect } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { execFileSync } from "node:child_process";
function fixture(run: (dir: string, execute: () => Buffer) => void) {
  const dir = mkdtempSync(join(tmpdir(), "pm2-feed-test-"));
  try {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    mkdirSync(join(dir, "registry"));
    writeFileSync(
      join(dir, "registry/signing.pub"),
      publicKey
        .export({ type: "spki", format: "der" })
        .subarray(-32)
        .toString("base64"),
    );
    writeFileSync(
      join(dir, "manifest.json"),
      JSON.stringify({
        id: "pm2-dashboard",
        name: "PM2",
        version: "1.0.0",
        author: { name: "Test" },
        capabilities: [],
      }),
    );
    const bytes = Buffer.from("fixture package");
    writeFileSync(join(dir, "pm2-dashboard-1.0.0.tmxplug"), bytes);
    writeFileSync(
      join(dir, "pm2-dashboard-1.0.0.tmxplug.sig"),
      sign(
        null,
        createHash("sha256").update(bytes).digest(),
        privateKey,
      ).toString("base64"),
    );
    run(dir, () =>
      execFileSync(process.execPath, [resolve("scripts/update-registry.mjs")], {
        cwd: dir,
        env: {
          ...process.env,
          GITHUB_REPOSITORY: "Jdrew001/termix-pm2-dashboard",
        },
        stdio: "pipe",
      }),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
describe("signed release feed", () => {
  it("indexes a correctly signed package and refuses an overwritten version", () =>
    fixture((dir, execute) => {
      execute();
      const feed = JSON.parse(
        readFileSync(join(dir, "registry/index.json"), "utf8"),
      );
      expect(feed.plugins[0].versions[0].version).toBe("1.0.0");
      expect(feed.plugins[0].versions[0].url).toContain(
        "/releases/download/v1.0.0/",
      );
      expect(() => execute()).toThrow();
    }));
  it("rejects a modified package before publishing the feed", () =>
    fixture((dir, execute) => {
      writeFileSync(join(dir, "pm2-dashboard-1.0.0.tmxplug"), "tampered");
      expect(() => execute()).toThrow();
    }));
});
