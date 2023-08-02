export interface DetectedCamera {
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

export interface CameraEventFolderChanged {
  type: CameraEventType.FolderChanged;
  path: CameraFilePath;
}

export type CameraEvent =
  | CameraEventUnknown
  | CameraEventTimeout
  | CameraEventFileAdded
  | CameraEventFolderAdded
  | CameraEventCaptureComplete;

declare const camera: {
  listAsync(): Promise<DetectedCamera[]>;
  openAsync(camera: DetectedCamera): Promise<void>;
  closeAsync(): Promise<boolean>;
  summaryAsync(): Promise<string>;
  triggerCaptureAsync(): Promise<void>;
  setConfigAsync(name: string, value: string): Promise<void>;
  flushEventsAsync(milliseconds: number): Promise<number>;
  waitForEventAsync(timeoutMilliseconds: number): Promise<CameraEvent>;
  getFileAsync(
    cameraFilePath: CameraFilePath,
    targetFilePath: string,
  ): Promise<CameraEvent>;

  CameraEventType: CameraEventType;
};

export default camera;
