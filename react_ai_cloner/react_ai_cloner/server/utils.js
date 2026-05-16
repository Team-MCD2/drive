import fs from "fs-extra";
import path from "path";

export async function saveFile(filepath, content) {
  await fs.ensureDir(path.dirname(filepath));
  await fs.writeFile(filepath, content);
}

export function sanitizeName(name) {
  return name
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_");
}