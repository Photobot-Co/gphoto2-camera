"use strict";
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
var __spreadArray =
  (this && this.__spreadArray) ||
  function (to, from, pack) {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeArrayPointer = exports.getFfi = void 0;
var koffi_1 = require("koffi");
var definitions_1 = require("./definitions");
var functions_1 = require("./functions");
var POSSIBLE_LIBGPHOTO2_PATHS = [
  "libgphoto2.dylib",
  "/opt/homebrew/lib/libgphoto2.dylib",
  "/usr/local/lib/libgphoto2.dylib",
];
var ffi;
/**
 * Get the library, setting it up if needed
 */
var getFfi = function () {
  // Return the lib right away if we've setup before
  if (ffi) {
    return ffi;
  }
  // Load the shared libgphoto2 library
  var libgphoto2;
  for (
    var _i = 0, POSSIBLE_LIBGPHOTO2_PATHS_1 = POSSIBLE_LIBGPHOTO2_PATHS;
    _i < POSSIBLE_LIBGPHOTO2_PATHS_1.length;
    _i++
  ) {
    var libPath = POSSIBLE_LIBGPHOTO2_PATHS_1[_i];
    try {
      libgphoto2 = koffi_1.default.load(libPath);
      console.debug("Loaded library from ".concat(libPath));
      break;
    } catch (e) {
      console.debug(
        "Unable to load library from ".concat(libPath, ". Trying next..."),
      );
    }
  }
  // Throw an error if it couldn't be loaded
  if (!libgphoto2) {
    throw new Error("Unable to load libgphoto2. Make sure it is installed");
  }
  // Define the definitions first as they're used by the functions
  var definitions = (0, definitions_1.setupDefinitions)();
  // Setup the FFI functions that can be called
  var functions = (0, functions_1.setupFunctions)(libgphoto2);
  // Store and return everything
  ffi = __assign(__assign({}, definitions), functions);
  return ffi;
};
exports.getFfi = getFfi;
var makeArrayPointer = function (values) {
  if (values === void 0) {
    values = [];
  }
  return __spreadArray(__spreadArray([], values, true), [null], false);
};
exports.makeArrayPointer = makeArrayPointer;
