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
  triggerCapturePreviewAsync(
    cameraInfo: CameraInfo,
  ): Promise<{ data: Uint8Array; size: number; mimeType: string }>;
  getConfigAsync(
    cameraInfo: CameraInfo,
    options?: {
      /**
       * Supply a function to filter which config items will be returned. Return true to include the item, false to exclude it.
       */
      filter?: (name: string, type: WidgetType) => boolean;
      /**
       * Set to true to only include config which which are not read only
       */
      ignoreReadOnly?: boolean;
    },
  ): Promise<{ [key: string]: string | number | boolean }>;
  getConfigWidgetsAsync(
    cameraInfo: CameraInfo,
    options?: {
      /**
       * Supply a function to filter which config items will be returned. Return true to include the item, false to exclude it.
       */
      filter?: (name: string, type: WidgetType) => boolean;
      /**
       * Set to true to only include config which which are not read only
       */
      ignoreReadOnly?: boolean;
    },
  ): Promise<{ [key: string]: ConfigWidget }>;
  setConfigAsync(
    cameraInfo: CameraInfo,
    newConfig: { [key: string]: string | number | boolean },
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

export interface TextConfigWidget {
  type: WidgetType.Text;
  label: string;
  value: string;
}

export interface RangeConfigWidget {
  type: WidgetType.Range;
  label: string;
  value: number;
  min: number;
  max: number;
  increment: number;
}

export interface ToggleConfigWidget {
  type: WidgetType.Toggle;
  label: string;
  value: boolean;
}

export interface ChoiceConfigWidget {
  type: WidgetType.Radio | WidgetType.Menu;
  label: string;
  value: string;
  choices: string[];
}

export type ConfigWidget =
  | TextConfigWidget
  | RangeConfigWidget
  | ToggleConfigWidget
  | ChoiceConfigWidget;
