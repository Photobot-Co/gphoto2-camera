import TerminalImage from "terminal-image";
import { load } from "./src";

async function main() {
  const camera = await load();
  const cameras = await camera.listAsync();
  console.log("cameras", cameras);
  if (cameras.length > 0) {
    const cameraInfo = cameras[0];
    await camera.openAsync(cameraInfo);

    await camera.setConfigAsync(cameraInfo, { viewfinder: true });

    for (let i = 0; i < 100; i += 1) {
      try {
        const { data } = await camera.triggerCapturePreviewAsync(cameraInfo);
        console.log(await TerminalImage.buffer(data));
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (e) {
        console.warn("Error getting preview image", e);
      }
    }

    await camera.setConfigAsync(cameraInfo, { viewfinder: false });

    await camera.closeAsync(cameraInfo);
  }
}

main();
