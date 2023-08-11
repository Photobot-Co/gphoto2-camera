#!/bin/bash
#
# Downloads a prebuilt version of the library from Github releases and extracts it

set -e

if [ -n "${SKIP_PREBUILT+x}" ]
then
  echo "Skipping downloading prebuilt"
  exit 1
fi

VERSION=$(node -e "console.log(require('./package.json').version);")
PLATFORM=$(node -e "console.log(require('os').platform());")
if [ -z "${ARCH:x}" ]
then
    ARCH=$(node -e "console.log(require('os').arch());")
fi
echo "Downloading prebuilt library for $VERSION on $PLATFORM $ARCH..."

DOWNLOAD_URL="https://github.com/Photobot-Co/gphoto2-camera/releases/download/v$VERSION/photobot-gphoto2-camera-$VERSION-$PLATFORM-$ARCH.tar.gz"
echo "Downloading prebuilt library from $DOWNLOAD_URL..."
mkdir -p package
rm -f package/prebuilt.tar.bz
curl --fail -L "$DOWNLOAD_URL" -o package/prebuilt.tar.bz
echo "Download complete"

echo "Unpacking..."
tar -xvzf package/prebuilt.tar.bz
rm package/prebuilt.tar.bz
echo "Unpacked"

echo "Checking if that worked"
./scripts/checkAvailable.sh || exit 1
