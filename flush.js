const camera = require("./src/camera").load();

async function main() {
  const cameras = await camera.listAsync();
  if (cameras.length > 0) {
    const cameraInfo = cameras[0];
    await camera.openAsync(cameraInfo);
    await camera.flushEventsAsync(1000);
    await camera.closeAsync();

    await camera.openAsync(cameraInfo);
    await camera.flushEventsAsync(1000);
    await camera.closeAsync();
  }
}

main();
