function ge(e) {return document.getElementById(e)};
function isArray(obj) { return Object.prototype.toString.call(obj) === '[object Array]'; }
function pad(s, len, ch, r) { return (r ? s : '') + (new Array(Math.max(0, len - (s + '').length + 1))).join(ch ? ch : '0') + (r ? '' : s); }
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

/*
var access_token = localStorage['access_token']; // TODO: move all options to 'opts'
var quickUploadOwner = localStorage['qu_owner'] || 0;
var quickUploadAlbum = localStorage['qu_album'] || 0;
var quickUploadName = localStorage['qu_name'] || '...';
var albums = {};
var first_name = '', last_name = '', user_id = 0;
*/

var opts = {};
function loadOptions(defaults) {
  for (var key in defaults) {
    opts[key] = localStorage[key] ? JSON.parse(localStorage[key]) : defaults[key];
  }
}
function saveOptions(update, silent) {
  if (update) {
    for (var key in update) {
      opts[key] = update[key];
      localStorage[key] = JSON.stringify(update[key]);
    }
  }
  if (!silent) {
    chrome.runtime.sendMessage({ message: 'updateOptions', update: update });
  }
}
loadOptions({
  accessToken: false,
  firstName: false,
  lastName: false,
  userID: false,

  showAlbum: true,
  showTabs: true,
  showMessage: true,
  showPost: true,
  showFullPost: true,

  albums: [],
  afterUpload: false,
});

// Old options, to be removed
opts['accessToken'] = opts['accessToken'] || localStorage['access_token'];
if (opts['albums'].length == 0 && localStorage['qu_owner'] && localStorage['qu_album']) {
  opts['albums'] = [{
    group: parseInt(localStorage['qu_owner']) ? {
      id: parseInt(localStorage['qu_owner'])
    } : false,
    album: {
      id: parseInt(localStorage['qu_album']),
      title: localStorage['qu_name']
    }
  }];
  if (opts['albums'][0].group) {
    api('groups.getById', { group_id: opts['albums'][0].group.id }, function(data) {
      if (data.response && data.response[0]) {
        opts['albums'][0].group = data.response[0];
      }
    });
  }
}
if (opts['albums'].length == 0) {
  opts['albums'] = [{ group: false, album: [] }];
}
saveOptions();

function attachInTab(urls, tab, post, addMediaId) {
  chrome.windows.update(tab.windowId, { focused: true });
  chrome.tabs.update(tab.id, { active: true });
  chrome.tabs.executeScript(tab.id, {
    //file: 'attach.js'
    code: "if (!document.getElementById('vkps_injection')) {\n\
var e = document.createElement('script');e.id = 'vkps_injection';e.innerHTML = '\\n\
(function(window) {\\n\
function attach(blob, src) {\\n\
  var match = src.match(/\\\\/([^\\\\/?]+?)(\\\\.([^\\\\/.?]+))?($|\\\\?)/);\\n\
  var isDoc = (blob.type == \\'image/gif\\'), ext = isDoc ? \\'.gif\\' : (match[2] || \\'.jpg\\');\\n\
  var fname = match[1] + ext;\\n\
  var url = isDoc ? \\'docs.php\\' : \\'al_photos.php\\';\\n\
  var args = isDoc ? { act: \\'a_choose_doc_box\\', al: 1 } : { act: \\'choose_photo\\', max_files: 10 };\\n\
  var scripts = isDoc ? [\\'upload.js\\'] : [\\'photos.js\\', \\'upload.js\\'];\\n\
  var box = showBox(url, args, {stat: scripts, onDone: function() {\\n\
    if (!box || (arguments.length < 2)) return;\\n\
    blob.fileName = blob.filename = blob.name = fname;\\n\
    Upload.onFileApiSend(cur.uplId, [ blob ]);\\n\
  }});\\n\
  box.show();\\n\
};\\n\
window.addEventListener(\\'message\\', function(event) {\\n\
  if (event.data.message && (event.data.message == \\'attachDataUrl\\')) {\\n\
    debugger;\\n\
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
    var retryTimer = setInterval(function() {\\n\
      if (!cur.addMedia) { return; }\\n\
      var id = -1;\\n\
      if (event.data.addMediaId) {\\n\
        id = event.data.addMediaId;\\n\
      } else {\\n\
        for (var j in cur.addMedia) {\\n\
          if (j > id) id = j;\\n\
        }\\n\
      }\\n\
      clearInterval(retryTimer);\\n\
      cur.chooseMedia = cur.addMedia[id].chooseMedia;\\n\
      cur.showMediaProgress = function(type,i,info){\\n\
        if(info.loaded/info.total==1){\\n\
          window.postMessage({message:\\'attachDataUrlSuccess\\'}, \\'*\\');\\n\
        }\\n\
        cur.addMedia[id].showMediaProgress.apply(this,arguments);\\n\
      };\\n\
      cur.attachCount = cur.addMedia[id].attachCount;\\n\
      attach(new Blob([ab], { type: mime }), event.data.src);\\n\
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
}"
  }, function() {
    var tasks = [];
    for (var i = 0, l = urls.length; i < l; i++) {
      var url = urls[i];
      if (url.indexOf('data:') == 0) { // Data URL
        tasks.push(function(onFinish) {
          currentOnFinish = onFinish;
          chrome.tabs.sendMessage(tab.id, {
            message: 'attachDataUrl',
            url: url,
            src: '/screenshot.png',
            post: post,
            addMediaId: addMediaId
          });
        });
      } else {
        tasks.push(downloadTask(tab.id, url, post, addMediaId));
      }
    }
    executeTasks(tasks, 500);
  });
}

function attach(urls, post) {
  chrome.tabs.create({ url: post ? 'http://vk.com/feed?w=postbox' : 'http://vk.com/write' }, function(tab) {
    attachInTab(urls, tab, post, post ? undefined : 2);
  });
}

var currentOnFinish;
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message == 'attachDataUrlSuccess') {
    console.log('success');
    if (currentOnFinish) currentOnFinish();
  } else
  if (request.message == 'updateOptions') {
    saveOptions(request.update, true);
  }
});

function downloadTask(tabId, url, post, addMediaId) {
  return function(onFinish) {
    download(url, function(blob) {
      var reader = new FileReader();
      currentOnFinish = onFinish;
      console.log(url);
      reader.onload = function() {
        chrome.tabs.sendMessage(tabId, {
          message: 'attachDataUrl',
          url: reader.result,
          src: url,
          post: post,
          addMediaId: addMediaId,
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
    if (this.readyState == 4 && this.response) {
      callback(this.response);
    }
  }
  xhr.open('GET', url);
  xhr.responseType = 'blob';
  xhr.send();
}

var uploadNum = 0;
function upload(group, album, blob, url, src) {
  chrome.notifications.create('upload' + (++uploadNum), {
    type: 'progress',
    iconUrl: 'icon-48.png',
    title: 'Загрузка изображения',
    message: 'Подождите, изображение загружается в альбом «' + album.title + '»...',
    progress: 0
  }, function() {});

  var formData = new FormData();
  formData.append('file1', blob, 'file.jpg');
  var xhr = new XMLHttpRequest();
  xhr.upload.onprogress = function(pe) {
    if (pe.lengthComputable) {
      chrome.notifications.update('upload' + uploadNum, {
        type: 'progress',
        iconUrl: 'icon-48.png',
        title: 'Загрузка изображения',
        message: 'Подождите, изображение загружается в альбом «' + album.title + '»...',
        progress: (100 * pe.loaded / pe.total) | 0
      }, function() {});
    }
  }
  xhr.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200) {
      var res = (typeof this.response == 'string') ? JSON.parse(this.response) : this.response;

      var params = { album_id: album.id };
      if (group) {
        params.group_id = group.id;
      }
      params.server = res.server;
      params.photos_list = res.photos_list;
      params.hash = res.hash;

      api('photos.save', params, function(data) {
        console.log('saved', data);

        if (data.response) {
          var photo = data.response[0];

          var copied = '';
          if (opts.afterUpload == 'src') {
            copyToClipboard(photo.photo_2560 || photo.photo_1280 || photo.photo_807 || photo.photo_604 || photo.photo_130 || photo.photo_75);
            copied = '\n\nСсылка на изображение скопирована в буфер обмена.';
          } else
          if (opts.afterUpload == 'page') {
            copyToClipboard('http://vk.com/photo' + photo.owner_id + '_' + photo.id);
            copied = '\n\nСсылка на страницу фотографии скопирована в буфер обмена.';
          }

          chrome.notifications.update('upload' + uploadNum, {
            type: 'image',
            iconUrl: 'icon-48.png',
            title: 'Загрузка изображения',
            message: 'Изображение успешно загружено в альбом «' + album.title + '».' + copied,
            imageUrl: URL.createObjectURL(blob),
            buttons: [{ title: 'Открыть страницу фотографии'}, { title: 'Открыть изображение' }]
          }, function() {});

          var clickNotification = function(notificationId, buttonId) {
            if (notificationId == 'upload' + uploadNum) {
              if (buttonId == 0) {
                window.open('http://vk.com/photo' + photo.owner_id + '_' + photo.id);
              } else {
                window.open(photo.photo_2560 || photo.photo_1280 || photo.photo_807 || photo.photo_604 || photo.photo_130 || photo.photo_75);
              }
              chrome.notifications.clear('upload' + uploadNum, function() {});
            }
          };
          var closeNotification = function(notificationId, byUser) {
            chrome.notifications.onButtonClicked.removeListener(clickNotification);
            chrome.notifications.onClosed.removeListener(closeNotification);
          }

          chrome.notifications.onButtonClicked.addListener(clickNotification);
          chrome.notifications.onClosed.addListener(closeNotification);

          setTimeout(function() {
            chrome.notifications.clear('upload' + uploadNum, function() {});
          }, 5000);
        }
      });
    }
  }
  xhr.open('POST', url);
  xhr.responseType = 'json';
  xhr.send(formData);
}

function copyToClipboard(text) {
  var ta = document.createElement('textarea');
  ta.innerText = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function canvasToBlob(canvas) {
  var url = (typeof canvas == 'string') ? canvas : canvas.toDataURL('image/png');
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

function api(method, params, callback) {
  var arr = ['v=5.7', 'access_token=' + opts.accessToken];
  for (var k in params) {
    arr.push(k + '=' + escape(params[k]));
  }

  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(){
    if (this.readyState == 4 && this.status == 200) {
      var res = (typeof this.response == 'string') ? JSON.parse(this.response) : this.response;
      if (!callback(res) && res.error) {
        if ((res.error.error_code == 10) || (res.error.error_code == 13) || (res.error.error_code == 5)) {
          var notification = new Notification(
            'Расширению «VK Photo Saver» требуется авторизация', {
              icon: 'icon-48.png',
              body: 'Для загрузки изображений в ВКонтакте нужно разрешить доступ. Щелкните здесь чтобы авторизоваться.'
            }
          );
          notification.onclick = function() {
            chrome.tabs.create({ url: 'options.html' });
            notification.close();
          }
        } else {
          var notification = new Notification(
            'Ошибка ' + res.error.error_code + ' при выполнении запроса «' + method + '»', {
              icon: 'icon-48.png',
              body: 'Произошла ошибка «' + res.error.error_msg + ' при обращении к API ВКонтакте. Сообщите разработчику.'
            }
          );

          notification.onclick = function () {
            window.open('http://vk.com/write189814');
            notification.close();
          }
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