import axios from "axios";
import fs from "fs-extra";
import path from "path";

export async function downloadAsset(url, outputFolder) {
  try {
    const response = await axios({
      url,
      method: "GET",
      responseType: "arraybuffer"
    });

    const filename = path.basename(new URL(url).pathname);

    const filepath = path.join(outputFolder, filename);

    await fs.ensureDir(outputFolder);

    await fs.writeFile(filepath, response.data);

    console.log("Downloaded asset:", filename);

    return filepath;

  } catch (err) {
    console.log("Asset failed:", url);
  }
}