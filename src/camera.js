const cameraAddon = require("bindings")("camera");
const CameraEventType = require("./CameraEventType");

module.exports = {
  ...cameraAddon,
  CameraEventType,
};
