#include <gphoto2/gphoto2-camera.h>
#include <napi.h>

#include "gphoto2.h"

static GPContext *context = gp_context_new();
static Camera *camera = NULL;

/**
 * List the connected cameras and returns an array with the name and port of each one
 */
class ListWorker : public Napi::AsyncWorker
{
public:
  ListWorker(Napi::Env &env)
      : Napi::AsyncWorker(env),
        list(NULL),
        deferred(Napi::Promise::Deferred::New(env))
  {
  }

  ~ListWorker()
  {
    gp_list_free(this->list);
  }

  void Execute()
  {
    int ret;

    // List the connected cameras
    ret = gp_list_new(&this->list);
    if (ret < GP_OK)
      throw std::runtime_error("Unable to list cameras: Not able to create list");
    ret = gphoto2_list(&this->list, context);
    if (ret < GP_OK)
      throw std::runtime_error("Unable to list cameras: Not able to list");
  }

  void OnOK()
  {
    Napi::Env env = this->Env();
    int ret, i;
    Napi::Array cameraArray = Napi::Array::New(env);
    uint32_t cameraArrayIndex = 0;

    // Add all the items to the return array as objects
    ret = gp_list_count(this->list);
    for (i = 0; i < ret; i++)
    {
      const char *name, *value;
      gp_list_get_name(this->list, i, &name);
      gp_list_get_value(this->list, i, &value);
      Napi::Object cameraObject = Napi::Object::New(env);
      cameraObject.Set(Napi::String::New(env, "name"), name);
      cameraObject.Set(Napi::String::New(env, "port"), value);
      cameraArray[cameraArrayIndex++] = cameraObject;
    }

    // Return the array
    deferred.Resolve(cameraArray);
  }

  void OnError(Napi::Error const &error)
  {
    deferred.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred.Promise(); }

private:
  CameraList *list;
  Napi::Promise::Deferred deferred;
};
Napi::Value ListMethod(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  ListWorker *listWorker = new ListWorker(env);
  auto promise = listWorker->GetPromise();
  listWorker->Queue();
  return promise;
}

/**
 * Open a connection to the given camera port
 */
class OpenWorker : public Napi::AsyncWorker
{
public:
  OpenWorker(Napi::Env &env, std::string lookupModel, std::string portPath)
      : Napi::AsyncWorker(env),
        lookupModel(lookupModel),
        portPath(portPath),
        deferred(Napi::Promise::Deferred::New(env))
  {
  }

  void Execute()
  {
    int ret = gphoto2_open(&camera, this->lookupModel.c_str(), this->portPath.c_str(), context);
    if (ret < GP_OK)
      throw std::runtime_error("Unable to open camera");
  }

  void OnOK()
  {
    deferred.Resolve(this->Env().Undefined());
  }

  void OnError(Napi::Error const &error)
  {
    deferred.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred.Promise(); }

private:
  std::string lookupModel;
  std::string portPath;
  Napi::Promise::Deferred deferred;
};
Napi::Value OpenMethod(const Napi::CallbackInfo &info)
{
  // Get the arguments
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsObject())
  {
    throw Napi::TypeError::New(env, "Should be passed a DetectedCamera object");
  }
  Napi::Object detectedCamera = info[0].As<Napi::Object>();
  std::string lookupModel = detectedCamera.Get("name").As<Napi::String>().Utf8Value();
  std::string portPath = detectedCamera.Get("port").As<Napi::String>().Utf8Value();

  // Start the async worker
  OpenWorker *openWorker = new OpenWorker(env, lookupModel, portPath);
  auto promise = openWorker->GetPromise();
  openWorker->Queue();
  return promise;
}

/**
 * Close the currently opened camera
 */
class CloseWorker : public Napi::AsyncWorker
{
public:
  CloseWorker(Napi::Env &env)
      : Napi::AsyncWorker(env),
        didClose(false),
        deferred(Napi::Promise::Deferred::New(env))
  {
  }

  void Execute()
  {
    if (camera)
    {
      gp_camera_exit(camera, context);
      camera = NULL;
      this->didClose = true;
    }
  }

  void OnOK()
  {
    deferred.Resolve(Napi::Boolean::New(this->Env(), this->didClose));
  }

  void OnError(Napi::Error const &error)
  {
    deferred.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred.Promise(); }

private:
  bool didClose;
  Napi::Promise::Deferred deferred;
};
Napi::Value CloseMethod(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  CloseWorker *closeWorker = new CloseWorker(env);
  auto promise = closeWorker->GetPromise();
  closeWorker->Queue();
  return promise;
}

/**
 * Trigger a capture on the currently opened camera
 */
class SummaryWorker : public Napi::AsyncWorker
{
public:
  SummaryWorker(Napi::Env &env)
      : Napi::AsyncWorker(env),
        deferred(Napi::Promise::Deferred::New(env))
  {
  }

  void Execute()
  {
    // First check if we have a camera open
    if (!camera)
      throw std::runtime_error("Unable to get summary: Camera needs to be opened first");

    // Trigger the capture
    int ret = gp_camera_get_summary(camera, &this->summary, context);
    if (ret < GP_OK)
      throw std::runtime_error("Unable to get summary: Error was returned");
  }

  void OnOK()
  {
    deferred.Resolve(Napi::String::New(this->Env(), summary.text));
  }

  void OnError(Napi::Error const &error)
  {
    deferred.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred.Promise(); }

private:
  CameraText summary;
  Napi::Promise::Deferred deferred;
};
Napi::Value SummaryMethod(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  SummaryWorker *summaryWorker = new SummaryWorker(env);
  auto promise = summaryWorker->GetPromise();
  summaryWorker->Queue();
  return promise;
}

/**
 * Trigger a capture on the currently opened camera
 */
class TriggerCaptureWorker : public Napi::AsyncWorker
{
public:
  TriggerCaptureWorker(Napi::Env &env)
      : Napi::AsyncWorker(env),
        deferred(Napi::Promise::Deferred::New(env))
  {
  }

  void Execute()
  {
    // First check if we have a camera open
    if (!camera)
      throw std::runtime_error("Unable to trigger capture: Camera needs to be opened first");

    // Trigger the capture
    gp_camera_trigger_capture(camera, context);
  }

  void OnOK()
  {
    deferred.Resolve(this->Env().Undefined());
  }

  void OnError(Napi::Error const &error)
  {
    deferred.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred.Promise(); }

private:
  Napi::Promise::Deferred deferred;
};
Napi::Value TriggerCaptureMethod(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();
  TriggerCaptureWorker *triggerCaptureWorker = new TriggerCaptureWorker(env);
  auto promise = triggerCaptureWorker->GetPromise();
  triggerCaptureWorker->Queue();
  return promise;
}

/**
 * Set a config value on the open camera
 */
class SetConfigWorker : public Napi::AsyncWorker
{
public:
  SetConfigWorker(Napi::Env &env, std::string name, std::string value)
      : Napi::AsyncWorker(env),
        name(name),
        value(value),
        deferred(Napi::Promise::Deferred::New(env))
  {
  }

  void Execute()
  {
    // First check if we have a camera open
    if (!camera)
      throw std::runtime_error("Unable to set config: Camera needs to be opened first");

    // Set the config
    int ret = gphoto2_set_config(this->name.c_str(), this->value.c_str(), camera, context);
    if (ret < GP_OK)
      throw std::runtime_error("Unable to set config: An error was returned when setting");
  }

  void OnOK()
  {
    deferred.Resolve(this->Env().Undefined());
  }

  void OnError(Napi::Error const &error)
  {
    deferred.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred.Promise(); }

private:
  std::string name;
  std::string value;
  Napi::Promise::Deferred deferred;
};
Napi::Value SetConfigMethod(const Napi::CallbackInfo &info)
{
  // Get the arguments
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString())
  {
    throw Napi::TypeError::New(env, "Should be passed a name and value for the config to set on the opened camera");
  }
  std::string name = info[0].As<Napi::String>().Utf8Value();
  std::string value = info[1].As<Napi::String>().Utf8Value();

  // Start the async worker
  SetConfigWorker *setConfigWorker = new SetConfigWorker(env, name, value);
  auto promise = setConfigWorker->GetPromise();
  setConfigWorker->Queue();
  return promise;
}

/**
 * Flush the events in the connected camera for the given amount of time
 */
class FlushEventsWorker : public Napi::AsyncWorker
{
public:
  FlushEventsWorker(Napi::Env &env, const int32_t milliseconds)
      : Napi::AsyncWorker(env),
        milliseconds(milliseconds),
        deferred(Napi::Promise::Deferred::New(env))
  {
  }

  void Execute()
  {
    // First check if we have a camera open
    if (!camera)
      throw std::runtime_error("Unable to flush events: Camera needs to be opened first");

    // Flush events
    int ret = gphoto2_flush_events(this->milliseconds, camera, context);
    if (ret < GP_OK)
      throw std::runtime_error("Unable to flush events");
  }

  void OnOK()
  {
    deferred.Resolve(this->Env().Undefined());
  }

  void OnError(Napi::Error const &error)
  {
    deferred.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred.Promise(); }

private:
  const int32_t milliseconds;
  Napi::Promise::Deferred deferred;
};
Napi::Value FlushEventsMethod(const Napi::CallbackInfo &info)
{
  // Get the arguments
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsNumber())
  {
    throw Napi::TypeError::New(env, "Should be passed a number of milliseconds to flush for");
  }
  const int32_t milliseconds = info[0].As<Napi::Number>().Int32Value();

  // Start the async worker
  FlushEventsWorker *flushEventsWorker = new FlushEventsWorker(env, milliseconds);
  auto promise = flushEventsWorker->GetPromise();
  flushEventsWorker->Queue();
  return promise;
}

/**
 * Wait for an event from the camera, with a given timeout
 */
class WaitForEventWorker : public Napi::AsyncWorker
{
public:
  WaitForEventWorker(Napi::Env &env, const int32_t timeoutMilliseconds)
      : Napi::AsyncWorker(env),
        timeoutMilliseconds(timeoutMilliseconds),
        eventType(GP_EVENT_UNKNOWN),
        eventData(NULL),
        deferred(Napi::Promise::Deferred::New(env))
  {
  }

  ~WaitForEventWorker()
  {
    free(this->eventData);
  }

  void Execute()
  {
    // First check if we have a camera open
    if (!camera)
      throw std::runtime_error("Unable to wait for events: Camera needs to be opened first");

    // Wait for an event
    int ret = gphoto2_wait_for_event(&this->eventType, &this->eventData, this->timeoutMilliseconds, camera, context);
    if (ret < GP_OK)
      throw std::runtime_error("Unable to wait for events");
  }

  void OnOK()
  {
    Napi::Env env = this->Env();

    Napi::Object eventObject = Napi::Object::New(env);
    eventObject.Set(Napi::String::New(env, "type"), (int)this->eventType);

    if (this->eventType == GP_EVENT_FILE_ADDED || this->eventType == GP_EVENT_FOLDER_ADDED || this->eventType == GP_EVENT_FILE_CHANGED)
    {
      CameraFilePath *filePath = (CameraFilePath *)this->eventData;

      Napi::Object pathObject = Napi::Object::New(env);
      pathObject.Set(Napi::String::New(env, "name"), filePath->name);
      pathObject.Set(Napi::String::New(env, "folder"), filePath->folder);

      eventObject.Set(Napi::String::New(env, "path"), pathObject);
    }

    deferred.Resolve(eventObject);
  }

  void OnError(Napi::Error const &error)
  {
    deferred.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred.Promise(); }

private:
  const int32_t timeoutMilliseconds;
  CameraEventType eventType;
  void *eventData;
  Napi::Promise::Deferred deferred;
};
Napi::Value WaitForEventMethod(const Napi::CallbackInfo &info)
{
  // Get the arguments
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsNumber())
  {
    throw Napi::TypeError::New(env, "Should be passed a number of milliseconds to wait for");
  }
  const int32_t timeoutMilliseconds = info[0].As<Napi::Number>().Int32Value();

  // Start the async worker
  WaitForEventWorker *waitForEventWorker = new WaitForEventWorker(env, timeoutMilliseconds);
  auto promise = waitForEventWorker->GetPromise();
  waitForEventWorker->Queue();
  return promise;
}

/**
 * Get a file with the given camera path and save it to a local file
 */
class GetFileWorker : public Napi::AsyncWorker
{
public:
  GetFileWorker(Napi::Env &env, std::string cameraPathName, std::string cameraPathFolder, std::string targetFilePath)
      : Napi::AsyncWorker(env),
        cameraPathName(cameraPathName),
        cameraPathFolder(cameraPathFolder),
        targetFilePath(targetFilePath),
        deferred(Napi::Promise::Deferred::New(env))
  {
  }

  void Execute()
  {
    // First check if we have a camera open
    if (!camera)
      throw std::runtime_error("Unable to get file: Camera needs to be opened first");

    // Get the file
    int ret = gphoto2_get_file(this->cameraPathName.c_str(), this->cameraPathFolder.c_str(), this->targetFilePath.c_str(), camera, context);
    if (ret < GP_OK)
      throw std::runtime_error("Unable to get file");
  }

  void OnOK()
  {
    deferred.Resolve(this->Env().Undefined());
  }

  void OnError(Napi::Error const &error)
  {
    deferred.Reject(error.Value());
  }

  Napi::Promise GetPromise() { return deferred.Promise(); }

private:
  std::string cameraPathName;
  std::string cameraPathFolder;
  std::string targetFilePath;
  Napi::Promise::Deferred deferred;
};
Napi::Value GetFileMethod(const Napi::CallbackInfo &info)
{
  // Get the arguments
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsObject() || !info[1].IsString())
  {
    throw Napi::TypeError::New(env, "Should be passed a camera path and a target file path");
  }
  Napi::Object cameraPath = info[0].As<Napi::Object>();
  if (!cameraPath.Get("name").IsString() || !cameraPath.Get("folder").IsString())
  {
    throw Napi::TypeError::New(env, "Should be passed a camera path and a target file path");
  }
  std::string cameraPathName = cameraPath.Get("name").As<Napi::String>().Utf8Value();
  std::string cameraPathFolder = cameraPath.Get("folder").As<Napi::String>().Utf8Value();
  std::string targetFilePath = info[1].As<Napi::String>().Utf8Value();

  // Start the async worker
  GetFileWorker *getFileWorker = new GetFileWorker(env, cameraPathName, cameraPathFolder, targetFilePath);
  auto promise = getFileWorker->GetPromise();
  getFileWorker->Queue();
  return promise;
}

/**
 * Create the bindings for the module methods
 */
Napi::Object Init(Napi::Env env, Napi::Object exports)
{
  exports.Set(Napi::String::New(env, "listAsync"), Napi::Function::New(env, ListMethod));
  exports.Set(Napi::String::New(env, "openAsync"), Napi::Function::New(env, OpenMethod));
  exports.Set(Napi::String::New(env, "closeAsync"), Napi::Function::New(env, CloseMethod));
  exports.Set(Napi::String::New(env, "summaryAsync"), Napi::Function::New(env, SummaryMethod));
  exports.Set(Napi::String::New(env, "triggerCaptureAsync"), Napi::Function::New(env, TriggerCaptureMethod));
  exports.Set(Napi::String::New(env, "setConfigAsync"), Napi::Function::New(env, SetConfigMethod));
  exports.Set(Napi::String::New(env, "flushEventsAsync"), Napi::Function::New(env, FlushEventsMethod));
  exports.Set(Napi::String::New(env, "waitForEventAsync"), Napi::Function::New(env, WaitForEventMethod));
  exports.Set(Napi::String::New(env, "getFileAsync"), Napi::Function::New(env, GetFileMethod));
  return exports;
}

NODE_API_MODULE(gphoto2, Init)
