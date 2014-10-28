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

var tabsInMenu = [];
function getSuitableTabs(callback) {
  chrome.tabs.query({
    url: '*://vk.com/*',
    windowType: 'normal'
  }, function(tabs) {
    var checked = {};
    var left = tabs.length;
    for (var i = 0; i < tabs.length; i++) {
      (function(tab) {
        var doneTab = function(results) {
          clearTimeout(tabTimeout);
          checked[tab.id] = results[0];
          left--;

          var filtered = [];
          if (!left) {
            tabsInMenu = [];
            for (var j = 0; j < tabs.length; j++) {
              var res = checked[tabs[j].id];
              if (res) {
                tabsInMenu.push(tabs[j].id);
                filtered.push({
                  tab: tabs[j],
                  wall: res.wall,
                  title: res.title
                });
              } /* else { // For debug purposes
                tabsInMenu.push(tabs[j].id);
                filtered.push({
                  tab: tabs[j],
                  wall: false,
                  title: tabs[j].title
                })
              } */
            }

            callback(filtered);
          }
        };

        var tabTimeout = setTimeout(function() { // Crashed tabs workaround
          if (checked[tab.id] === undefined) {
            doneTab([false]);
          }
        }, 200);
        chrome.tabs.executeScript(tab.id, {
          code: '\
            if (document.getElementById("im_texts")) {\
              ({ wall: false, title: document.getElementById("im_tabs").getElementsByClassName("im_tab_selected")[0].innerText.trim() });\
            } else\
            if (document.getElementById("submit_post_box")) {\
              ({ wall: true, title: document.title });\
            } else (false);'
        }, doneTab);
      })(tabs[i]);
    }

    if (!left) {
      tabsInMenu = [];
      callback([]);
    }
  });
}
function rebuildMenu(tabs) {
  if (opts.showTabs && !tabs) {
    getSuitableTabs(rebuildMenu);
    return;
  }

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
          if (!opts.albums[i].group || opts.albums[i].album[j].can_upload) {
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
        }
        if (item.childs.length == 0) {
          item.childs.push({
            props: {
              title: 'Нет доступных альбомов',
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
  if (opts.showTabs) {
    for (var i = 0; i < tabs.length; i++) {
      (function(tab) {
        menu.push({
          props: {
            title: tab.wall ? ('Прикрепить к записи на стене «' + tab.title + '»') : ('Прикрепить к диалогу «' + tab.title + '»'),
            onclick: function(info) {
              attachInTab([info.srcUrl], tab.tab, tab.wall);
            },
            contexts: ['image']
          }
        });
      })(tabs[i]);
    }
  }
  if (opts.showMessage) {
    menu.push({
      props: {
        title: 'Прикрепить к новому сообщению...',
        onclick: function(info, tab) {
          attach([info.srcUrl], false);
        },
        contexts: ['image']
      }
    });
  }
  /*menu.push({
    props: {
      type: 'separator',
      contexts: ['image']
    }
  });*/
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
    onclick: capture,
    contexts: ['page', 'selection', 'editable', 'video', 'audio'] // not 'all' because we don't want extra item on images (also 'link' not included because images are often links too)
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

  var params = { album_id: album.id, https: 1 };
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

var currentScreenshot;
var currentTabs;
function capture(info, tab) {
  chrome.tabs.captureVisibleTab({
    format: 'png'
  }, function(dataUrl) {
    getSuitableTabs(function(tabs) {
      chrome.tabs.executeScript(tab.id, {
        file: 'inject.js'
      });
      currentScreenshot = dataUrl;
      currentTabs = tabs;
    });
  });
}

chrome.tabs.onCreated.addListener(function(tab) {
  if (opts.showTabs && tab.url.match(/^https?:\/\/vk.com\//i)) {
    rebuildMenu();
  }
});
chrome.tabs.onUpdated.addListener(function(tabId, info, tab) {
  if (opts.showTabs && info.url && info.url.match(/^https?:\/\/vk.com\//i)) {
    setTimeout(function() {
      rebuildMenu();
    }, 0);
  }
});
chrome.tabs.onRemoved.addListener(function(tabId, info) {
  if (opts.showTabs && tabsInMenu.indexOf(tabId) > -1) {
    rebuildMenu();
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message == 'updateOptions') {
    saveOptions(request.update, true);
    rebuildMenu();
  } else
  if (request.message == 'getOptions') {
    sendResponse(opts);
  } else
  if (request.message == 'getCaptureParams') {
    sendResponse({ opts: opts, tabs: currentTabs, screenshotSrc: currentScreenshot });
  } else
  if (request.message == 'captureAlbum') {
    var result = canvasToBlob(request.screenshot);
    var params = { album_id: request.album.id, https: 1 };
    if (request.group) {
      params.group_id = request.group.id;
    }
    api('photos.getUploadServer', params, function(data) {
      if (data.response) {
        upload(request.group, request.album, result.blob, data.response.upload_url, result.url);
      }
    });
  } else
  if (request.message == 'captureAttachPost' || request.message == 'captureAttachMessage') {
    attach([canvasToBlob(request.screenshot).url], request.message == 'captureAttachPost');
  } else
  if (request.message == 'captureSave') {
    var date = new Date();
    saveAs(canvasToBlob(request.screenshot).blob, 'screenshot-' + date.getDate() + month[date.getMonth()] + date.getFullYear() + '-' + pad(date.getHours(), 2) + '.' + pad(date.getMinutes(), 2) + '.' + pad(date.getSeconds(), 2) + '.png');
  } else
  if (request.message == 'captureTab') {
    attachInTab([canvasToBlob(request.screenshot).url], request.tab, request.wall);
  }
});

chrome.runtime.onInstalled.addListener(function(details) {
  chrome.tabs.create({ url: 'options.html' });
});

chrome.browserAction.onClicked.addListener(function(tab) {
  capture(false, tab);
});
