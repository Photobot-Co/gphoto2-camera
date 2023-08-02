#include "gphoto2.h"
#include <fcntl.h>
#include <stdio.h>
#include <string>
#include <sys/time.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <unistd.h>

static GPPortInfoList *portInfoList = NULL;
static CameraAbilitiesList *abilities = NULL;
static const char *buffer;

/**
 * List the cameras connected to the computer
 */
int gphoto2_list(CameraList **cameraList, GPContext *context)
{
  int ret, i;
  CameraList *internalList = NULL;

  // List the connected cameras
  ret = gp_list_new(&internalList);
  if (ret < GP_OK)
  {
    gp_list_free(internalList);
    return ret;
  }
  ret = gp_camera_autodetect(internalList, context);
  if (ret < GP_OK)
  {
    gp_list_free(internalList);
    return ret;
  }

  // Filter out the "usb:" entry and add items to the array to return
  ret = gp_list_count(internalList);
  for (i = 0; i < ret; i++)
  {
    const char *name, *value;
    gp_list_get_name(internalList, i, &name);
    gp_list_get_value(internalList, i, &value);
    if (!strcmp("usb:", value))
      continue;
    gp_list_append(*cameraList, name, value);
  }

  // Return successfully
  gp_list_free(internalList);
  return GP_OK;
}

/**
 * Open a connection to the given camera
 */
int gphoto2_open(Camera **camera, const char *lookupModel, const char *portPath, GPContext *context)
{
  // Allocate the required variables
  int ret, model, portIndex;
  CameraAbilities ability;
  GPPortInfo portInfo;
  char *currentPortPath;

  // Check if we're already connected to the correct camera by checking if the camera is set and that the port path is the same
  if (*camera)
  {
    ret = gp_camera_get_port_info(*camera, &portInfo);
    if (ret >= GP_OK)
    {
      ret = gp_port_info_get_path(portInfo, &currentPortPath);
      if (ret >= GP_OK && strcmp(portPath, currentPortPath) == 0)
        // We are already connected, so return early
        return GP_OK;
    }
  }

  // Allocate the camera object
  ret = gp_camera_new(camera);
  if (ret < GP_OK)
    return ret;

  // Load all the camera drivers we have
  if (!abilities)
  {
    ret = gp_abilities_list_new(&abilities);
    if (ret < GP_OK)
      return ret;
    ret = gp_abilities_list_load(abilities, context);
    if (ret < GP_OK)
      return ret;
  }

  // First lookup the model / driver
  model = gp_abilities_list_lookup_model(abilities, lookupModel);
  if (model < GP_OK)
    return ret;
  ret = gp_abilities_list_get_abilities(abilities, model, &ability);
  if (ret < GP_OK)
    return ret;
  ret = gp_camera_set_abilities(*camera, ability);
  if (ret < GP_OK)
    return ret;

  // Load all the port drivers we have...
  if (!portInfoList)
  {
    ret = gp_port_info_list_new(&portInfoList);
    if (ret < GP_OK)
      return ret;
    ret = gp_port_info_list_load(portInfoList);
    if (ret < 0)
      return ret;
    ret = gp_port_info_list_count(portInfoList);
    if (ret < 0)
      return ret;
  }

  // Then associate the camera with the specified port
  portIndex = gp_port_info_list_lookup_path(portInfoList, portPath);
  if (portIndex < GP_OK || portIndex == GP_ERROR_UNKNOWN_PORT)
    return ret;

  ret = gp_port_info_list_get_info(portInfoList, portIndex, &portInfo);
  if (ret < GP_OK)
    return ret;
  ret = gp_camera_set_port_info(*camera, portInfo);
  if (ret < GP_OK)
    return ret;

  ret = gp_camera_init(*camera, context);
  if (ret < GP_OK)
    return ret;

  return GP_OK;
}

/**
 * Get the config value of a widget with the given name
 */
int gphoto2_get_config(CameraWidget **rootConfig, CameraWidget **widget, const char *name, Camera *camera, GPContext *context)
{
  int ret;

  // Get the root config
  ret = gp_camera_get_config(camera, rootConfig, context);
  if (ret < GP_OK)
    return ret;

  // Try getting by name
  ret = gp_widget_get_child_by_name(*rootConfig, name, widget);

  // If that didn't work, try getting by label
  if (ret < GP_OK)
    ret = gp_widget_get_child_by_label(*rootConfig, name, widget);

  // TODO: Split by / and get each part recursively to support full paths

  // Return and error if there is on
  if (ret < GP_OK)
    return ret;

  return GP_OK;
}

/**
 * Set the config value of a widget with the given name
 */
int gphoto2_set_config(const char *name, const char *value, Camera *camera, GPContext *context)
{
  CameraWidget *rootConfig, *widget;
  int ret, readOnly;
  CameraWidgetType type;

  // Get the config widget
  ret = gphoto2_get_config(&rootConfig, &widget, name, camera, context);
  if (ret < GP_OK)
    return ret;

  const char *foundName;
  ret = gp_widget_get_label(widget, &foundName);

  // Check if it is read only and return an error if it is
  ret = gp_widget_get_readonly(widget, &readOnly);
  if (ret < GP_OK)
    return ret;
  if (readOnly == 1)
    return GP_ERROR;

  // Get the type of widget so we know what to do
  ret = gp_widget_get_type(widget, &type);
  if (ret < GP_OK)
    return ret;

  switch (type)
  {
  // Just set the value for text types
  case GP_WIDGET_TEXT:
  {
    ret = gp_widget_set_value(widget, value);
    if (ret < GP_OK)
      return ret;
    break;
  }

  // For range types, check the range and then set it
  case GP_WIDGET_RANGE:
  {
    float floatValue, min, max, increment;
    ret = gp_widget_get_range(widget, &min, &max, &increment);
    if (ret < GP_OK)
      break;
    if (!sscanf(value, "%f", &floatValue))
      return GP_ERROR_BAD_PARAMETERS;
    if ((floatValue < min) || (floatValue > max))
      return GP_ERROR_BAD_PARAMETERS;
    ret = gp_widget_set_value(widget, &floatValue);
    if (ret < GP_OK)
      return ret;
    break;
  }

  // For toggle types, convert the incoming value to an integer and set it
  case GP_WIDGET_TOGGLE:
  {
    int toggle = (!strcasecmp(value, "true")) ? 1 : 0;
    ret = gp_widget_set_value(widget, &toggle);
    if (ret < GP_OK)
      return ret;
    break;
  }

  case GP_WIDGET_MENU:
  case GP_WIDGET_RADIO:
  {
    int count, i;

    count = gp_widget_count_choices(widget);
    if (count < GP_OK)
      return ret;

    for (i = 0; i < count; i++)
    {
      const char *choice;

      // Get each choice in the list and if the names match then we set it
      ret = gp_widget_get_choice(widget, i, &choice);
      if (ret >= GP_OK && !strcmp(choice, value))
      {
        ret = gp_widget_set_value(widget, value);
        if (ret >= GP_OK)
          break;
      }

      ret = GP_ERROR_BAD_PARAMETERS;
    }

    // If we did not set a value then return an error
    if (ret < GP_OK)
      return ret;
    break;
  }

  // TODO: Implement other types
  default:
    return GP_ERROR_NOT_SUPPORTED;
  }

  // Set the new config on the camera
  if (ret == GP_OK)
    ret = gp_camera_set_config(camera, rootConfig, context);

  // Free the used memory and return
  gp_widget_free(rootConfig);
  return ret;
}

/**
 * Flush the camera events for the given number of milliseconds
 */
int gphoto2_flush_events(const int32_t milliseconds, Camera *camera, GPContext *context)
{
  CameraEventType event;
  void *data = NULL;
  struct timeval startTime;

  // Get the time when we started flushing
  gettimeofday(&startTime, NULL);

  while (1)
  {
    struct timeval loopTime;
    int eventWaitTimeout, elapsedMilliseconds, ret;

    // Set to 1000ms by default. We might alter this down if there are less than this before our overall timeout
    eventWaitTimeout = 1000;

    // Get the time at the start of this loop
    gettimeofday(&loopTime, NULL);

    // Check if we've gone over the overall timeout and break if so
    elapsedMilliseconds = ((loopTime.tv_usec - startTime.tv_usec) + (loopTime.tv_sec - startTime.tv_sec) * 1000000) / 1000;
    if (elapsedMilliseconds >= milliseconds)
      break;

    // If we have less than the 1000ms default loop time then change it to that value so we wait for less time
    if ((milliseconds - elapsedMilliseconds) < eventWaitTimeout)
      eventWaitTimeout = milliseconds - elapsedMilliseconds;

    // Wait for the events, but do nothing with it
    ret = gp_camera_wait_for_event(camera, eventWaitTimeout, &event, &data, context);
    free(data);
    if (ret < GP_OK)
      return ret;
  }

  return GP_OK;
}

/**
 * Wait for event with the given millisecond timeout
 */
int gphoto2_wait_for_event(CameraEventType *eventType, void **eventData, const int32_t timeoutMilliseconds, Camera *camera, GPContext *context)
{
  return gp_camera_wait_for_event(camera, timeoutMilliseconds, eventType, eventData, context);
}

/**
 * Get the camera file and save it to the local target file path
 */
int gphoto2_get_file(const char *cameraPathName, const char *cameraPathFolder, const char *targetFilePath, Camera *camera, GPContext *context)
{
  int ret;
  unsigned long size;
  int fd;
  struct stat stbuf;
  CameraFile *file;

  ret = gp_file_new(&file);
  if (ret < GP_OK)
  {
    printf("Cannot new file\n");
    return ret;
  }
  ret = gp_camera_file_get(camera, cameraPathFolder, cameraPathName, GP_FILE_TYPE_NORMAL, file, context);
  if (ret < GP_OK)
  {
    printf("Cannot get file\n");
    gp_file_free(file);
    return ret;
  }

  /* buffer is returned as pointer, not as a copy */
  ret = gp_file_get_data_and_size(file, &buffer, &size);
  if (ret != GP_OK)
  {
    printf("Cannot get data and file size\n");
    gp_file_free(file);
    return ret;
  }
  if (-1 == stat(targetFilePath, &stbuf))
    fd = creat(targetFilePath, 0644);
  else
    fd = open(targetFilePath, O_RDWR | O_BINARY, 0644);
  if (fd == -1)
  {
    printf("Cannot open target file\n");
    gp_file_free(file);
    return GP_ERROR;
  }
  if (-1 == lseek(fd, 0, SEEK_SET))
    printf("Cannot lseek target file\n");
  if (-1 == write(fd, buffer, size))
    printf("Cannot write target file\n");
  close(fd);

  gp_file_free(file);
  gp_camera_file_delete(camera, cameraPathFolder, cameraPathName, context);

  return GP_OK;
}
