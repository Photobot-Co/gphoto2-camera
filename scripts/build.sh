#!/bin/bash
set -e

./scripts/buildVendorLibs.sh

if [ -n "${ARCH:x}" ]
then
    GYP_ARGS="--arch $ARCH"
fi
node-gyp rebuild $GYP_ARGS
install_name_tool -change libgphoto2.6.dylib @rpath/libgphoto2.6.dylib build/Release/camera.node