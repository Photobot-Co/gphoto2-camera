const CameraEventType = require("./CameraEventType");

module.exports = {
  load: () => require("bindings")("camera"),
  CameraEventType,
};
