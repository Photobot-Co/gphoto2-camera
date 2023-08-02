const cameraAddon = require("bindings")("camera");

module.exports = {
  ...cameraAddon,
  CameraEventType: {
    Unknown: 0,
    Timeout: 1,
    FileAdded: 2,
    FolderAdded: 3,
    CaptureComplete: 4,
    FileChanged: 5,
  },
};
