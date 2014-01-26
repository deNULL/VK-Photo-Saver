var menuImageRoot = {
  props: {
    title: 'Отправить в ВК',
    contexts: ['image']
  }
};
var menu;
var menuCapture;

function refreshMenu(menu, parentId) {
  if (!parentId) {
    var count = 0;
    for (var i = 0; i < menu.length; i++) {
      if (menu[i].props.type != 'separator') {
        count++;
      }
    }

    if (count > 1) {
      refreshMenuItem(menuImageRoot);
      parentId = menuImageRoot.id;
    }
  }

  var isFirst = true;
  var afterSeparator = false;
  var last = menu.length - 1;
  while (last >= 0 && menu[last].props.type == 'separator') last--;

  for (var i = 0; i <= last; i++) {
    if (menu[i].props.type == 'separator' && (isFirst || afterSeparator)) {
      continue;
    }

    refreshMenuItem(menu[i], parentId);
    if (menu[i].childs) {
      refreshMenu(menu[i].childs, menu[i].id);
    }

    isFirst = false;
    afterSeparator = menu[i].props.type == 'separator';
  }
}

function refreshMenuItem(item, parentId) {
  var props = {};
  for (var i in item.props) {
    props[i] = item.props[i];
  }
  if (parentId) {
    props.parentId = parentId;
  }
  item.id = chrome.contextMenus.create(props);
  return item;
}

function rebuildMenu() {
  menu = [];
  if (opts.showAlbum) {
    for (var i = 0; i < opts.albums.length; i++) {
      if (isArray(opts.albums[i].album)) {
        var item = {
          props: {
            title: opts.albums[i].group ? 'Загрузить в альбом группы «' + opts.albums[i].group.name + '»' : 'Загрузить в свой альбом',
            contexts: ['image']
          },
          childs: []
        };
        menu.push(item);
        for (var j = 0; j < opts.albums[i].album.length; j++) {
          (function(item, group, album) {
            item.childs.push({
              props: {
                title: album.title,
                onclick: function(info, tab) {
                  uploadImage(group, album, info.srcUrl);
                },
                contexts: ['image']
              }
            });
          })(item, opts.albums[i].group, opts.albums[i].album[j]);
        }
        if (item.childs.length == 0) {
          item.childs.push({
            props: {
              title: 'Нет альбомов',
              enabled: false,
              contexts: ['image']
            }
          });
        }
      } else {
        (function(group, album) {
          menu.push({
            props: {
              title: 'Загрузить в альбом «' + album.title + '»',
              onclick: function(info, tab) {
                uploadImage(group, album, info.srcUrl);
              },
              contexts: ['image']
            }
          });
        })(opts.albums[i].group, opts.albums[i].album);
      }
    }
  }
  menu.push({
    props: {
      type: 'separator',
      contexts: ['image']
    }
  });
  if (opts.showMessage) {
    menu.push({
      props: {
        title: 'Прикрепить к сообщению...',
        onclick: function(info, tab) {
          attach([info.srcUrl], false);
        },
        contexts: ['image']
      }
    });
  }
  menu.push({
    props: {
      type: 'separator',
      contexts: ['image']
    }
  });
  if (opts.showPost) {
    menu.push({
      props: {
        title: 'Прикрепить к новой записи...',
        onclick: function(info, tab) {
          attach([info.srcUrl], true);
        },
        contexts: ['image']
      }
    });
  }
  if (opts.showFullPost) {
    menu.push({
      props: {
        title: 'Прикрепить весь пост к новой записи...',
        onclick: function(info, tab) {
          chrome.tabs.sendMessage(tab.id, { action: 'findSources' }, function(response) {
            attach(response.sources, true);
          });
        },
        documentUrlPatterns: ['*://*.tumblr.com/*'],
        contexts: ['image']
      }
    });
  }

  chrome.contextMenus.removeAll();
  refreshMenu(menu);

  menuCapture = chrome.contextMenus.create({
    title: 'Сделать скриншот страницы',
    onclick: startCapture
  });
}
rebuildMenu();

function uploadImage(group, album, src) {
  if (!opts.accessToken) {
    chrome.tabs.create({ url: 'options.html' });
    return;
  }

  var blob = false;
  var upload_url = false;

  var params = { album_id: album.id };
  if (group) {
    params.group_id = group.id;
  }

  api('photos.getUploadServer', params, function(data) {
    if (data.response) {
      upload_url = data.response.upload_url;
      if (blob && upload_url) {
        upload(group, album, blob, upload_url, src);
      }
    }
  });

  download(src, function(b) {
    blob = b;
    if (blob && upload_url) {
      upload(group, album, blob, upload_url, src);
    }
  });
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

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message == 'updateOptions') {
    saveOptions(request.update, true);
    rebuildMenu();
  } else
  if (request.message == 'captureAlbum') {
    captureTab(sender.tab.windowId, request, function(result) {
      var params = { album_id: request.album.id };
      if (request.group) {
        params.group_id = request.group.id;
      }
      api('photos.getUploadServer', params, function(data) {
        if (data.response) {
          upload(request.group, request.album, result.blob, data.response.upload_url, result.url);
        }
      });
    });
  } else
  if (request.message == 'captureAttachPost' || request.message == 'captureAttachMessage') {
    captureTab(sender.tab.windowId, request, function(result) {
      attach([result.url], request.message == 'captureAttachPost');
    });
  } else
  if (request.message == 'captureSave') {
    captureTab(sender.tab.windowId, request, function(result) {
      var date = new Date();
      saveAs(result.blob, 'screenshot-' + date.getDate() + month[date.getMonth()] + date.getFullYear() + '-' + date.getHours() + '.' + date.getMinutes() + '.' + date.getSeconds() + '.png');
    });
  } else
  if (request.message == 'getParams') {
    sendResponse(localStorage);
  }
});

chrome.runtime.onInstalled.addListener(function(details) {
  chrome.tabs.create({ url: 'options.html' });
});

chrome.browserAction.onClicked.addListener(function(tab) {
  startCapture();
});
