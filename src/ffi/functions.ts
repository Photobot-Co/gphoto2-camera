import koffi from "koffi";
import promisify from "util.promisify";

export const setupFunctions = (
  libgphoto2: koffi.IKoffiLib,
  libc: koffi.IKoffiLib,
) => {
  // Creates a function with the given def which returns a promise
  const createAsyncFunc = (lib: koffi.IKoffiLib, def: string) => {
    const func = lib.func(def);
    return (...args: unknown[]): Promise<unknown> =>
      promisify(func.async)(...args);
  };

  // Creates a function with the given def which returns a promise
  // and will fail when the return value is negative
  const createErrorCheckingAsyncFunc = (lib: koffi.IKoffiLib, def: string) => {
    const func = createAsyncFunc(lib, def);
    return (...args: unknown[]) =>
      func(...args).then((ret: unknown) => {
        if (typeof ret !== "number") {
          throw new Error("Unknown return type");
        } else if (ret < 0) {
          throw new Error(`Error ${ret}`);
        } else {
          return ret;
        }
      });
  };

  /**
   * Allocate the memory for a new abilities list.
   */
  const gp_abilities_list_new = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_abilities_list_new(_Out_ CameraAbilitiesList** list)",
  );

  /**
   * Scans the system for camera drivers.
   */
  const gp_abilities_list_load = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_abilities_list_load(_Out_ CameraAbilitiesList* list, GPContext* context)",
  );

  /**
   * Search the list for an entry of given model name.
   */
  const gp_abilities_list_lookup_model = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_abilities_list_lookup_model(CameraAbilitiesList* list, char* model)",
  );

  /**
   * Retrieve the camera abilities of entry with supplied index number.
   */
  const gp_abilities_list_get_abilities = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_abilities_list_get_abilities(CameraAbilitiesList* list, int index, _Out_ CameraAbilities* abilities)",
  );

  /**
   * Free the given CameraAbilitiesList object.
   */
  const gp_abilities_list_free = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_abilities_list_free(CameraAbilitiesList* list)",
  );

  /**
   * Create a new GPPortInfoList.
   */
  const gp_port_info_list_new = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_port_info_list_new(_Out_ GPPortInfoList** list)",
  );

  /**
   * Load system ports.
   */
  const gp_port_info_list_load = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_port_info_list_load(GPPortInfoList* list)",
  );

  /**
   * Lookup a specific path in the list.
   */
  const gp_port_info_list_lookup_path = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_port_info_list_lookup_path(GPPortInfoList* list, char* path)",
  );

  /**
   * Get port information of specific entry.
   */
  const gp_port_info_list_get_info = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_port_info_list_get_info(GPPortInfoList* list, int n, _Out_ GPPortInfo* info)",
  );

  /**
   * Free a GPPortInfo list.
   */
  const gp_port_info_list_free = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_port_info_list_free(GPPortInfoList* list)",
  );

  /**
   * Creates a new context
   */
  const gp_context_new = createAsyncFunc(
    libgphoto2,
    "GPContext* gp_context_new(void)",
  );

  /**
   * Creates a new CameraList
   */
  const gp_list_new = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_list_new(_Out_ CameraList** list)",
  );

  /**
   * Decrements the reference count of the list
   *
   * If there are no references left, the list will be freed
   */
  const gp_list_unref = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_list_unref(CameraList* list)",
  );

  /**
   * Counts the entries in the list
   */
  const gp_list_count = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_list_count(CameraList* list)",
  );

  /**
   * Retrieves the name of entry with index.
   */
  const gp_list_get_name = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_list_get_name(CameraList* list, int index, _Out_ char** name)",
  );

  /**
   * Retrieves the value of entry with index.
   */
  const gp_list_get_value = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_list_get_value(CameraList* list, int index, _Out_ char** value)",
  );

  /**
   * Autodetect all detectable camera.
   *
   * This camera will autodetect all cameras that can be autodetected. This will for instance detect all USB cameras
   */
  const gp_camera_autodetect = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_camera_autodetect(_Out_ CameraList* list, GPContext* context)",
  );

  /**
   * Create a new camera device.
   */
  const gp_camera_new = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_camera_new(_Out_ Camera** camera)",
  );

  /**
   * Sets the camera abilities.
   */
  const gp_camera_set_abilities = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_camera_set_abilities(Camera* camera, CameraAbilities abilities)",
  );

  /**
   * Sets the camera abilities.
   */
  const gp_camera_set_port_info = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_camera_set_port_info(Camera* camera, GPPortInfo abilities)",
  );

  /**
   * Initiate a connection to the camera.
   */
  const gp_camera_init = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_camera_init(Camera* camera, GPContext* context)",
  );

  /**
   * Retrieves a camera summary.
   */
  const gp_camera_get_summary = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_camera_get_summary(Camera* camera, _Out_ CameraText* summary, GPContext* context)",
  );

  /**
   * Triggers capture of one or more images.
   *
   * This functions just remotely causes the shutter release and returns immediately. You will want to run #gp_camera_wait_event until a image is added which can be downloaded using gp_camera_file_get.
   */
  const gp_camera_trigger_capture = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_camera_trigger_capture(Camera* camera, GPContext* context)",
  );

  /**
   * Wait for an event from the camera.
   *
   * This function blocks and waits for an event to come from the camera. If timeout occurs before an event is received then *eventtype==GP_EVENT_TIMEOUT and eventdata is left unchanged. If an event is received then eventtype is set to the type of event, and eventdata is set to event specific data. See the CameraEventType enum to see which eventtype's match to which types of eventdata.
   */
  const gp_camera_wait_for_event = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_camera_wait_for_event(Camera* camera, int timeout, _Out_ CameraEventType* eventtype, _Out_ void** eventdata, GPContext* context)",
  );

  /**
   * Retrieves a file from the Camera.
   */
  const gp_camera_file_get = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_camera_file_get(Camera* camera, const char* folder, const char* file, CameraFileType type, _Out_ CameraFile* camera_file, GPContext* context)",
  );

  /**
   * Deletes the file from folder.
   */
  const gp_camera_file_delete = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_camera_file_delete(Camera* camera, const char* folder, const char* file, GPContext* context)",
  );

  /**
   * Retrieve a configuration window for the camera.
   */
  const gp_camera_get_config = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_camera_get_config(Camera* camera, _Out_ CameraWidget** window, GPContext* context)",
  );

  /**
   * Sets the configuration.
   */
  const gp_camera_set_config = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_camera_set_config(Camera* camera, CameraWidget* window, GPContext* context)",
  );

  /**
   * Exits and closes a camera connection.
   */
  const gp_camera_exit = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_camera_exit(Camera* camera, GPContext* context)",
  );

  /**
   * Counts the children of the CameraWidget.
   */
  const gp_widget_count_children = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_widget_count_children(CameraWidget* widget)",
  );

  /**
   * Retrieves the child at child_number of the parent.
   */
  const gp_widget_get_child = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_widget_get_child(CameraWidget *widget, int child_number, _Out_ CameraWidget **child)",
  );

  /**
   * Retrieves the child with name of the widget.
   */
  const gp_widget_get_child_by_name = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_widget_get_child_by_name(CameraWidget* widget, const char* name, _Out_ CameraWidget** child)",
  );

  /**
   * Retrieves the child with label of the widget.
   */
  const gp_widget_get_child_by_label = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_widget_get_child_by_label(CameraWidget* widget, const char* label, _Out_ CameraWidget** child)",
  );

  /**
   * Retrieves the name of the CameraWidget
   */
  const gp_widget_get_name = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_widget_get_name(CameraWidget* widget, _Out_ const char** name)",
  );

  /**
   * Retrieves the label of the CameraWidget
   */
  const gp_widget_get_label = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_widget_get_label(CameraWidget* widget, _Out_ const char** label)",
  );

  /**
   * Retrieves the readonly state of the CameraWidget.
   */
  const gp_widget_get_readonly = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_widget_get_readonly(CameraWidget* widget, _Out_ int* readonly)",
  );

  /**
   * Retrieves the type of the CameraWidget.
   */
  const gp_widget_get_type = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_widget_get_type(CameraWidget* widget, _Out_ CameraWidgetType* type)",
  );

  /**
   * Retrieves some range parameters of the CameraWidget.
   */
  const gp_widget_get_range = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_widget_get_range(CameraWidget* range, _Out_ float* min, _Out_ float* max, _Out_ float* increment)",
  );

  /**
   * Counts the choices of the CameraWidget.
   */
  const gp_widget_count_choices = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_widget_count_choices(CameraWidget* widget)",
  );

  /**
   * Retrieves the choice number choice_number.
   */
  const gp_widget_get_choice = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_widget_get_choice(CameraWidget* widget, int choice_number, _Out_ const char** choice)",
  );

  /**
   * Gets the value of the CameraWidget as a string.
   */
  const gp_widget_get_value_string = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_widget_get_value(CameraWidget* widget, _Out_ const char** value)",
  );

  /**
   * Gets the value of the CameraWidget as a float.
   */
  const gp_widget_get_value_float = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_widget_get_value(CameraWidget* widget, _Out_ float* value)",
  );

  /**
   * Sets the value of the CameraWidget.
   */
  const gp_widget_set_value = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_widget_set_value(CameraWidget* widget, const void* value)",
  );

  /**
   * Frees the CameraWidget memory.
   */
  const gp_widget_free = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_widget_free(CameraWidget* widget)",
  );

  /**
   * Create new CameraFile object frm a file description.
   */
  const gp_file_new_from_fd = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_file_new_from_fd(_Out_ CameraFile** file, int fd)",
  );

  /**
   * Free a CameraFile object.
   */
  const gp_file_free = createErrorCheckingAsyncFunc(
    libgphoto2,
    "int gp_file_free(CameraFile* file)",
  );

  /**
   * Open a file descriptor
   */
  const open = createAsyncFunc(
    libc,
    "int open(const char *pathname, int flags, uint32 mode)",
  );

  /**
   * Open a file descriptor
   */
  const fchmod = createAsyncFunc(libc, "int fchmod(int fd, uint32 mode)");

  return {
    gp_abilities_list_new,
    gp_abilities_list_load,
    gp_abilities_list_lookup_model,
    gp_abilities_list_get_abilities,
    gp_abilities_list_free,
    gp_port_info_list_new,
    gp_port_info_list_load,
    gp_port_info_list_lookup_path,
    gp_port_info_list_get_info,
    gp_port_info_list_free,
    gp_context_new,
    gp_list_new,
    gp_list_unref,
    gp_list_count,
    gp_list_get_name,
    gp_list_get_value,
    gp_camera_autodetect,
    gp_camera_new,
    gp_camera_set_abilities,
    gp_camera_set_port_info,
    gp_camera_init,
    gp_camera_get_summary,
    gp_camera_trigger_capture,
    gp_camera_wait_for_event,
    gp_camera_file_get,
    gp_camera_file_delete,
    gp_camera_get_config,
    gp_camera_set_config,
    gp_camera_exit,
    gp_widget_count_children,
    gp_widget_get_child,
    gp_widget_get_child_by_name,
    gp_widget_get_child_by_label,
    gp_widget_get_name,
    gp_widget_get_label,
    gp_widget_get_readonly,
    gp_widget_get_type,
    gp_widget_get_range,
    gp_widget_count_choices,
    gp_widget_get_choice,
    gp_widget_get_value_string,
    gp_widget_get_value_float,
    gp_widget_set_value,
    gp_widget_free,
    gp_file_new_from_fd,
    gp_file_free,
    open,
    fchmod,
  };
};
