#!/bin/bash
#
# Checks if the library file already exists. If it does it will exit successfull.
# Otherwise, it will exist with an error.

if [ -f "build/Release/camera.node" ]
then
  echo "Library already exists"
  exit 0
else
  echo "Library does not exist. Will need to download or build"
  exit 1
fi
