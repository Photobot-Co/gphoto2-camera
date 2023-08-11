# GPhoto2 Camera for Node

This is a small wrapper around libgphoto2 which allows access to some of the methods in the library from NodeJS. It does not provide access to all of the methods in the library, just enough for our purposes.

Additionally it bundles dynamically linked versions of the libraries that it needs so nothing needs to be installed through the system package manager to use this library.

## Prebuilt versions

When a new version is released a prebuilt version of the library is uploaded to Github Releases. This is then downloaded when the library is installed from NPM so the machine using it doesn't need to have all the correct build tools installed and setup. It is also much quicker to just do this once.

## Building

To build the library you need to have installed:

- Standard C build tools
- automake
- autoconf
- wget
- NodeJS and Yarn

You can then install the JS dependencies with `yarn install` before running `yarn build`. This will download the vendored C libraries, compile them and create the dynamic libraries needed to run this library.

You can generate prebuilt packaged versions of the library to upload to Github Releases by running `yarn package`.
