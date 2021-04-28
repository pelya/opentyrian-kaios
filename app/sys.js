// Used from C code
var sys_fs_init_is_done = 0;
var sys_fs_sync_is_done = 1;
var sys_screen_wake_lock = null;
var sys_device_ram_size_mb = 0;
// Copy WAD file from SD card into emscripten idb filesystem, this is used by Freedoom
var sys_open_wad_file_name = null;
var sys_open_wad_file_blob = null;
var sys_open_wad_file_buffer = null;
var sys_open_wad_file_reader = null;
// Debug text window
var sys_debug = 0;
// KaiAds integration
var sys_preloaded_advertisement = false;


window.onerror = function (errorMsg) {
  alert("Error occured: " + errorMsg);
  return false;
}
window.addEventListener('unhandledrejection', function (errorMsg) {
  alert("Error occurred: " + errorMsg.reason.message);
});

if (sys_debug) {
  document.getElementById('canvas').style.height = "65%";
} else {
  document.getElementById('output').hidden = true;
  document.getElementById('output').style.display = "none";
}

var Module = {
  preRun: [],
  postRun: [],

  print: (function() {
    const outputElement = document.getElementById('output');
    if (outputElement) outputElement.value = ''; // clear browser cache
    return function(text) {
      if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
      console.log(text);
      if (outputElement && !outputElement.hidden) {
        outputElement.value = text + '\n' + outputElement.value;
      }
    };
  })(),

  printErr: function(text) {
    if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
    console.error(text);
    Module.print(text);
  },

  canvas: (function() {
    var canvas = document.getElementById('canvas');

    // As a default initial behavior, pop up an alert when webgl context is lost. To make your
    // application robust, you may want to override this behavior before shipping!
    // See http://www.khronos.org/registry/webgl/specs/latest/1.0/#5.15.2
    canvas.addEventListener("webglcontextlost", function(e) { alert('WebGL context lost. You will need to reload the page.'); e.preventDefault(); }, false);

    return canvas;
  })(),

  setStatus: function(text) {
    if (!Module.setStatus.last) Module.setStatus.last = { time: Date.now(), text: '' };
    if (text === Module.setStatus.last.text) return;
    var m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
    var now = Date.now();
    if (m && now - Module.setStatus.last.time < 30) return; // if this is a progress update, skip it if too soon
    Module.setStatus.last.time = now;
    Module.setStatus.last.text = text;
    if (m) {
      text = m[1];
    }
  },

  totalDependencies: 0,

  monitorRunDependencies: function(left) {
    this.totalDependencies = Math.max(this.totalDependencies, left);
    Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
  }
};

Module.setStatus('Downloading...');

window.onerror = function(message) {
  console.error(message);
  Module.print(message);
  Module.setStatus('Exception thrown, see Javascript console');
  Module.setStatus = function(text) {
    if (text) Module.printErr('[post-exception status] ' + text);
  };
};

function sys_hide_splash_image() {
  document.getElementById("splash").style.display = "none";
  document.getElementById("splashText").style.display = "none";
};
// Auto-hide splash image after 10 seconds
setTimeout(function() { sys_hide_splash_image(); }, 10000);

navigator.mozSetMessageHandler('activity', function(activityRequest) {
  Module.print("Received activity request: " + activityRequest.source.name);
  if (activityRequest.source.name === "open") {
    Module.print("Loading WAD file from SD card and saving it to idbfs");
    sys_open_wad_file_blob = activityRequest.source.data.blob;
    sys_open_wad_file_name = activityRequest.source.data.filename ? activityRequest.source.data.filename :
                             activityRequest.source.data.name ? activityRequest.source.data.name :
                             sys_open_wad_file_blob.name;
  } else if (activityRequest.source.name === "share") {
    Module.print("Loading WAD file from SD card and saving it to idbfs");
    sys_open_wad_file_blob = activityRequest.source.data.blobs[0];
    sys_open_wad_file_name = activityRequest.source.data.filenames[0] ? activityRequest.source.data.filenames[0] :
                             sys_open_wad_file_blob.name;
  } else {
    Module.print("Received unknown activity request");
  }
  if (sys_open_wad_file_name && sys_open_wad_file_name.indexOf("/") !== -1) {
    sys_open_wad_file_name = sys_open_wad_file_name.substring(0, sys_open_wad_file_name.lastIndexOf("/"));
  }
});

// Read a data segment from the activity result blob
function sys_copy_wad_file_data(data_start, data_end) {
  if (sys_open_wad_file_buffer) {
    const buffer = sys_open_wad_file_buffer;
    sys_open_wad_file_buffer = null;
    sys_open_wad_file_reader = null;
    return buffer;
  }
  if (sys_open_wad_file_reader) {
    return 0;
  }
  sys_open_wad_file_reader = new FileReader();
  sys_open_wad_file_reader.addEventListener("loadend", function() {
    const buffer = Module._malloc(data_end - data_start);
    Module.HEAPU8.set(new Uint8Array(sys_open_wad_file_reader.result), buffer);
    sys_open_wad_file_buffer = buffer;
  });
  sys_open_wad_file_reader.readAsArrayBuffer(sys_open_wad_file_blob.slice(data_start, data_end));
  return 0;
}

function sys_free_wad_file_data() {
  sys_open_wad_file_name = null;
  sys_open_wad_file_blob = null;
  sys_open_wad_file_buffer = null;
  sys_open_wad_file_reader = null;
}

function sys_is_wad_file_available() {
  return (sys_open_wad_file_blob !== null &&
          sys_open_wad_file_name !== null &&
          sys_open_wad_file_name !== '' &&
          lengthBytesUTF8(sys_open_wad_file_name) < 64 - 7 &&
          lengthBytesUTF8(sys_open_wad_file_name) >= 5 &&
          sys_open_wad_file_blob.size > 0);
}

function sys_launch_downloads_file_picker() {
  const picker = new MozActivity({
    name: "pick",
    data: {
      type: "application/*"
    }
  });
  picker.onsuccess = function() {
      Module.print("Downloads picker dialog success");
      sys_open_wad_file_blob = this.result.blob;
      sys_open_wad_file_name = this.result.filename ? this.result.filename :
                               this.result.name ? this.result.name :
                               sys_open_wad_file_blob.name;
      if (sys_open_wad_file_name && sys_open_wad_file_name.indexOf("/") !== -1) {
        sys_open_wad_file_name = sys_open_wad_file_name.substring(0, sys_open_wad_file_name.lastIndexOf("/"));
      }
  };
  picker.onerror = function() {
      Module.print("Downloads picker dialog aborted");
  };
}

function sys_launch_file_manager() {
  // File picker is broken in the system file manager, so we're launching the file manager itself without picking a file
  const fileManager = new MozActivity({
    name: "view",
    data: {
      type: "file/path"
    }
  });
}

function sys_fetch_new_advertisement() {
  if (typeof getKaiAd === 'function') {
    getKaiAd({
      publisher: '9c9550ad-6e58-4e5a-be78-c209bc42736f',
      app: 'OpenTyrian',
      slot: 'OpenTyrian',
      onerror: err => {
        //console.error('KaiAds error:', err);
        Module.print('KaiAds error: ' + err);
      },
      onready: ad => {
        //Module.print('KaiAds ad would be shown here');
        // calling 'display' will display the ad, but we won't call it
        // ad.call('display');
        sys_preloaded_advertisement = ad;
      }
    });
  }
}

setTimeout(function() {
  sys_fetch_new_advertisement();
}, 8000);

try {
  navigator.getFeature('hardware.memory').then((memOnDevice) => {
    Module.print("Device RAM size: " + memOnDevice);
    sys_device_ram_size_mb = parseInt(memOnDevice);
  });
} catch(e) {
  Module.print("Cannot get device RAM size");
}
