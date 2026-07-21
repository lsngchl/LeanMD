import { existsSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const documentSetArguments = process.argv
  .slice(2)
  .filter((argument) => argument !== "--");

if (documentSetArguments.length === 0) {
  console.error(
    "Usage: npm test -- <document-set-directory> [document-set-directory ...]",
  );
  process.exit(2);
}

const documentSetDirectories = documentSetArguments.map((argument) =>
  path.resolve(process.cwd(), argument),
);

for (const directory of documentSetDirectories) {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) {
    console.error(`Document set directory does not exist: ${directory}`);
    process.exit(2);
  }
}

const validatorPath = fileURLToPath(
  new URL("../leanmd/validate-why-dag.js", import.meta.url),
);
const testPaths = {
  appShell: fileURLToPath(new URL("app-shell.test.js", import.meta.url)),
  dagSample: fileURLToPath(new URL("dag-sample.test.js", import.meta.url)),
  mapLayout: fileURLToPath(new URL("map-layout.test.js", import.meta.url)),
  mathPlugin: fileURLToPath(new URL("math-plugin.test.js", import.meta.url)),
};

function runNode(arguments_, additionalEnvironment = {}) {
  const result = spawnSync(process.execPath, arguments_, {
    cwd: process.cwd(),
    env: { ...process.env, ...additionalEnvironment },
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const directory of documentSetDirectories) {
  console.log(`\nValidating LeanMD document set: ${directory}`);
  runNode([validatorPath, directory]);
  runNode(["--test", testPaths.dagSample], {
    LEANMD_DOCUMENT_SET: directory,
  });
}

runNode([
  "--test",
  testPaths.appShell,
  testPaths.mapLayout,
  testPaths.mathPlugin,
]);
