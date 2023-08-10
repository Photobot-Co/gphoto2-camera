#!/bin/bash

VERSION=$(node -e "console.log(require('./package.json').version);")
PLATFORM=$(node -e "console.log(require('os').platform());")
ARCH=$(node -e "console.log(require('os').arch());")

rm -rf package
mkdir -p package
find . -iname \*.node -o -iname \*.dylib -o -iname \*.so -o -iname \*.la  -o -iname \*.a | tar -cvzf "package/photobot-gphoto2-camera-$VERSION-$PLATFORM-$ARCH.tar.gz" -T -
