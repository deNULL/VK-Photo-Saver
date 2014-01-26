function ge(e) {return document.getElementById(e)};
function num(n,cs) {
  n = n % 100;
  if ((n % 10 == 0) || (n % 10 > 4) || (n > 4 && n < 21)) {
    return cs[2];
  } else
  if (n % 10 == 1) {
    return cs[0];
  } else {
    return cs[1];
  }
}

var month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

var access_token = localStorage['access_token'];
var quickUploadOwner = localStorage['qu_owner'] || 0;
var quickUploadAlbum = localStorage['qu_album'] || 0;
var quickUploadName = localStorage['qu_name'] || '...';
var albums = {};
var first_name = '', last_name = '', user_id = 0;

function quickUpload(info, tab) {
  if (!access_token) {
    chrome.tabs.create({ url: 'options.html' });
    return;
  }

  var blob = false;
  var upload_url = false;

  var params = { album_id: quickUploadAlbum };
  if (quickUploadOwner != 0) {
    params.group_id = -quickUploadOwner;
  }

  api('photos.getUploadServer', params, function(data) {
    if (data.response) {
      upload_url = data.response.upload_url;
      if (blob && upload_url) {
        upload(blob, upload_url, info.srcUrl);
      }
    }
  });

  download(info.srcUrl, function(b) {
    blob = b;
    if (blob && upload_url) {
      upload(blob, upload_url, info.srcUrl);
    }
  });
}

function attachToPost(info, tab) {
  attach([info.srcUrl], true);
}

function attachTumblrToPost(info, tab) {
  chrome.tabs.sendMessage(tab.id, {action: "find_sources"}, function(response) {
    attach(response.sources, true);
  });
}

function attachToMessage(info, tab) {
  attach([info.srcUrl], false);
}

function attach(urls, post) {
  chrome.tabs.create({ url: post ? 'http://vk.com/feed?w=postbox' : 'http://vk.com/write' }, function(tab) {
    chrome.tabs.executeScript(tab.id, {
      //file: 'attach.js'
      code: "var e = document.createElement('script');e.innerHTML = '\\n\
(function(window) {\\n\
function attach(blob) {\\n\
  var box = showBox(\\'al_photos.php\\', { act: \\'choose_photo\\', max_files: 10 }, {stat: [\\'photos.js\\', \\'upload.js\\'], onDone: function() {\\n\
    if (!box) return;\\n\
    var __FormData = window.FormData;\\n\
    var fileName = \\'photo\\'+Math.random()+\\'.png\\';\\n\
    window.FormData = function() {\\n\
      var obj = new __FormData();\\n\
      var __append = obj.append;\\n\
      obj.append = function(name, file) {\\n\
        return __append.call(this, name, file, fileName);\\n\
      };\\n\
      return obj;\\n\
    };\\n\
    blob.fileName = blob.name = fileName;\\n\
    Upload.onFileApiSend(cur.uplId, [ blob ]);\\n\
    window.FormData = __FormData;\\n\
  }});\\n\
  box.show();\\n\
};\\n\
window.addEventListener(\\'message\\', function(event) {\\n\
  if (event.data.message && (event.data.message == \\'attachDataUrl\\')) {\\n\
    var url = event.data.url;\\n\
    var bytes;\\n\
    if (url.split(\\',\\')[0].indexOf(\\'base64\\') >= 0) {\\n\
      bytes = atob(url.split(\\',\\')[1]);\\n\
    } else {\\n\
      bytes = unescape(url.split(\\',\\')[1]);\\n\
    }\\n\
    var mime = url.split(\\',\\')[0].split(\\':\\')[1].split(\\';\\')[0];\\n\
    var ab = new ArrayBuffer(bytes.length);\\n\
    var ia = new Uint8Array(ab);\\n\
    for (var i = 0; i < bytes.length; i++) {\\n\
      ia[i] = bytes.charCodeAt(i);\\n\
    }\\n\
    var id = event.data.post ? 1 : 2;\\n\
    var retryTimer = setInterval(function() {\\n\
      if (!cur.addMedia) { return; }\\n\
      clearInterval(retryTimer);\\n\
      cur.chooseMedia = cur.addMedia[id].chooseMedia;\\n\
      cur.showMediaProgress = function(type,i,info){\\n\
        if(info.loaded/info.total==1){\\n\
          window.postMessage({message:\\'attachDataUrlSuccess\\'}, \\'*\\');\\n\
        }\\n\
        cur.addMedia[id].showMediaProgress.apply(this,arguments);\\n\
      };\\n\
      cur.attachCount = cur.addMedia[id].attachCount;\\n\
      attach(new Blob([ab], { type: mime }));\\n\
    }, 100);\\n\
  }\\n\
}, false);\\n\
})(window);';document.head.appendChild(e);\n\
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {\n\
  if (request.message == 'attachDataUrl') {\n\
    window.postMessage(request, '*');\n\
  }\n\
});\n\
window.addEventListener('message', function(event) {\n\
  if (event.data.message && (event.data.message == 'attachDataUrlSuccess')) {\n\
    chrome.runtime.sendMessage(event.data);\n\
  }\n\
});\n\
"
    }, function() {
      var tasks = [];
      for (var i=0,l=urls.length;i<l; i++) {
        var url = urls[i];
        tasks.push(downloadTask(tab.id, url, post));
      }
      executeTasks(tasks, 500);
    });
  });
}

var currentOnFinish;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message == 'attachDataUrlSuccess') {
    console.log('success');
    if (currentOnFinish) currentOnFinish();
  }
});

function downloadTask(tabId, url, post) {
  return function(onFinish) {
    download(url, function(blob) {
      var reader = new FileReader();
      currentOnFinish = onFinish;
      console.log(url);
      reader.onload = function() {
        chrome.tabs.sendMessage(tabId, {
          message: 'attachDataUrl', 
          url: reader.result, 
          post: post 
        });
      }
      reader.readAsDataURL(blob);
    });
  }
}

function executeTasks(tasks, timeout) {
  var len = tasks.length;
  var run = function(i){
    var task = tasks[i];
    task(function(){
      if (i<len - 1) {
        setTimeout(function() {
          run(i+1);
        }, timeout);
      }
    })
  }
  run(0);
}

function download(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200){
      callback(this.response);
    }
  }
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.send();
}

function upload(blob, url, src) {
  var formData = new FormData();
  formData.append('file1', blob, 'file.jpg');
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200) {
      var res = (typeof this.response == 'string') ? JSON.parse(this.response) : this.response;

      var params = { album_id: quickUploadAlbum };
      if (quickUploadOwner != 0) {
        params.group_id = -quickUploadOwner;
      }
      params.server = res.server;
      params.photos_list = res.photos_list;
      params.hash = res.hash;

      api('photos.save', params, function(data) {
        console.log('saved', data);

        if (data.response) {
          var notification = window.webkitNotifications.createNotification(
            src,
            'Загрузка завершена',
            'Изображение успешно загружено в альбом «' + quickUploadName + '». Щелкните, чтобы просмотреть.'
          );

          notification.onclick = function () {
            window.open('http://vk.com/photo' + data.response[0].owner_id + '_' + data.response[0].id);
            notification.close();
          }
          notification.show();
          setTimeout(function() {
            notification.cancel();
          }, 3000);
        }
      });
    }
  }
  xhr.open('POST', url);
  xhr.responseType = 'json';
  xhr.send(formData);
}

function startCapture() {
  chrome.tabs.insertCSS({
    file: 'styles.css'
  });
  chrome.tabs.executeScript({
    file: 'capture.js'
  });
}

function captureTab(windowId, crop, callback) {
  chrome.tabs.captureVisibleTab(windowId, function(dataUrl) {
    var fullSize = new Image();
    fullSize.onload = function() {
      var canvas = document.createElement('canvas');
      canvas.width = crop.w;
      canvas.height = crop.h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(fullSize, -crop.x, -crop.y);
      callback(canvasToBlob(canvas));
    }
    fullSize.src = dataUrl;
  });
}

function canvasToBlob(canvas) {
  var url = canvas.toDataURL('image/png');
  var bytes;
  if (url.split(',')[0].indexOf('base64') >= 0) {
    bytes = atob(url.split(',')[1]);
  } else {
    bytes = unescape(url.split(',')[1]);
  }
  var mime = url.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(bytes.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < bytes.length; i++) {
    ia[i] = bytes.charCodeAt(i);
  }

  return {
    url: url,
    blob: new Blob([ab], { type: mime })
  };
}

function checkAccessToken() {
  access_token = localStorage['access_token'];

  if (is_options) {
    ge('block_auth').style.display = access_token ? 'none' : 'block';
    ge('block_logged').style.display = access_token ? 'block' : 'none';
    ge('block_settings').style.display = access_token ? 'block' : 'none';

    if (access_token) {
      loadGroups(quickUploadAlbum == 0);

      api('users.get', {}, function(data) {
        first_name = localStorage['first_name'] = data.response[0].first_name;
        last_name = localStorage['last_name'] = data.response[0].last_name;
        user_id = localStorage['user_id'] = data.response[0].id;

        ge('link_user').href = 'http://vk.com/id' + user_id;
        ge('link_user').innerHTML = first_name + ' ' + last_name;
      });
    }
  }
}

function api(method, params, callback) {
  var arr = ['v=5.7', 'access_token=' + access_token];
  for (var k in params) {
    arr.push(k + '=' + escape(params[k]));
  }

  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200) {
      var res = (typeof this.response == 'string') ? JSON.parse(this.response) : this.response;
      if (!callback(res) && res.error) {
        var notification = window.webkitNotifications.createNotification(
          'icon-48.png',
          'Ошибка ' + res.error.error_code + ' при выполнении запроса «' + method + '»',
          'Произошла ошибка «' + res.error.error_msg + ' при обращении к API ВКонтакте. Сообщите разработчику.'
        );

        notification.onclick = function () {
          window.open('http://vk.com/write189814');
          notification.close();
        }
        notification.show();
        setTimeout(function() {
          notification.cancel();
        }, 5000);
      }
    }
  }
  xhr.open('POST', 'https://api.vk.com/method/' + method);
  xhr.responseType = 'json';
  xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
  xhr.send(arr.join('&'));
}

function performAuth() {
  var redirect_uri = 'https://oauth.vk.com/blank.html';
  var redirect_regex = /^https:\/\/oauth.vk.com\/blank.html#(.*)$/i;
  chrome.windows.getCurrent(function(wnd) {
    chrome.tabs.getCurrent(function(tab) {
      chrome.windows.create({
        url: 'https://oauth.vk.com/authorize?client_id=4139773&scope=photos,groups,offline&redirect_uri=' + redirect_uri + '&display=popup&v=5.7&response_type=token',
        tabId: tab.id,
        focused: true,
        type: 'popup',
        left: wnd.left + (wnd.width - 700) >> 1,
        top: wnd.top + (wnd.height - 500) >> 1,
        width: 700,
        height: 500,
      }, function(popup) {
        chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
          var match;
          if (tab.windowId == popup.id && changeInfo.url && (match = changeInfo.url.match(redirect_regex))) {
            chrome.windows.remove(popup.id);

            var params = match[1].split('&');
            for (var i = 0; i < params.length; i++) {
              var kv = params[i].split('=');
              if (kv[0] == 'access_token') {
                console.log('access_token: ', kv[1]);

                localStorage['access_token'] = kv[1];
                chrome.runtime.sendMessage({ message: 'setAccessToken', value: localStorage['access_token'] });
                checkAccessToken();
              }
            }
          }
        });
      });
    });
  });
}