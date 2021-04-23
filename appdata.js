
  var Module = typeof Module !== 'undefined' ? Module : {};
  
  if (!Module.expectedDataFileDownloads) {
    Module.expectedDataFileDownloads = 0;
  }
  Module.expectedDataFileDownloads++;
  (function() {
   var loadPackage = function(metadata) {
  
      var PACKAGE_PATH;
      if (typeof window === 'object') {
        PACKAGE_PATH = window['encodeURIComponent'](window.location.pathname.toString().substring(0, window.location.pathname.toString().lastIndexOf('/')) + '/');
      } else if (typeof location !== 'undefined') {
        // worker
        PACKAGE_PATH = encodeURIComponent(location.pathname.toString().substring(0, location.pathname.toString().lastIndexOf('/')) + '/');
      } else {
        throw 'using preloaded data can only be done on a web page or in a web worker';
      }
      var PACKAGE_NAME = 'appdata.data';
      var REMOTE_PACKAGE_BASE = 'appdata.data';
      if (typeof Module['locateFilePackage'] === 'function' && !Module['locateFile']) {
        Module['locateFile'] = Module['locateFilePackage'];
        err('warning: you defined Module.locateFilePackage, that has been renamed to Module.locateFile (using your locateFilePackage for now)');
      }
      var REMOTE_PACKAGE_NAME = Module['locateFile'] ? Module['locateFile'](REMOTE_PACKAGE_BASE, '') : REMOTE_PACKAGE_BASE;
    
      var REMOTE_PACKAGE_SIZE = metadata['remote_package_size'];
      var PACKAGE_UUID = metadata['package_uuid'];
    
      function fetchRemotePackage(packageName, packageSize, callback, errback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', packageName, true);
        xhr.responseType = 'arraybuffer';
        xhr.onprogress = function(event) {
          var url = packageName;
          var size = packageSize;
          if (event.total) size = event.total;
          if (event.loaded) {
            if (!xhr.addedTotal) {
              xhr.addedTotal = true;
              if (!Module.dataFileDownloads) Module.dataFileDownloads = {};
              Module.dataFileDownloads[url] = {
                loaded: event.loaded,
                total: size
              };
            } else {
              Module.dataFileDownloads[url].loaded = event.loaded;
            }
            var total = 0;
            var loaded = 0;
            var num = 0;
            for (var download in Module.dataFileDownloads) {
            var data = Module.dataFileDownloads[download];
              total += data.total;
              loaded += data.loaded;
              num++;
            }
            total = Math.ceil(total * Module.expectedDataFileDownloads/num);
            if (Module['setStatus']) Module['setStatus']('Downloading data... (' + loaded + '/' + total + ')');
          } else if (!Module.dataFileDownloads) {
            if (Module['setStatus']) Module['setStatus']('Downloading data...');
          }
        };
        xhr.onerror = function(event) {
          throw new Error("NetworkError for: " + packageName);
        }
        xhr.onload = function(event) {
          if (xhr.status == 200 || xhr.status == 304 || xhr.status == 206 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            var packageData = xhr.response;
            callback(packageData);
          } else {
            throw new Error(xhr.statusText + " : " + xhr.responseURL);
          }
        };
        xhr.send(null);
      };

      function handleError(error) {
        console.error('package error:', error);
      };
    
        var fetchedCallback = null;
        var fetched = Module['getPreloadedPackage'] ? Module['getPreloadedPackage'](REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE) : null;

        if (!fetched) fetchRemotePackage(REMOTE_PACKAGE_NAME, REMOTE_PACKAGE_SIZE, function(data) {
          if (fetchedCallback) {
            fetchedCallback(data);
            fetchedCallback = null;
          } else {
            fetched = data;
          }
        }, handleError);
      
    function runWithFS() {
  
      function assert(check, msg) {
        if (!check) throw msg + new Error().stack;
      }
  Module['FS_createPath']("/", "data", true, true);

          /** @constructor */
          function DataRequest(start, end, audio) {
            this.start = start;
            this.end = end;
            this.audio = audio;
          }
          DataRequest.prototype = {
            requests: {},
            open: function(mode, name) {
              this.name = name;
              this.requests[name] = this;
              Module['addRunDependency']('fp ' + this.name);
            },
            send: function() {},
            onload: function() {
              var byteArray = this.byteArray.subarray(this.start, this.end);
              this.finish(byteArray);
            },
            finish: function(byteArray) {
              var that = this;
      
          Module['FS_createDataFile'](this.name, null, byteArray, true, true, true); // canOwn this data in the filesystem, it is a slide into the heap that will never change
          Module['removeRunDependency']('fp ' + that.name);
  
              this.requests[this.name] = null;
            }
          };
      
              var files = metadata['files'];
              for (var i = 0; i < files.length; ++i) {
                new DataRequest(files[i]['start'], files[i]['end'], files[i]['audio']).open('GET', files[i]['filename']);
              }
      
        
      function processPackageData(arrayBuffer) {
        assert(arrayBuffer, 'Loading data file failed.');
        assert(arrayBuffer instanceof ArrayBuffer, 'bad input to processPackageData');
        var byteArray = new Uint8Array(arrayBuffer);
        var curr;
        
          // Reuse the bytearray from the XHR as the source for file reads.
          DataRequest.prototype.byteArray = byteArray;
    
            var files = metadata['files'];
            for (var i = 0; i < files.length; ++i) {
              DataRequest.prototype.requests[files[i].filename].onload();
            }
                Module['removeRunDependency']('datafile_appdata.data');

      };
      Module['addRunDependency']('datafile_appdata.data');
    
      if (!Module.preloadResults) Module.preloadResults = {};
    
        Module.preloadResults[PACKAGE_NAME] = {fromCache: false};
        if (fetched) {
          processPackageData(fetched);
          fetched = null;
        } else {
          fetchedCallback = processPackageData;
        }
      
    }
    if (Module['calledRun']) {
      runWithFS();
    } else {
      if (!Module['preRun']) Module['preRun'] = [];
      Module["preRun"].push(runWithFS); // FS is not initialized yet, wait for it
    }
  
   }
   loadPackage({"files": [{"filename": "/data/newshm.shp", "start": 0, "end": 22378, "audio": 0}, {"filename": "/data/levels1.dat", "start": 22378, "end": 31737, "audio": 0}, {"filename": "/data/newsha.shp", "start": 31737, "end": 57359, "audio": 0}, {"filename": "/data/tyrset.pcx", "start": 57359, "end": 111125, "audio": 0}, {"filename": "/data/levels4.dat", "start": 111125, "end": 122228, "audio": 0}, {"filename": "/data/tyrian3.lvl", "start": 122228, "end": 515626, "audio": 0}, {"filename": "/data/newshk.shp", "start": 515626, "end": 538539, "audio": 0}, {"filename": "/data/shapesz.dat", "start": 538539, "end": 782251, "audio": 0}, {"filename": "/data/tyrian2.lvl", "start": 782251, "end": 1163493, "audio": 0}, {"filename": "/data/newsh4.shp", "start": 1163493, "end": 1192942, "audio": 0}, {"filename": "/data/demo.3", "start": 1192942, "end": 1194916, "audio": 0}, {"filename": "/data/demo.2", "start": 1194916, "end": 1197109, "audio": 0}, {"filename": "/data/tyrianc.shp", "start": 1197109, "end": 1641971, "audio": 0}, {"filename": "/data/newshh.shp", "start": 1641971, "end": 1688610, "audio": 0}, {"filename": "/data/shapes).dat", "start": 1688610, "end": 1807330, "audio": 0}, {"filename": "/data/newshg.shp", "start": 1807330, "end": 1843973, "audio": 0}, {"filename": "/data/newshd.shp", "start": 1843973, "end": 1885985, "audio": 0}, {"filename": "/data/demo.5", "start": 1885985, "end": 1887107, "audio": 0}, {"filename": "/data/newsh1.shp", "start": 1887107, "end": 1917048, "audio": 0}, {"filename": "/data/user2.shp", "start": 1917048, "end": 1944722, "audio": 0}, {"filename": "/data/palette.dat", "start": 1944722, "end": 1962386, "audio": 0}, {"filename": "/data/newsh2.shp", "start": 1962386, "end": 1997622, "audio": 0}, {"filename": "/data/voicesc.snd", "start": 1997622, "end": 2185897, "audio": 0}, {"filename": "/data/demo.4", "start": 2185897, "end": 2186596, "audio": 0}, {"filename": "/data/loudness.awe", "start": 2186596, "end": 2220978, "audio": 0}, {"filename": "/data/tyrian.hdt", "start": 2220978, "end": 2374635, "audio": 0}, {"filename": "/data/newsh7.shp", "start": 2374635, "end": 2418714, "audio": 0}, {"filename": "/data/shapesy.dat", "start": 2418714, "end": 2571706, "audio": 0}, {"filename": "/data/tshp2.pcx", "start": 2571706, "end": 2633874, "audio": 0}, {"filename": "/data/newshi.shp", "start": 2633874, "end": 2664734, "audio": 0}, {"filename": "/data/newsho.shp", "start": 2664734, "end": 2689212, "audio": 0}, {"filename": "/data/newsh9.shp", "start": 2689212, "end": 2728043, "audio": 0}, {"filename": "/data/tyrian.pic", "start": 2728043, "end": 3094012, "audio": 0}, {"filename": "/data/cubetxt3.dat", "start": 3094012, "end": 3106306, "audio": 0}, {"filename": "/data/tyrian.ico", "start": 3106306, "end": 3107072, "audio": 0}, {"filename": "/data/user1.shp", "start": 3107072, "end": 3134746, "audio": 0}, {"filename": "/data/newsh0.shp", "start": 3134746, "end": 3148842, "audio": 0}, {"filename": "/data/exitmsg.bin", "start": 3148842, "end": 3152842, "audio": 0}, {"filename": "/data/demo.1", "start": 3152842, "end": 3155587, "audio": 0}, {"filename": "/data/music.mus", "start": 3155587, "end": 3309069, "audio": 0}, {"filename": "/data/newshf.shp", "start": 3309069, "end": 3342612, "audio": 0}, {"filename": "/data/voices.snd", "start": 3342612, "end": 3475379, "audio": 0}, {"filename": "/data/newshp.shp", "start": 3475379, "end": 3521583, "audio": 0}, {"filename": "/data/tyrian4.lvl", "start": 3521583, "end": 4321589, "audio": 0}, {"filename": "/data/newsht.shp", "start": 4321589, "end": 4335776, "audio": 0}, {"filename": "/data/newshc.shp", "start": 4335776, "end": 4376490, "audio": 0}, {"filename": "/data/newsh^.shp", "start": 4376490, "end": 4411378, "audio": 0}, {"filename": "/data/cubetxt1.dat", "start": 4411378, "end": 4447547, "audio": 0}, {"filename": "/data/newshu.shp", "start": 4447547, "end": 4483204, "audio": 0}, {"filename": "/data/tyrian1.lvl", "start": 4483204, "end": 5021466, "audio": 0}, {"filename": "/data/newshe.shp", "start": 5021466, "end": 5050411, "audio": 0}, {"filename": "/data/newsh8.shp", "start": 5050411, "end": 5085563, "audio": 0}, {"filename": "/data/newshl.shp", "start": 5085563, "end": 5100409, "audio": 0}, {"filename": "/data/tyrend.anm", "start": 5100409, "end": 8416257, "audio": 0}, {"filename": "/data/newshv.shp", "start": 8416257, "end": 8439600, "audio": 0}, {"filename": "/data/newshr.shp", "start": 8439600, "end": 8467849, "audio": 0}, {"filename": "/data/shapesw.dat", "start": 8467849, "end": 8640329, "audio": 0}, {"filename": "/data/newsh6.shp", "start": 8640329, "end": 8657907, "audio": 0}, {"filename": "/data/newsh#.shp", "start": 8657907, "end": 8675657, "audio": 0}, {"filename": "/data/levels2.dat", "start": 8675657, "end": 8681191, "audio": 0}, {"filename": "/data/newsh5.shp", "start": 8681191, "end": 8717004, "audio": 0}, {"filename": "/data/newshs.shp", "start": 8717004, "end": 8763570, "audio": 0}, {"filename": "/data/newsh3.shp", "start": 8763570, "end": 8800700, "audio": 0}, {"filename": "/data/estsc.shp", "start": 8800700, "end": 8916038, "audio": 0}, {"filename": "/data/tyrian.shp", "start": 8916038, "end": 9359909, "audio": 0}, {"filename": "/data/shapesx.dat", "start": 9359909, "end": 9577413, "audio": 0}, {"filename": "/data/newshn.shp", "start": 9577413, "end": 9618614, "audio": 0}, {"filename": "/data/cubetxt4.dat", "start": 9618614, "end": 9681038, "audio": 0}, {"filename": "/data/levels3.dat", "start": 9681038, "end": 9687090, "audio": 0}, {"filename": "/data/newshj.shp", "start": 9687090, "end": 9731089, "audio": 0}, {"filename": "/data/newsh~.shp", "start": 9731089, "end": 9747308, "audio": 0}, {"filename": "/data/tyrian.snd", "start": 9747308, "end": 10011820, "audio": 0}, {"filename": "/data/tyrian.cdt", "start": 10011820, "end": 10012945, "audio": 0}, {"filename": "/data/cubetxt2.dat", "start": 10012945, "end": 10021053, "audio": 0}, {"filename": "/data/newshb.shp", "start": 10021053, "end": 10060078, "audio": 0}], "remote_package_size": 10060078, "package_uuid": "89bfafd6-e2ca-4deb-9eab-6253544ed185"});
  
  })();
  