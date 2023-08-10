{
  "targets": [
    {
      "target_name": "camera",
      "sources": ["src/camera.cc", "src/gphoto2.cc"],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include_dir\")",
        "<!(pwd)/vendor/build/include",
        "<!(pwd)/vendor/build/include/gphoto2"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "libraries": [
        '-L<!(pwd)/vendor/build/lib',
        '-lgphoto2'
      ],
      "conditions": [
        ['OS=="mac"',
          {
            "cflags!": ["-Wno-deprecated-declarations"],
            "cflags_cc!": ["-Wno-deprecated-declarations"],
            "cflags+": ["-fvisibility=hidden"],
            "xcode_settings": {
              "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
              "OTHER_CPLUSPLUSFLAGS" : [
                "-std=c++11",
                "-stdlib=libc++"
              ],
              "MACOSX_DEPLOYMENT_TARGET": "10.15",
              "GCC_SYMBOLS_PRIVATE_EXTERN": "YES"
            }
          }
        ]
      ],
    }
  ]
}
