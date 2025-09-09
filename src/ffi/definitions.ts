import koffi from "koffi";

export const setupDefinitions = () => {
  /**
   * A list of cameras.
   */
  const CameraList = koffi.opaque("CameraList");

  /**
   * Opaque camera reference. All of the details are internal to the library
   */
  const Camera = koffi.opaque("Camera");

  /**
   * A list of camera abilities.
   */
  const CameraAbilitiesList = koffi.opaque("CameraAbilitiesList");

  /**
   * Describes the properties of a specific camera
   */
  const CameraAbilities = koffi.struct("CameraAbilities", {
    model: koffi.array("char", 128),
    status: "unsigned int",
    port: "unsigned int",
    speed: koffi.array("int", 64),
    operations: "unsigned int",
    file_operations: "unsigned int",
    folder_operations: "unsigned int",
    usb_vendor: "int",
    usb_product: "int",
    usb_class: "int",
    usb_subclass: "int",
    usb_protocol: "int",
    library: koffi.array("char", 1024),
    id: koffi.array("char", 1024),
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
  const GPPortInfoList = koffi.opaque("GPPortInfoList");

  /**
   * Describes the properties of a specific port
   */
  const GPPortInfo = koffi.struct("GPPortInfo", {
    type: "unsigned int",
    name: "char",
    path: "char",
    library_filename: "char",
  });

  /**
   * A text structure containing translated text returned by various functions (about, manual, summary). You should not assume a size.
   */
  const CameraText = koffi.struct("CameraText", {
    text: koffi.array("char", 32 * 1024),
  });

  /**
   * An enum of the camera event type
   */
  const CameraEventType = koffi.alias("CameraEventType", "unsigned int");

  /**
   * The type of view on the specified file.
   *
   * Specifies the file of the current file, usually passed to the gp_camera_file_get() and gp_camera_file_put() functions. This is useful for multiple views of one file, like that an single image file has "raw", "normal", "exif" and "preview" views, or a media file has "normal" and "metadata" file views.
   */
  const CameraFileType = koffi.alias("CameraFileType", "unsigned int");

  /**
   * A structure created by the capture operation.
   *
   * A structure containing the folder and filename of an object after a successful capture and is passed as reference to the gp_camera_capture() function.
   */
  const CameraFilePath = koffi.struct("CameraFilePath", {
    name: koffi.array("char", 128),
    folder: koffi.array("char", 1024),
  });

  /**
   * File structure.
   *
   * The internals of the CameraFile struct are private, please use the accessor functions.
   */
  const CameraFile = koffi.opaque("CameraFile");

  /**
   * The internals of the CameraWidget are only visible to gphoto2. You can only access them using the functions provided by gphoto2.
   */
  const CameraWidget = koffi.opaque("CameraWidget");

  /**
   * Type of the widget.
   *
   * The actual widget type we want to create. The type of the value it supports depends on this type.
   */
  const CameraWidgetType = koffi.alias("CameraWidgetType", "unsigned int");

  /**
   * Opaque function pointers for the GPContext struct
   */
  const GPContextIdleFunc = koffi.pointer(
    "GPContextIdleFunc",
    koffi.opaque(),
    1,
  );
  const GPContextProgressStartFunc = koffi.pointer(
    "GPContextProgressStartFunc",
    koffi.opaque(),
    1,
  );
  const GPContextProgressUpdateFunc = koffi.pointer(
    "GPContextProgressUpdateFunc",
    koffi.opaque(),
    1,
  );
  const GPContextProgressStopFunc = koffi.pointer(
    "GPContextProgressStopFunc",
    koffi.opaque(),
    1,
  );
  const GPContextErrorFunc = koffi.pointer(
    "GPContextErrorFunc",
    koffi.opaque(),
    1,
  );
  const GPContextQuestionFunc = koffi.pointer(
    "GPContextQuestionFunc",
    koffi.opaque(),
    1,
  );
  const GPContextCancelFunc = koffi.pointer(
    "GPContextCancelFunc",
    koffi.opaque(),
    1,
  );
  const GPContextStatusFunc = koffi.pointer(
    "GPContextStatusFunc",
    koffi.opaque(),
    1,
  );
  const GPContextMessageFunc = koffi.pointer(
    "GPContextMessageFunc",
    koffi.opaque(),
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
  const GPContext = koffi.struct("GPContext", {
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

  /**
   * Logging function hook.
   *
   * This is the function frontends can use to receive logging information from the libgphoto2 framework. It
   * is set using gp_log_add_func() and removed using gp_log_remove_func() and will then receive the logging
   * messages of the level specified.
   */
  const GPLogFunc = koffi.proto(
    "void GPLogFunc(int level, const char* domain, const char* str, void* data)",
  );

  return {
    CameraList,
    Camera,
    CameraAbilitiesList,
    CameraAbilities,
    CameraText,
    GPPortInfoList,
    GPPortInfo,
    CameraEventType,
    CameraFileType,
    CameraFilePath,
    CameraFile,
    CameraWidget,
    CameraWidgetType,
    GPContextIdleFunc,
    GPContextProgressStartFunc,
    GPContextProgressUpdateFunc,
    GPContextProgressStopFunc,
    GPContextErrorFunc,
    GPContextQuestionFunc,
    GPContextCancelFunc,
    GPContextStatusFunc,
    GPContextMessageFunc,
    GPContext,
    GPLogFunc,
  };
};
