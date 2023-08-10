const path = require("path");
const camera = require("./src/camera").load();

async function main() {
  const cameras = await camera.listAsync();
  console.log("cameras", cameras);
  if (cameras.length > 0) {
    const cameraInfo = cameras[0];
    await camera.openAsync(cameraInfo);

    console.log(await camera.summaryAsync());

    await camera.setConfigAsync("capturemode", "Burst");
    await camera.setConfigAsync("burstnumber", "3");

    await camera.triggerCaptureAsync();

    let cameraEvent;
    do {
      cameraEvent = await camera.waitForEventAsync(1000);

      // If file added event, get the file
      if (cameraEvent.type === 2) {
        const targetPath = path.join(__dirname, cameraEvent.path.name);
        await camera.getFileAsync(cameraEvent.path, targetPath);
      }
    } while (cameraEvent.type !== 1);

    await camera.closeAsync();
  }
}

main();
