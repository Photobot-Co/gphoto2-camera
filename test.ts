import path from "path";
import { CameraEvent, CameraEventType, load, LoggingLevel } from "./src";

async function main() {
  const camera = await load();
  await camera.addLogFunc(LoggingLevel.Data, (level, domain, string) =>
    console.log(level, domain, string),
  );
  const cameras = await camera.listAsync();
  console.log("cameras", cameras);
  if (cameras.length > 0) {
    let cameraEvent: CameraEvent;

    const cameraInfo = cameras[0];
    await camera.openAsync(cameraInfo);

    await camera.setConfigAsync(cameraInfo, {
      capturemode: "Single Shot",
      "main/capturesettings/burstnumber": "1",
    });
    await camera.triggerCaptureAsync(cameraInfo);
    do {
      cameraEvent = await camera.waitForEventAsync(cameraInfo, 1000);
      console.log("start cameraEvent", cameraEvent);
    } while (cameraEvent.type !== CameraEventType.Timeout);

    console.log(await camera.summaryAsync(cameraInfo));

    console.log(await camera.getConfigAsync(cameraInfo));

    await camera.setConfigAsync(cameraInfo, {
      capturemode: "Burst",
      "main/capturesettings/burstnumber": "3",
    });

    await camera.triggerCaptureAsync(cameraInfo);

    do {
      cameraEvent = await camera.waitForEventAsync(cameraInfo, 1000);
      console.log("cameraEvent", cameraEvent);

      // If file added event, get the file
      if (cameraEvent.type === 2) {
        const targetPath = path.join(
          import.meta.dirname,
          cameraEvent.path.name,
        );
        await camera.getFileAsync(cameraInfo, cameraEvent.path, targetPath);
      }
    } while (cameraEvent.type !== CameraEventType.Timeout);

    await camera.closeAsync(cameraInfo);
  }
}

main();
