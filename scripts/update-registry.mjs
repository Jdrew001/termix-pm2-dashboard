import { readFile, writeFile, stat, mkdir } from "node:fs/promises";
import { createHash, createPublicKey, verify } from "node:crypto";
const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
const publicKey = (await readFile("registry/signing.pub", "utf8")).trim();
const repository =
  process.env.GITHUB_REPOSITORY || "Jdrew001/termix-pm2-dashboard";
if (repository !== "Jdrew001/termix-pm2-dashboard")
  throw new Error("Unexpected publication destination");
const file = `${manifest.id}-${manifest.version}.tmxplug`;
const bytes = await readFile(file);
const signature = (await readFile(`${file}.sig`, "utf8")).trim();
const key = createPublicKey({
  key: Buffer.concat([
    Buffer.from("302a300506032b6570032100", "hex"),
    Buffer.from(publicKey, "base64"),
  ]),
  format: "der",
  type: "spki",
});
if (
  !verify(
    null,
    createHash("sha256").update(bytes).digest(),
    key,
    Buffer.from(signature, "base64"),
  )
)
  throw new Error("Package signature verification failed");
let previous = { plugins: [] };
try {
  previous = JSON.parse(await readFile("registry/index.json", "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const existing =
  previous.plugins.find((p) => p.id === manifest.id)?.versions || [];
if (existing.some((v) => v.version === manifest.version))
  throw new Error("Published versions are immutable; bump the plugin version");
const version = {
  version: manifest.version,
  api: "1",
  url: `https://github.com/${repository}/releases/download/v${manifest.version}/${file}`,
  sha256: createHash("sha256").update(bytes).digest("hex"),
  signature,
  size: (await stat(file)).size,
  capabilities: manifest.capabilities,
  releaseNotesUrl: `https://github.com/${repository}/releases/tag/v${manifest.version}`,
  publishedAt: new Date().toISOString(),
};
const index = {
  registry: "abide-studios",
  name: "Abide Studios Plugins",
  apiVersion: 1,
  publicKey,
  updatedAt: new Date().toISOString(),
  plugins: [
    {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      author: manifest.author.name,
      category: manifest.category,
      repository: `https://github.com/${repository}`,
      icon: manifest.icon,
      versions: [version, ...existing],
    },
  ],
};
await mkdir("registry", { recursive: true });
await writeFile("registry/index.json", JSON.stringify(index, null, 2) + "\n");
console.log(`Verified and indexed ${manifest.id}@${manifest.version}`);
