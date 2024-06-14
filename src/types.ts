export enum WidgetType {
  Window = 0,
  Section = 1,
  Text = 2,
  Range = 3,
  Toggle = 4,
  Radio = 5,
  Menu = 6,
  Button = 7,
  Date = 8,
}

export interface CameraInfo {
  name: string;
  port: string;
}

export interface CameraFilePath {
  name: string;
  folder: string;
}

export enum CameraEventType {
  Unknown = 0,
  Timeout = 1,
  FileAdded = 2,
  FolderAdded = 3,
  CaptureComplete = 4,
  FileChanged = 5,
}

export interface CameraEventUnknown {
  type: CameraEventType.Unknown;
}

export interface CameraEventTimeout {
  type: CameraEventType.Timeout;
}

export interface CameraEventFileAdded {
  type: CameraEventType.FileAdded;
  path: CameraFilePath;
}

export interface CameraEventFolderAdded {
  type: CameraEventType.FolderAdded;
  path: CameraFilePath;
}

export interface CameraEventCaptureComplete {
  type: CameraEventType.CaptureComplete;
}

export interface CameraEventFileChanged {
  type: CameraEventType.FileChanged;
  path: CameraFilePath;
}

export type CameraEvent =
  | CameraEventUnknown
  | CameraEventTimeout
  | CameraEventFileAdded
  | CameraEventFolderAdded
  | CameraEventCaptureComplete
  | CameraEventFileChanged;

export interface CameraModule {
  listAsync(): Promise<CameraInfo[]>;
  openAsync(camera: CameraInfo): Promise<void>;
  closeAsync(cameraInfo: CameraInfo): Promise<boolean>;
  summaryAsync(cameraInfo: CameraInfo): Promise<string>;
  triggerCaptureAsync(cameraInfo: CameraInfo): Promise<void>;
  getConfigAsync(
    cameraInfo: CameraInfo,
    options?: { ignoreReadOnly?: boolean },
  ): Promise<{ [key: string]: string | number }>;
  setConfigAsync(
    cameraInfo: CameraInfo,
    newConfig: { [key: string]: string | number },
    options?: { ignoreErrors?: boolean },
  ): Promise<void>;
  waitForEventAsync(
    cameraInfo: CameraInfo,
    timeoutMilliseconds: number,
  ): Promise<CameraEvent>;
  getFileAsync(
    cameraInfo: CameraInfo,
    cameraFilePath: CameraFilePath,
    targetFilePath: string,
  ): Promise<void>;
}
