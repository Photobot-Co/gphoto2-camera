import koffi from "koffi";
import fs from "fs";
import { getFfi, makeArrayPointer } from "./ffi";
import {
  CameraEvent,
  CameraFilePath,
  CameraModule,
  CameraInfo,
  CameraEventType,
  WidgetType,
  ConfigWidget,
} from "./types";

const GP_OK = 0;
const GP_ERROR_UNKNOWN_PORT = -5;

const GP_FILE_TYPE_NORMAL = 1;

/**
 * Do the actual loading of the library
 */
export const loadInternal = async (): Promise<
  CameraModule & { ffi: ReturnType<typeof getFfi> }
> => {
  // Get the library. This will fail if the shared library cannot be found
  const ffi = getFfi();

  // Create the gphoto context to use
  const context = await ffi.gp_context_new();

  // This will store the references to the open cameras so they can be used later
  const openCameraRefs = new Map<string, unknown>();

  // Gets the open camera or throws an error if not open
  const _getOpenCamera = (cameraInfo: CameraInfo) => {
    // Get the open camera reference, throwing an error if not open
    const camera = openCameraRefs.get(cameraInfo.port);
    if (!camera) {
      throw new Error("Camera needs to be opened first");
    }

    return camera;
  };

  /**
   * Run a function for each config item from a camera
   */
  const _forEachCameraConfig = async (
    camera: unknown,
    handler: (args: {
      prefix: string;
      widgetName: string;
      widgetType: WidgetType;
      widget: unknown;
    }) => void | Promise<void>,
  ) => {
    // Get the root config
    const rootConfigWidgetPointer = makeArrayPointer();
    await ffi.gp_camera_get_config(camera, rootConfigWidgetPointer, context);
    const rootConfigWidget = rootConfigWidgetPointer[0];

    // Call the handler recursively from the root widget
    try {
      const getConfig = async (widget: unknown, prefix = "") => {
        // Get the name of the widget
        const widgetNamePointer = makeArrayPointer();
        await ffi.gp_widget_get_name(widget, widgetNamePointer);
        const widgetName = widgetNamePointer[0] as string;

        // We need to decide if we should include the config item based on the options
        const typePointer = makeArrayPointer();
        await ffi.gp_widget_get_type(widget, typePointer);
        const widgetType = typePointer[0] as WidgetType;

        await handler({ prefix, widgetName, widgetType, widget });

        // Get the config for any child widgets
        const childCount = await ffi.gp_widget_count_children(widget);
        for (let i = 0; i < childCount; i += 1) {
          const childWidgetPointer = makeArrayPointer();
          await ffi.gp_widget_get_child(widget, i, childWidgetPointer);
          const childWidget = childWidgetPointer[0];
          await getConfig(childWidget, prefix + widgetName + "/");
        }
      };
      await getConfig(rootConfigWidget);
    } finally {
      // Free the used memory for the root widget
      await ffi.gp_widget_unref(rootConfigWidget);
    }
  };

  /**
   * List the cameras that are currently connected
   */
  const listAsync = async (): Promise<CameraInfo[]> => {
    // Create a new list to retrieve results into
    const listPointer = makeArrayPointer();
    await ffi.gp_list_new(listPointer);
    const list = listPointer[0];

    // Auto-detect cameras and put them into the list
    await ffi.gp_camera_autodetect(list, context);

    // Get the number of cameras which were detected
    const count = (await ffi.gp_list_count(list)) as number;

    // For each camera, get the name and value from the list and return an array with the details in
    const cameras: CameraInfo[] = [];
    for (let cameraIndex = 0; cameraIndex < count; cameraIndex += 1) {
      const namePointer = makeArrayPointer();
      await ffi.gp_list_get_name(list, cameraIndex, namePointer);
      const name = namePointer[0] as string;

      const portPointer = makeArrayPointer();
      await ffi.gp_list_get_value(list, cameraIndex, portPointer);
      const port = portPointer[0] as string;

      cameras.push({ name, port });
    }
    await ffi.gp_list_unref(list);
    return cameras;
  };

  /**
   * Opens a connection to a camera
   */
  const openAsync = async (cameraInfo: CameraInfo): Promise<void> => {
    // If the camera is already open then just return as there's nothing to do
    if (openCameraRefs.has(cameraInfo.port)) {
      return;
    }

    // Allocate the memory for a camera reference
    const cameraPointer = makeArrayPointer();
    await ffi.gp_camera_new(cameraPointer);
    const camera = cameraPointer[0];

    // Allocate the memory for the abilities list
    const abilitiesListPointer = makeArrayPointer();
    await ffi.gp_abilities_list_new(abilitiesListPointer);
    const abilitiesList = abilitiesListPointer[0];

    // Load the information about what drivers are available into the ability list
    await ffi.gp_abilities_list_load(abilitiesList, context);

    // Get the abilities for the given model and add them to the camera instance
    const modelIndex = await ffi.gp_abilities_list_lookup_model(
      abilitiesList,
      cameraInfo.name,
    );
    const cameraAbilitiesPointer = makeArrayPointer();
    await ffi.gp_abilities_list_get_abilities(
      abilitiesList,
      modelIndex,
      cameraAbilitiesPointer,
    );
    const cameraAbilities = cameraAbilitiesPointer[0];
    await ffi.gp_camera_set_abilities(camera, cameraAbilities);

    // Free the abilities list
    await ffi.gp_abilities_list_free(abilitiesList);

    // Allocate the memory for the port info list
    const portInfoListPointer = makeArrayPointer();
    await ffi.gp_port_info_list_new(portInfoListPointer);
    const portInfoList = portInfoListPointer[0];

    // Load the list of available ports
    await ffi.gp_port_info_list_load(portInfoList);

    // Get the port info for the given port path and add them to the camera interface
    const portIndex = await ffi.gp_port_info_list_lookup_path(
      portInfoList,
      cameraInfo.port,
    );
    if (portIndex === GP_ERROR_UNKNOWN_PORT) {
      throw new Error("Unknown port");
    }
    const portInfoPointer = makeArrayPointer();
    await ffi.gp_port_info_list_get_info(
      portInfoList,
      portIndex,
      portInfoPointer,
    );
    const portInfo = portInfoPointer[0];
    await ffi.gp_camera_set_port_info(camera, portInfo);

    // Free the port info list
    await ffi.gp_port_info_list_free(portInfoList);

    // Init the camera
    await ffi.gp_camera_init(camera, context);

    // Store an instance of the camera
    openCameraRefs.set(cameraInfo.port, camera);
  };

  /**
   * Closes the connection to the camera
   */
  const closeAsync = async (cameraInfo: CameraInfo): Promise<boolean> => {
    // Get the open camera reference, returning early if the camera is already closed
    const camera = openCameraRefs.get(cameraInfo.port);
    if (!camera) {
      return false;
    }

    // Exit the camera
    try {
      await ffi.gp_camera_exit(camera, context);
    } catch (e) {
      console.warn("Error while exiting camera. Ignoring", e);
    }
    try {
      await ffi.gp_camera_unref(camera);
    } catch (e) {
      console.warn("Error while unrefing camera. Ignoring", e);
    }

    // Remove the camera from the open ref map
    openCameraRefs.delete(cameraInfo.port);

    // Return true to show we closed the camera
    return true;
  };

  /**
   * Get the summary for the connected camera
   */
  const summaryAsync = async (cameraInfo: CameraInfo): Promise<string> => {
    // Get the open camera reference, throwing an error if not open
    const camera = _getOpenCamera(cameraInfo);

    // Get the summary for the open camera
    const cameraTextPointer = makeArrayPointer();
    await ffi.gp_camera_get_summary(camera, cameraTextPointer, context);
    const cameraText = cameraTextPointer[0] as { text: string };

    // Return the summary text
    return cameraText.text;
  };

  /**
   * Trigger a capture on the given camera
   */
  const triggerCaptureAsync = async (cameraInfo: CameraInfo): Promise<void> => {
    // Get the open camera reference, throwing an error if not open
    const camera = _getOpenCamera(cameraInfo);

    // Trigger a capture on the camera
    await ffi.gp_camera_trigger_capture(camera, context);
  };

  /**
   * Trigger a capture on the given camera
   */
  const triggerCapturePreviewAsync = async (
    cameraInfo: CameraInfo,
  ): Promise<{ data: Uint8Array; size: number; mimeType: string }> => {
    // Get the open camera reference, throwing an error if not open
    const camera = _getOpenCamera(cameraInfo);

    // Create the preview file object to capture into
    const filePointer = makeArrayPointer();
    await ffi.gp_file_new(filePointer);
    const file = filePointer[0];

    // Trigger a capture preview on the camera
    await ffi.gp_camera_capture_preview(camera, file, context);

    // Get the data from the file object
    const dataPointer = makeArrayPointer();
    const sizePointer = makeArrayPointer();
    await ffi.gp_file_get_data_and_size(file, dataPointer, sizePointer);
    const size = sizePointer[0] as number;
    const data = koffi.decode(
      dataPointer[0],
      koffi.array("char", size, "Typed"),
    );

    // Get the mime type of the preview image
    const mimeTypePointer = makeArrayPointer();
    await ffi.gp_file_get_mime_type(file, mimeTypePointer);
    const mimeType = mimeTypePointer[0] as string;

    // Free the file
    await ffi.gp_file_free(file);

    return { data, size, mimeType };
  };

  /**
   * Gets the config for the given camera
   */
  const getConfigAsync = async (
    cameraInfo: CameraInfo,
    options: {
      /**
       * Supply a function to filter which config items will be returned. Return true to include the item, false to exclude it.
       */
      filter?: (name: string, type: WidgetType) => boolean;
      /**
       * Set to true to only include config which which are not read only
       */
      ignoreReadOnly?: boolean;
    } = {},
  ): Promise<{ [key: string]: string | number | boolean }> => {
    // Get the camera, throwing an error if the camera isn't open
    const camera = _getOpenCamera(cameraInfo);

    const config: { [key: string]: string | number | boolean } = {};
    await _forEachCameraConfig(
      camera,
      async ({ prefix, widgetName, widget, widgetType }) => {
        // We need to decide if we should include the config item based on the options
        const configKey = prefix + widgetName;
        let shouldInclude = options.filter
          ? options.filter(widgetName, widgetType)
          : true;
        if (shouldInclude && options.ignoreReadOnly) {
          // Check if it is read only and mark it as don't include if it is
          const readOnlyPointer = makeArrayPointer();
          await ffi.gp_widget_get_readonly(widget, readOnlyPointer);
          shouldInclude = readOnlyPointer[0] !== 1;
        }

        // If we've decided to include it, then get the value based on the type
        if (shouldInclude) {
          try {
            switch (widgetType) {
              // Get the value as a string
              case WidgetType.Menu:
              case WidgetType.Radio:
              case WidgetType.Text: {
                const valuePointer = makeArrayPointer();
                await ffi.gp_widget_get_value_string(widget, valuePointer);
                config[configKey] = valuePointer[0] as string;
                break;
              }
              // Get the value as a number
              case WidgetType.Range: {
                const valuePointer = makeArrayPointer();
                await ffi.gp_widget_get_value_float(widget, valuePointer);
                config[configKey] = valuePointer[0] as number;
                break;
              }
              case WidgetType.Toggle: {
                const valuePointer = makeArrayPointer();
                await ffi.gp_widget_get_value_float(widget, valuePointer);
                config[configKey] = !!valuePointer[0];
                break;
              }
            }
          } catch (e) {
            console.warn(`Unable to get value for ${widgetName}`, e);
          }
        }
      },
    );

    // Return the config
    return config;
  };

  /**
   * Gets the config for the given camera
   */
  const getConfigWidgetsAsync = async (
    cameraInfo: CameraInfo,
    options: {
      /**
       * Supply a function to filter which config items will be returned. Return true to include the item, false to exclude it.
       */
      filter?: (name: string, type: WidgetType) => boolean;
      /**
       * Set to true to only include config which which are not read only
       */
      ignoreReadOnly?: boolean;
    } = {},
  ): Promise<{ [key: string]: ConfigWidget }> => {
    // Get the camera, throwing an error if the camera isn't open
    const camera = _getOpenCamera(cameraInfo);

    const config: { [key: string]: ConfigWidget } = {};
    await _forEachCameraConfig(
      camera,
      async ({ prefix, widgetName, widget, widgetType }) => {
        // We need to decide if we should include the config item based on the options
        const configKey = prefix + widgetName;
        let shouldInclude = options.filter
          ? options.filter(widgetName, widgetType)
          : true;
        if (shouldInclude && options.ignoreReadOnly) {
          // Check if it is read only and mark it as don't include if it is
          const readOnlyPointer = makeArrayPointer();
          await ffi.gp_widget_get_readonly(widget, readOnlyPointer);
          shouldInclude = readOnlyPointer[0] !== 1;
        }

        // If we've decided to include it, then get the value based on the type
        if (shouldInclude) {
          const labelPointer = makeArrayPointer();
          await ffi.gp_widget_get_label(widget, labelPointer);
          const widgetLabel = labelPointer[0] as string;

          try {
            switch (widgetType) {
              // Get the value as a string
              case WidgetType.Text: {
                const valuePointer = makeArrayPointer();
                await ffi.gp_widget_get_value_string(widget, valuePointer);
                config[configKey] = {
                  type: widgetType,
                  label: widgetLabel,
                  value: valuePointer[0] as string,
                };
                break;
              }
              // Get the value as a number
              case WidgetType.Range: {
                const valuePointer = makeArrayPointer();
                await ffi.gp_widget_get_value_float(widget, valuePointer);
                const minPointer = makeArrayPointer();
                const maxPointer = makeArrayPointer();
                const incrementPointer = makeArrayPointer();
                await ffi.gp_widget_get_range(
                  widget,
                  minPointer,
                  maxPointer,
                  incrementPointer,
                );
                config[configKey] = {
                  type: widgetType,
                  label: widgetLabel,
                  value: valuePointer[0] as number,
                  min: minPointer[0] as number,
                  max: maxPointer[0] as number,
                  increment: incrementPointer[0] as number,
                };
                break;
              }
              // Get the value as a float and then convert to a boolean
              case WidgetType.Toggle: {
                const valuePointer = makeArrayPointer();
                await ffi.gp_widget_get_value_float(widget, valuePointer);
                config[configKey] = {
                  type: widgetType,
                  label: widgetLabel,
                  value: !!valuePointer[0],
                };
                break;
              }
              case WidgetType.Menu:
              case WidgetType.Radio: {
                const valuePointer = makeArrayPointer();
                await ffi.gp_widget_get_value_string(widget, valuePointer);

                const choiceCount = await ffi.gp_widget_count_choices(widget);
                const choices: string[] = [];
                for (let i = 0; i < choiceCount; i++) {
                  const choicePointer = makeArrayPointer();
                  await ffi.gp_widget_get_choice(widget, i, choicePointer);
                  choices.push(choicePointer[0] as string);
                }

                config[configKey] = {
                  type: widgetType,
                  label: widgetLabel,
                  value: valuePointer[0] as string,
                  choices,
                };
                break;
              }
            }
          } catch (e) {
            console.warn(`Unable to get value for ${widgetName}`, e);
          }
        }
      },
    );

    // Return the config
    return config;
  };

  /**
   * Sets the config value for the given camera
   */
  const setConfigAsync = async (
    cameraInfo: CameraInfo,
    newConfig: { [key: string]: string | number | boolean },
    options: { ignoreErrors?: boolean } = {},
  ): Promise<void> => {
    const throwOrWarn = (message: string) => {
      if (options.ignoreErrors) {
        console.warn(message);
      } else {
        throw new Error(message);
      }
    };
    // Get the camera, throwing an error if the camera isn't open
    const camera = _getOpenCamera(cameraInfo);

    // Get the root config
    const rootConfigPointer = makeArrayPointer();
    await ffi.gp_camera_get_config(camera, rootConfigPointer, context);
    const rootConfig = rootConfigPointer[0];

    try {
      // Split the new config into entires
      const entires = Object.entries(newConfig);

      // Go through each entry and set the value on the config
      entriesLoop: for (const [name, value] of entires) {
        const nameParts = name.split("/");
        const lastNamePart =
          nameParts.length > 0 ? nameParts[nameParts.length - 1] : name;

        // Try getting by name
        const widgetPointer = makeArrayPointer();
        let getConfigRet = await ffi.gp_widget_get_child_by_name(
          rootConfig,
          lastNamePart,
          widgetPointer,
        );

        // If that didn't work then try getting by label
        if (getConfigRet < GP_OK) {
          getConfigRet = await ffi.gp_widget_get_child_by_label(
            rootConfig,
            lastNamePart,
            widgetPointer,
          );
        }

        // If we weren't able to get by either, then throw an error
        if (getConfigRet < GP_OK) {
          throwOrWarn(`Unable to get config with name ${name}`);
          continue entriesLoop;
        }
        const widget = widgetPointer[0];

        // Check if it is read only and return an error if it is
        const readOnlyPointer = makeArrayPointer();
        await ffi.gp_widget_get_readonly(widget, readOnlyPointer);
        const readOnly = readOnlyPointer[0];
        if (readOnly === 1) {
          throwOrWarn(`Unable to change the value of readonly config ${name}`);
          continue entriesLoop;
        }

        // Get the type of widget so we know what to do
        const typePointer = makeArrayPointer();
        await ffi.gp_widget_get_type(widget, typePointer);
        const type = typePointer[0] as WidgetType;

        switch (type) {
          // For text types: just set the value
          case WidgetType.Text:
            if (typeof value !== "string") {
              throwOrWarn(
                `Must pass a string when setting ${name} with a text type`,
              );
              continue entriesLoop;
            }

            await ffi.gp_widget_set_value(widget, value);
            break;

          // For range types: parse as a float, check the range is correct, and then set it
          case WidgetType.Range: {
            const floatValue =
              typeof value === "string"
                ? parseFloat(value)
                : typeof value === "boolean"
                  ? value === true
                    ? 1
                    : 0
                  : value;
            if (Number.isNaN(floatValue)) {
              throwOrWarn(
                `Must pass a float string when setting ${name} with a range type. Got ${value}`,
              );
              continue entriesLoop;
            }

            const maxPointer = makeArrayPointer();
            const minPointer = makeArrayPointer();
            const incrementPointer = makeArrayPointer();
            await ffi.gp_widget_get_range(
              widget,
              minPointer,
              maxPointer,
              incrementPointer,
            );
            const max = maxPointer[0] as number;
            const min = minPointer[0] as number;

            if (floatValue > max || floatValue < min) {
              throwOrWarn(
                `Must pass a float string between ${min} and ${max} when setting ${name} with a range type. Got ${value}`,
              );
              continue entriesLoop;
            }

            await ffi.gp_widget_set_value(
              widget,
              koffi.as([floatValue], "float *"),
            );
            break;
          }

          // For toggle types: Check if we got a "true" string and set the number value based on that
          case WidgetType.Toggle: {
            const intValue =
              value === true || value === "true" || value === 1 ? 1 : 0;
            await ffi.gp_widget_set_value(
              widget,
              koffi.as([intValue], "int *"),
            );
            break;
          }

          // For menu or radio types: go through each choice to ensure the value is one of the options. If so, set it
          case WidgetType.Menu:
          case WidgetType.Radio: {
            if (typeof value !== "string") {
              throwOrWarn(
                `Must pass a string when setting ${name} with a menu or radio type`,
              );
              continue entriesLoop;
            }

            const choiceCount = await ffi.gp_widget_count_choices(widget);

            let wasSet = false;
            for (
              let choiceIndex = 0;
              choiceIndex < choiceCount;
              choiceIndex += 1
            ) {
              const choicePointer = makeArrayPointer();
              await ffi.gp_widget_get_choice(
                widget,
                choiceIndex,
                choicePointer,
              );
              const choice = choicePointer[0];

              if (choice === value) {
                await ffi.gp_widget_set_value(widget, value);
                wasSet = true;
                break;
              }
            }

            if (!wasSet) {
              throwOrWarn(
                `Unable to set config ${name} to invalid choice ${value}`,
              );
              continue entriesLoop;
            }
            break;
          }

          default:
            throwOrWarn(`Unable to change config ${name} with type ${type}`);
            continue entriesLoop;
        }
      }

      // Set the new config on the camera
      await ffi.gp_camera_set_config(camera, rootConfig, context);
    } finally {
      // Free the used memory and return
      await ffi.gp_widget_unref(rootConfig);
    }
  };

  /**
   * Waits for events on the given camera and returning the event
   */
  const waitForEventAsync = async (
    cameraInfo: CameraInfo,
    timeoutMilliseconds: number,
  ): Promise<CameraEvent> => {
    // Get the camera, throwing an error if it's not open
    const camera = _getOpenCamera(cameraInfo);

    // Wait for the event, capturing the event type and the data associated with it
    const eventTypePointer = makeArrayPointer();
    const eventDataPointer = makeArrayPointer();
    await ffi.gp_camera_wait_for_event(
      camera,
      timeoutMilliseconds,
      eventTypePointer,
      eventDataPointer,
      context,
    );
    const eventType = eventTypePointer[0] as CameraEventType;
    const eventData = eventDataPointer[0] as object;

    switch (eventType) {
      // For event types which include CameraFilePath's as data, we need to decode this and include it in the event
      case CameraEventType.FileAdded:
      case CameraEventType.FileChanged:
      case CameraEventType.FolderAdded: {
        const cameraFilePath = koffi.decode(
          eventData,
          "CameraFilePath",
        ) as CameraFilePath;
        return { type: eventType, path: cameraFilePath };
      }

      // Otherwise, we just return the event number
      default:
        return { type: eventType };
    }
  };

  /**
   * Get the file with the given camera path and put it at the target file path
   */
  const getFileAsync = async (
    cameraInfo: CameraInfo,
    cameraFilePath: CameraFilePath,
    targetFilePath: string,
  ): Promise<void> => {
    // Get the open camera, throwing an error if it's not open
    const camera = _getOpenCamera(cameraInfo);

    // Get the file description for the target file path to
    const fileMode =
      fs.constants.S_IWUSR |
      fs.constants.S_IRUSR |
      fs.constants.S_IRGRP |
      fs.constants.S_IROTH; // 644
    const fd = await ffi.open(
      targetFilePath,
      fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_WRONLY,
      fileMode,
    );

    // We need to set the file mode again as otherwise it gets set incorrectly when the file is opened
    await ffi.fchmod(fd, fileMode);

    // Get the file information
    const filePointer = makeArrayPointer();
    await ffi.gp_file_new_from_fd(filePointer, fd);
    const file = filePointer[0];
    await ffi.gp_camera_file_get(
      camera,
      cameraFilePath.folder,
      cameraFilePath.name,
      GP_FILE_TYPE_NORMAL,
      file,
      context,
    );

    // Close the file references
    await ffi.gp_file_free(file);

    // Delete the image on the camera
    await ffi.gp_camera_file_delete(
      camera,
      cameraFilePath.folder,
      cameraFilePath.name,
      context,
    );
  };

  // Return the methods and raw ffi
  return {
    ffi,
    listAsync,
    openAsync,
    closeAsync,
    summaryAsync,
    triggerCaptureAsync,
    triggerCapturePreviewAsync,
    getConfigAsync,
    getConfigWidgetsAsync,
    setConfigAsync,
    waitForEventAsync,
    getFileAsync,
  };
};

// Store a copy of the loaded library so it's a singleton
let loadedLib: (CameraModule & { ffi: ReturnType<typeof getFfi> }) | undefined;

/**
 * Load the library and return the interface and methods
 */
export const load = async () => {
  if (!loadedLib) {
    loadedLib = await loadInternal();
  }
  return loadedLib;
};

export * from "./types";
