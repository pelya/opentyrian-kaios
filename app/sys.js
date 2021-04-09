// Used from C code
var sys_fs_init_is_done = 0;
var sys_fs_sync_is_done = 1;
var sys_screen_wake_lock = null;
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

setTimeout(function() {
  // KaiAds only used for collecting usage statistics, it will not show an actual ad
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
}, 8000);
