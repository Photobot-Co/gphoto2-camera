#!/bin/bash
#
# buildVendorLibs.sh
#
# Based on the build script from GPhoto2.framework
# https://github.com/lnxbil/GPhoto2.framework
# 
# Copyright (C) 2011-2020 Andreas Steinel
# 
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#

# On fishy behaviour, please uncomment this line
set -ex

# Configuration
DOWNLOAD="$(pwd)/vendor/download"
PREFIX="$(pwd)/vendor/build"

# Library version to use
LIBTOOL=2.4.6
LIBUSB=1.0.26
LIBUSBC=0.1.8
LIBJPEG=3.0.0
LIBGPHOTO=2_5_30

###############################################################################
# Variables
###############################################################################

# Compiler flags
export MACOSX_DEPLOYMENT_TARGET=11.0
export CFLAGS="-I${PREFIX}/include -mmacosx-version-min=11.0"
export CPPFLAGS="-I${PREFIX}/include"
export PKG_CONFIG_PATH=${PREFIX}/lib/pkgconfig
export PATH=${PREFIX}/bin:/usr/local/bin/:/usr/bin:/bin:/usr/sbin:/sbin:${PATH}
export LD_LIBRARY_PATH=${PREFIX}/lib
export LDFLAGS="-L${PREFIX}/lib"

export CC="gcc"
export CXX="g++"
export CPP=/usr/bin/cpp
export CXXCPP=/usr/bin/cpp
export CFLAGS="$CFLAGS -pipe"
export CXXFLAGS="$CXXFLAGS -pipe"

if [ -n "${ARCH:x}" ]
then
    export OTHER_CFLAGS+=" -arch $ARCH"
    export LDFLAGS+=" -arch $ARCH"
    export CC+=" -arch $ARCH"
    export CXX+=" -arch $ARCH"

    if [ "$ARCH" = "arm64" ]; then
        HOST="aarch64-apple-darwin"
    else
        HOST="$ARCH-apple-darwin"
    fi
fi


# other flags
export LANG=C
DCORES=$(( $(sysctl -n hw.ncpu) * 2 ))

###############################################################################
# Functions
###############################################################################

function download_files()
{
    (
        echo "+ Download and extracting files"

        mkdir -p "$DOWNLOAD"
        cd "$DOWNLOAD" || exit

        # build download list
        cat <<EOF > download.list
http://ftpmirror.gnu.org/libtool/libtool-${LIBTOOL}.tar.gz
https://github.com/libusb/libusb/releases/download/v${LIBUSB}/libusb-${LIBUSB}.tar.bz2
https://github.com/libusb/libusb-compat-0.1/archive/v${LIBUSBC}.tar.gz
https://github.com/libjpeg-turbo/libjpeg-turbo/archive/${LIBJPEG}.tar.gz
https://github.com/gphoto/libgphoto2/archive/libgphoto2-${LIBGPHOTO}-release.tar.gz
EOF

        # Downloading required files as compressed tar archives
        wget --timeout 5 --tries 2 -c -i download.list

        # get downloaded file list
        GZFILES=$(ls -1 ./*.tar.gz)
        BZFILES=$(ls -1 ./*.tar.bz2)

        # uncompress each file
        for i in $GZFILES; do tar -zxf "$i"; done
        for i in $BZFILES; do tar -jxf "$i"; done
    )
}


function check_wget()
{
    if ! which wget >/dev/null 2>&1
    then
        echo "Please get 'wget' as downloader"
        exit 1
    fi
}

function compile_me_real()
{
    (
        CONFIGURE="./configure --prefix=$PREFIX --enable-shared --disable-iconv --disable-nls"
        if [ -n "${HOST:x}" ]
        then
            CONFIGURE+=" --host $HOST"
        fi

        cd "$1" || exit
        echo "--------------------------------------------------------------------------------"
        echo "Starting to build $1"
        echo "--------------------------------------------------------------------------------"
        echo "- Cleaning"
        make -s clean || true

        echo "- Configuring"
        if ! [ -f "configure" ]
        then
            echo "Running autoreconf"
            autoreconf -fiv
        fi
        echo "Running '$CONFIGURE'"
        $CONFIGURE
        [ $? -gt 0 ] && return 1
        
        echo "- Building"
        make -s -j${DCORES} all
        [ $? -gt 0 ] && return 1

        echo "- Installing"
        make install -s
        [ $? -gt 0 ] && return 1

        make install-lib -s || true
        make install-headers -s || true

        echo "- Finishing"
    )
}

function compile_me()
{
    echo "  - Building $1"
    compile_me_real "$1"
    if [ $? -gt 0 ]
    then
        cd ..
        echo ""
        echo "An error occured"
        echo ""
        exit 1
    fi
}

function compile_cmake_me_real()
{
    (
        cd "$1" || exit
        echo "--------------------------------------------------------------------------------"
        echo "Starting to build $1"
        echo "--------------------------------------------------------------------------------"

        echo "Generating Makefiles"
        CMAKE_OSX_ARCHITECTURES=$ARCH cmake -G"Unix Makefiles" --install-prefix="$PREFIX" .
        [ $? -gt 0 ] && return 1
        
        echo "- Building"
        make
        [ $? -gt 0 ] && return 1

        echo "- Installing"
        make install -s
        [ $? -gt 0 ] && return 1

        make install-lib -s || true
        make install-headers -s || true

        echo "- Finishing"
    )
}

function compile_cmake_me()
{
    echo "  - Building $1"
    compile_cmake_me_real "$1"
    if [ $? -gt 0 ]
    then
        cd ..
        echo ""
        echo "An error occured"
        echo ""
        exit 1
    fi
}

function build()
{
    (
        # Cleaning up
        rm -rf "${PREFIX:?}/*"

        # switch to work directory
        cd "$DOWNLOAD" || exit 

        echo "+ Start building at $(date) with ${DCORES} threads"

        compile_me "libtool-${LIBTOOL}"
        compile_me "libusb-${LIBUSB}"
        compile_me "libusb-compat-0.1-${LIBUSBC}"
        compile_cmake_me "libjpeg-turbo-${LIBJPEG}"
        compile_me "libgphoto2-libgphoto2-${LIBGPHOTO}-release"

        echo "+ Finished building at $(date)"
    )
}

function cleanup_build()
{
    echo "+ Cleaning up build and download directory"

    # Cleaning up unneccessary files
    rm -rf "${PREFIX}/{share,man,bin:?}" \
           "${PREFIX}/lib/cmake" \
           "${PREFIX}/lib/pkgconfig" \
           "${PREFIX}/lib/udev" \
           "${PREFIX}/lib/libgphoto2/print-camera-list"
    rm -rf "$DOWNLOAD"
}

function modify_install_name()
{
    echo "+ Modifying the install name for the dylibs"
    ./scripts/installNamePrefixTool.sh "${PREFIX}/lib" "${PREFIX}/lib" "@loader_path"
}

function main()
{
    echo "Build process for the dependencies of the the library"
    echo "Based on https://github.com/lnxbil/GPhoto2.framework"
    echo ""

    check_wget
    download_files
    build
    cleanup_build
    modify_install_name
}


###############################################################################
# Main
###############################################################################

# Running main
main