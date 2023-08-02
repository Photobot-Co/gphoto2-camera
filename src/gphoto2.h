#ifndef SRC_GPHOTO2_H_
#define SRC_GPHOTO2_H_

extern "C"
{
#include <gphoto2/gphoto2-camera.h>
}

#if !defined(O_BINARY)
/*To have portable binary open() on *nix and on Windows */
#define O_BINARY 0
#endif

/**
 * List the cameras connected to the computer
 */
int gphoto2_list(CameraList **cameraList, GPContext *context);

/**
 * Open a connection to the given camera
 */
int gphoto2_open(Camera **camera, const char *lookupModel, const char *portPath, GPContext *context);

/**
 * Get the config value of a widget with the given name
 */
int gphoto2_get_config(CameraWidget **rootConfig, CameraWidget **widget, const char *name, Camera *camera, GPContext *context);

/**
 * Set the config value of a widget with the given name
 */
int gphoto2_set_config(const char *name, const char *value, Camera *camera, GPContext *context);

/**
 * Flush the camera events for the given number of milliseconds
 */
int gphoto2_flush_events(const int32_t milliseconds, Camera *camera, GPContext *context);

/**
 * Wait for event with the given millisecond timeout
 */
int gphoto2_wait_for_event(CameraEventType *eventType, void **eventData, const int32_t timeoutMilliseconds, Camera *camera, GPContext *context);

/**
 * Get the camera file and save it to the local target file path
 */
int gphoto2_get_file(const char *cameraPathName, const char *cameraPathFolder, const char *targetFilePath, Camera *camera, GPContext *context);

#endif // SRC_GPHOTO2_H_
