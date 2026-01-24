#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(process.cwd(), "src");
const EXTENSIONS = new Set([
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!EXTENSIONS.has(path.extname(entry.name))) continue;

    processFile(fullPath);
  }
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  const lines = original.split("\n");

  let changed = false;

  const cleaned = lines.map(line => {
    let inSingle = false;
    let inDouble = false;
    let inTemplate = false;

    for (let i = 0; i < line.length - 1; i++) {
      const char = line[i];
      const next = line[i + 1];

      if (char === "\\" ) {
        i++;
        continue;
      }

      if (!inDouble && !inTemplate && char === "'") {
        inSingle = !inSingle;
        continue;
      }

      if (!inSingle && !inTemplate && char === '"') {
        inDouble = !inDouble;
        continue;
      }

      if (!inSingle && !inDouble && char === "`") {
        inTemplate = !inTemplate;
        continue;
      }

      if (
        !inSingle &&
        !inDouble &&
        !inTemplate &&
        char === "/" &&
        next === "/"
      ) {
        changed = true;
        return line.slice(0, i).trimEnd();
      }
    }

    return line;
  });

  if (changed) {
    fs.writeFileSync(filePath, cleaned.join("\n"), "utf8");
    console.log("cleaned:", filePath);
  }
}

walk(ROOT_DIR);
