import koffi from "koffi";
import { setupDefinitions } from "./definitions";
import { setupFunctions } from "./functions";
import { GphotoLoadOptions } from "../types";

let ffi:
  | (ReturnType<typeof setupDefinitions> &
      ReturnType<typeof setupFunctions> & { koffi: typeof koffi })
  | undefined;

/**
 * Get the library, setting it up if needed
 */
export const getFfi = (options: Required<GphotoLoadOptions>) => {
  // Return the lib right away if we've setup before
  if (ffi) {
    return ffi;
  }

  const { libgphoto2Paths, libcPaths } = options;

  // Load the shared libgphoto2 library
  let libgphoto2: koffi.IKoffiLib | undefined;
  for (const libPath of libgphoto2Paths) {
    try {
      libgphoto2 = koffi.load(libPath);
      console.debug(`Loaded library from ${libPath}`);
      break;
    } catch (_e) {
      console.debug(
        `Unable to load libgphoto2 from ${libPath}. Trying next...`,
      );
    }
  }
  // Throw an error if it couldn't be loaded
  if (!libgphoto2) {
    throw new Error("Unable to load libgphoto2. Make sure it is installed");
  }

  // Load the shared libc library
  let libc: koffi.IKoffiLib | undefined;
  for (const libPath of libcPaths) {
    try {
      libc = koffi.load(libPath);
      console.debug(`Loaded library from ${libPath}`);
      break;
    } catch (_e) {
      console.debug(`Unable to load libc from ${libPath}. Trying next...`);
    }
  }
  // Throw an error if it couldn't be loaded
  if (!libc) {
    throw new Error("Unable to load libc. Make sure it is installed");
  }

  // Define the definitions first as they're used by the functions
  const definitions = setupDefinitions();

  // Setup the FFI functions that can be called
  const functions = setupFunctions(libgphoto2, libc);

  // Store and return everything
  ffi = { ...definitions, ...functions, koffi };
  return ffi;
};

export const makeArrayPointer = (
  values: unknown[] = [],
): (unknown | null)[] => [...values, null];
