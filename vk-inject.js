(function(window) {
  function attach(blob, src) {
    var match = src.match(/\/([^\/?]+?)(\.([^\/.?]+))?($|\?)/);
    var isDoc = (blob.type == 'image/gif'), ext = isDoc ? '.gif' : (match[2] || '.jpg');
    var fname = match[1] + ext;
    var url = isDoc ? 'docs.php' : 'al_photos.php';
    var args = isDoc ? { act: 'a_choose_doc_box', al: 1 } : { act: 'choose_photo', max_files: 10 };
    var scripts = isDoc ? ['upload.js'] : ['photos.js', 'upload.js'];
    var box = showBox(url, args, {stat: scripts, onDone: function() {
      if (!box || (arguments.length < 2)) return;
      blob.fileName = blob.filename = blob.name = fname;
      Upload.onFileApiSend(cur.uplId, [ blob ]);
    }});
    box.show();
  };

  window.addEventListener('message', function(event) {
    if (event.data.message && (event.data.message == 'attachDataUrl')) {
      var url = event.data.url;
      var bytes;
      if (url.split(',')[0].indexOf('base64') >= 0) {
        bytes = atob(url.split(',')[1]);
      } else {
        bytes = unescape(url.split(',')[1]);
      }
      var mime = url.split(',')[0].split(':')[1].split(';')[0];
      var ab = new ArrayBuffer(bytes.length);
      var ia = new Uint8Array(ab);
      for (var i = 0; i < bytes.length; i++) {
        ia[i] = bytes.charCodeAt(i);
      }
      var retryTimer = setInterval(function() {
        if (!cur.addMedia) { return; }
        var id = -1;
        if (event.data.target) {
          for (var j in cur.addMedia) {
            var el = ge(cur.addMedia[j]._addMediaLink);
            while (el) {
              if ((event.data.target == el.id) || (el.classList && el.classList.contains(event.data.target))) {
                id = j;
                break;
              }
              el = el.parentNode;
            }
          }
        } else {
          console.log('VK Photo Saver', 'addMedia target is not specified! Iterating.');
          for (var j in cur.addMedia) {
            if (j > id) id = j;
          }
        }
        if (id == -1) {
          console.log('VK Photo Saver', 'addMedia target is not found (were looking for ' + event.data.target + ')! Aborting.');
          return;
        }
        clearInterval(retryTimer);
        cur.chooseMedia = cur.addMedia[id].chooseMedia;
        cur.showMediaProgress = function(type,i,info){
          if(info.loaded/info.total==1){
            window.postMessage({ message:'attachDataUrlSuccess' }, '*');
          }
          cur.addMedia[id].showMediaProgress.apply(this, arguments);
        };
        cur.attachCount = cur.addMedia[id].attachCount;
        attach(new Blob([ab], { type: mime }), event.data.src);
      }, 100);
    }
  }, false);
  window.postMessage({ message:'attachDataUrlReady' }, '*');
})(window);
