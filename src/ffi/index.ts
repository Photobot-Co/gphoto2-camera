import koffi from "koffi";
import { setupDefinitions } from "./definitions";
import { setupFunctions } from "./functions";

const POSSIBLE_LIBGPHOTO2_PATHS = [
  "libgphoto2.dylib",
  "/opt/homebrew/lib/libgphoto2.dylib",
  "/usr/local/lib/libgphoto2.dylib",
];

let ffi:
  | (ReturnType<typeof setupDefinitions> & ReturnType<typeof setupFunctions>)
  | undefined;

/**
 * Get the library, setting it up if needed
 */
export const getFfi = () => {
  // Return the lib right away if we've setup before
  if (ffi) {
    return ffi;
  }

  // Load the shared libgphoto2 library
  let libgphoto2: koffi.IKoffiLib | undefined;
  for (const libPath of POSSIBLE_LIBGPHOTO2_PATHS) {
    try {
      libgphoto2 = koffi.load(libPath);
      console.debug(`Loaded library from ${libPath}`);
      break;
    } catch (e) {
      console.debug(`Unable to load library from ${libPath}. Trying next...`);
    }
  }

  // Throw an error if it couldn't be loaded
  if (!libgphoto2) {
    throw new Error("Unable to load libgphoto2. Make sure it is installed");
  }

  // Define the definitions first as they're used by the functions
  const definitions = setupDefinitions();

  // Setup the FFI functions that can be called
  const functions = setupFunctions(libgphoto2);

  // Store and return everything
  ffi = { ...definitions, ...functions };
  return ffi;
};

export const makeArrayPointer = (
  values: unknown[] = [],
): (unknown | null)[] => [...values, null];
