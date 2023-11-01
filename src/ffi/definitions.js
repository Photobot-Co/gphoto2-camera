"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDefinitions = void 0;
var koffi_1 = require("koffi");
var setupDefinitions = function () {
  /**
   * A list of cameras.
   */
  var CameraList = koffi_1.default.opaque("CameraList");
  /**
   * Opaque camera reference. All of the details are internal to the library
   */
  var Camera = koffi_1.default.opaque("Camera");
  /**
   * A list of camera abilities.
   */
  var CameraAbilitiesList = koffi_1.default.opaque("CameraAbilitiesList");
  /**
   * Describes the properties of a specific camera
   */
  var CameraAbilities = koffi_1.default.struct("CameraAbilities", {
    model: koffi_1.default.array("char", 128),
    status: "unsigned int",
    port: "unsigned int",
    speed: koffi_1.default.array("int", 64),
    operations: "unsigned int",
    file_operations: "unsigned int",
    folder_operations: "unsigned int",
    usb_vendor: "int",
    usb_product: "int",
    usb_class: "int",
    usb_subclass: "int",
    usb_protocol: "int",
    library: koffi_1.default.array("char", 1024),
    id: koffi_1.default.array("char", 1024),
    device_type: "unsigned int",
    reserved2: "int",
    reserved3: "int",
    reserved4: "int",
    reserved5: "int",
    reserved6: "int",
    reserved7: "int",
    reserved8: "int",
  });
  /**
   * A list of camera abilities.
   */
  var GPPortInfoList = koffi_1.default.opaque("GPPortInfoList");
  /**
   * Describes the properties of a specific port
   */
  var GPPortInfo = koffi_1.default.struct("GPPortInfo", {
    type: "unsigned int",
    name: "char",
    path: "char",
    library_filename: "char",
  });
  /**
   * A text structure containing translated text returned by various functions (about, manual, summary). You should not assume a size.
   */
  var CameraText = koffi_1.default.struct("CameraText", {
    text: koffi_1.default.array("char", 32 * 1024),
  });
  /**
   * An enum of the camera event type
   */
  var CameraEventType = koffi_1.default.alias(
    "CameraEventType",
    "unsigned int",
  );
  /**
   * The type of view on the specified file.
   *
   * Specifies the file of the current file, usually passed to the gp_camera_file_get() and gp_camera_file_put() functions. This is useful for multiple views of one file, like that an single image file has "raw", "normal", "exif" and "preview" views, or a media file has "normal" and "metadata" file views.
   */
  var CameraFileType = koffi_1.default.alias("CameraFileType", "unsigned int");
  /**
   * A structure created by the capture operation.
   *
   * A structure containing the folder and filename of an object after a successful capture and is passed as reference to the gp_camera_capture() function.
   */
  var CameraFilePath = koffi_1.default.struct("CameraFilePath", {
    name: koffi_1.default.array("char", 128),
    folder: koffi_1.default.array("char", 1024),
  });
  /**
   * File structure.
   *
   * The internals of the CameraFile struct are private, please use the accessor functions.
   */
  var CameraFile = koffi_1.default.opaque("CameraFile");
  /**
   * The internals of the CameraWidget are only visible to gphoto2. You can only access them using the functions provided by gphoto2.
   */
  var CameraWidget = koffi_1.default.opaque("CameraWidget");
  /**
   * Type of the widget.
   *
   * The actual widget type we want to create. The type of the value it supports depends on this type.
   */
  var CameraWidgetType = koffi_1.default.alias(
    "CameraWidgetType",
    "unsigned int",
  );
  /**
   * Opaque function pointers for the GPContext struct
   */
  var GPContextIdleFunc = koffi_1.default.pointer(
    "GPContextIdleFunc",
    koffi_1.default.opaque(),
    1,
  );
  var GPContextProgressStartFunc = koffi_1.default.pointer(
    "GPContextProgressStartFunc",
    koffi_1.default.opaque(),
    1,
  );
  var GPContextProgressUpdateFunc = koffi_1.default.pointer(
    "GPContextProgressUpdateFunc",
    koffi_1.default.opaque(),
    1,
  );
  var GPContextProgressStopFunc = koffi_1.default.pointer(
    "GPContextProgressStopFunc",
    koffi_1.default.opaque(),
    1,
  );
  var GPContextErrorFunc = koffi_1.default.pointer(
    "GPContextErrorFunc",
    koffi_1.default.opaque(),
    1,
  );
  var GPContextQuestionFunc = koffi_1.default.pointer(
    "GPContextQuestionFunc",
    koffi_1.default.opaque(),
    1,
  );
  var GPContextCancelFunc = koffi_1.default.pointer(
    "GPContextCancelFunc",
    koffi_1.default.opaque(),
    1,
  );
  var GPContextStatusFunc = koffi_1.default.pointer(
    "GPContextStatusFunc",
    koffi_1.default.opaque(),
    1,
  );
  var GPContextMessageFunc = koffi_1.default.pointer(
    "GPContextMessageFunc",
    koffi_1.default.opaque(),
    1,
  );
  /**
   * The gphoto context structure.
   *
   * This structure allows callback handling, passing error contexts back, progress handling and download
   * cancellation and similar things. It is usually passed around the functions.
   *
   * @see http://gphoto.org/doc/api/gphoto2-context_8h.html#a3ecfdf82f972b15f8d4feb26a9d25b92
   */
  var GPContext = koffi_1.default.struct("GPContext", {
    idle_func: GPContextIdleFunc,
    idle_func_data: "void *",
    progress_start_func: GPContextProgressStartFunc,
    progress_update_func: GPContextProgressUpdateFunc,
    progress_stop_func: GPContextProgressStopFunc,
    progress_func_data: "void *",
    error_func: GPContextErrorFunc,
    error_func_data: "void *",
    question_func: GPContextQuestionFunc,
    question_func_data: "void *",
    cancel_func: GPContextCancelFunc,
    cancel_func_data: "void *",
    status_func: GPContextStatusFunc,
    status_func_data: "void *",
    message_func: GPContextMessageFunc,
    message_func_data: "void *",
    ref_count: "unsigned int",
  });
  return {
    CameraList: CameraList,
    Camera: Camera,
    CameraAbilitiesList: CameraAbilitiesList,
    CameraAbilities: CameraAbilities,
    CameraText: CameraText,
    GPPortInfoList: GPPortInfoList,
    GPPortInfo: GPPortInfo,
    CameraEventType: CameraEventType,
    CameraFileType: CameraFileType,
    CameraFilePath: CameraFilePath,
    CameraFile: CameraFile,
    CameraWidget: CameraWidget,
    CameraWidgetType: CameraWidgetType,
    GPContextIdleFunc: GPContextIdleFunc,
    GPContextProgressStartFunc: GPContextProgressStartFunc,
    GPContextProgressUpdateFunc: GPContextProgressUpdateFunc,
    GPContextProgressStopFunc: GPContextProgressStopFunc,
    GPContextErrorFunc: GPContextErrorFunc,
    GPContextQuestionFunc: GPContextQuestionFunc,
    GPContextCancelFunc: GPContextCancelFunc,
    GPContextStatusFunc: GPContextStatusFunc,
    GPContextMessageFunc: GPContextMessageFunc,
    GPContext: GPContext,
  };
};
exports.setupDefinitions = setupDefinitions;
