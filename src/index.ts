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
} from "./types";

const GP_OK = 0;
const GP_ERROR_UNKNOWN_PORT = -5;

const GP_FILE_TYPE_NORMAL = 1;

/**
 * Load the library and return the interface and methods
 */
export const load = async (): Promise<
  CameraModule & { ffi: ReturnType<typeof getFfi> }
> => {
  // Get the library. This will fail if the shared library cannot be found
  const ffi = getFfi();

  // Create the gphoto context to use
  const context = await ffi.gp_context_new();

  // This will store the references to the open cameras so they can be used later
  const openCameraRefs = new Map<string, unknown>();

  // Gets the open camera or throws an error if not open
  const getOpenCamera = (cameraInfo: CameraInfo) => {
    // Get the open camera reference, throwing an error if not open
    const camera = openCameraRefs.get(cameraInfo.port);
    if (!camera) {
      throw new Error("Camera needs to be opened first");
    }

    return camera;
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
    return cameras;
  };

  /**
   * Opens a connection to a camera
   */
  const openAsync = async (cameraInfo: CameraInfo): Promise<void> => {
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
    await ffi.gp_camera_exit(camera, context);

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
    const camera = getOpenCamera(cameraInfo);

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
    const camera = getOpenCamera(cameraInfo);

    // Trigger a capture on the camera
    await ffi.gp_camera_trigger_capture(camera, context);
  };

  /**
   * Sets the config value for the given camera
   */
  const setConfigAsync = async (
    cameraInfo: CameraInfo,
    newConfig: { [key: string]: string },
  ): Promise<void> => {
    // Get the camera, throwing an error if the camera isn't open
    const camera = getOpenCamera(cameraInfo);

    // Get the root config
    const rootConfigPointer = makeArrayPointer();
    await ffi.gp_camera_get_config(camera, rootConfigPointer, context);
    const rootConfig = rootConfigPointer[0];

    // Split the new config into entires
    const entires = Object.entries(newConfig);

    // Go through each entry and set the value on the config
    for (const [name, value] of entires) {
      // Try getting by name
      const widgetPointer = makeArrayPointer();
      let getConfigRet = await ffi.gp_widget_get_child_by_name(
        rootConfig,
        name,
        widgetPointer,
      );

      // If that didn't work then try getting by label
      if (getConfigRet < GP_OK) {
        getConfigRet = await ffi.gp_widget_get_child_by_label(
          rootConfig,
          name,
          widgetPointer,
        );
      }

      // If we weren't able to get by either, then throw an error
      if (getConfigRet < GP_OK) {
        await ffi.gp_widget_free(rootConfig);
        throw new Error(`Unable to get config with name ${name}`);
      }
      const widget = widgetPointer[0];

      // Check if it is read only and return an error if it is
      const readOnlyPointer = makeArrayPointer();
      await ffi.gp_widget_get_readonly(widget, readOnlyPointer);
      const readOnly = readOnlyPointer[0];
      if (readOnly === 1) {
        throw new Error(
          `Unable to change the value of readonly config ${name}`,
        );
      }

      // Get the type of widget so we know what to do
      const typePointer = makeArrayPointer();
      await ffi.gp_widget_get_type(widget, typePointer);
      const type = typePointer[0] as WidgetType;

      switch (type) {
        // For text types: just set the value
        case WidgetType.Text:
          await ffi.gp_widget_set_value(widget, value);
          break;

        // For range types: parse as a float, check the range is correct, and then set it
        case WidgetType.Range: {
          const floatValue = parseFloat(value);
          if (Number.isNaN(floatValue)) {
            throw new Error(
              `Must pass a float string when setting ${name} with a range type. Got ${value}`,
            );
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
            throw new Error(
              `Must pass a float string between ${min} and ${max} when setting ${name} with a range type. Got ${value}`,
            );
          }

          await ffi.gp_widget_set_value(
            widget,
            koffi.as([floatValue], "float *"),
          );
          break;
        }

        // For toggle types: Check if we got a "true" string and set the number value based on that
        case WidgetType.Toggle: {
          const intValue = value === "true" ? 1 : 0;
          await ffi.gp_widget_set_value(widget, intValue);
          break;
        }

        // For menu or radio types: go through each choice to ensure the value is one of the options. If so, set it
        case WidgetType.Menu:
        case WidgetType.Radio: {
          const choiceCount = await ffi.gp_widget_count_choices(widget);

          let wasSet = false;
          for (
            let choiceIndex = 0;
            choiceIndex < choiceCount;
            choiceIndex += 1
          ) {
            const choicePointer = makeArrayPointer();
            await ffi.gp_widget_get_choice(widget, choiceIndex, choicePointer);
            const choice = choicePointer[0];

            if (choice === value) {
              await ffi.gp_widget_set_value(widget, value);
              wasSet = true;
              break;
            }
          }

          if (!wasSet) {
            throw new Error(
              `Unable to set config ${name} to invalid choice ${value}`,
            );
          }
          break;
        }

        default:
          throw new Error(`Unable to change config ${name} with type ${type}`);
      }
    }

    // Set the new config on the camera
    await ffi.gp_camera_set_config(camera, rootConfig, context);

    // // Free the used memory and return
    await ffi.gp_widget_free(rootConfig);
  };

  /**
   * Waits for events on the given camera and returning the event
   */
  const waitForEventAsync = async (
    cameraInfo: CameraInfo,
    timeoutMilliseconds: number,
  ): Promise<CameraEvent> => {
    // Get the camera, throwing an error if it's not open
    const camera = getOpenCamera(cameraInfo);

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
    const camera = getOpenCamera(cameraInfo);

    // Get the file description for the target file path
    const { fd } = await fs.promises.open(
      targetFilePath,
      fs.constants.O_CREAT | fs.constants.O_WRONLY,
      0o644,
    );

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
    // await ffi.fclose(fd);
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
    setConfigAsync,
    waitForEventAsync,
    getFileAsync,
  };
};
