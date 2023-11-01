import path from "path";
import { load } from "./src";

async function main() {
  const camera = await load();
  const cameras = await camera.listAsync();
  console.log("cameras", cameras);
  if (cameras.length > 0) {
    const cameraInfo = cameras[0];
    await camera.openAsync(cameraInfo);

    console.log(await camera.summaryAsync(cameraInfo));

    await camera.setConfigAsync(cameraInfo, {
      capturemode: "Burst",
      burstnumber: "3",
    });
    // await camera.setConfigAsync(cameraInfo);

    await camera.triggerCaptureAsync(cameraInfo);

    let cameraEvent;
    do {
      cameraEvent = await camera.waitForEventAsync(cameraInfo, 1000);

      // If file added event, get the file
      if (cameraEvent.type === 2) {
        const targetPath = path.join(__dirname, cameraEvent.path.name);
        await camera.getFileAsync(cameraInfo, cameraEvent.path, targetPath);
      }
    } while (cameraEvent.type !== 1);

    await camera.closeAsync(cameraInfo);
  }
}

main();
