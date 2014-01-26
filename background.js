var menuRoot = chrome.contextMenus.create({
  title: 'Отправить в ВК',
  contexts: ['image']
});
var menuQuickUpload = chrome.contextMenus.create({
  parentId: menuRoot,
  title: 'Загрузить в альбом «' + quickUploadName + '»',
  onclick: quickUpload,
  contexts: ['image']
});
var menuAttachPost = chrome.contextMenus.create({
  parentId: menuRoot,
  title: 'Прикрепить к новой записи...',
  onclick: attachToPost,
  contexts: ['image']
});

var triggerAttachTumblrPost = function (enabled) {
  if (!window.menuAttachTumblrPost && enabled) {
    window.menuAttachTumblrPost = chrome.contextMenus.create({
      parentId: menuRoot,
      title: 'Прикрепить весь пост к новой записи...',
      onclick: attachTumblrToPost,
      contexts: ['image']
    });
  } else if (window.menuAttachTumblrPost && !enabled) {
    chrome.contextMenus.remove(window.menuAttachTumblrPost);
    window.menuAttachTumblrPost = 0;
  }
};

var menuAttachMessage = chrome.contextMenus.create({
  parentId: menuRoot,
  title: 'Прикрепить к сообщению...',
  onclick: attachToMessage,
  contexts: ['image']
});
var menuCapture = chrome.contextMenus.create({
  title: 'Сделать скриншот страницы',
  onclick: startCapture
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.message == 'setQuickUploadOwner') {
    quickUploadOwner = request.value;
  } else
  if (request.message == 'setQuickUploadAlbum') {
    quickUploadAlbum = request.value;
    quickUploadName = request.name;

    chrome.contextMenus.update(menuQuickUpload, {
      title: 'Загрузить в альбом «' + quickUploadName + '»',
    });
  } else
  if (request.message == 'setAccessToken') {
    access_token = request.value;
  } else
  if (request.message == 'captureQuickUpload') {
    captureTab(sender.tab.windowId, request, function(result) {
      var params = { album_id: quickUploadAlbum };
      if (quickUploadOwner != 0) {
        params.group_id = -quickUploadOwner;
      }
      api('photos.getUploadServer', params, function(data) {
        if (data.response) {
          upload(result.blob, data.response.upload_url, result.url);
        }
      });
    });
  } else
  if (request.message == 'captureAttachPost' || request.message == 'captureAttachMessage') {
    captureTab(sender.tab.windowId, request, function(result) {
      attach(result.url, request.message == 'captureAttachPost');
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

chrome.tabs.onActivated.addListener(function(info) {
  chrome.tabs.get(info.tabId, function(tab){
    updateTumblrMenu(tab.url);  
  });
});

chrome.tabs.onUpdated.addListener(function(id,info,tab) {
  updateTumblrMenu(tab.url);
});

var updateTumblrMenu = function(url) {
  var a = document.createElement('a');
  a.href = url;
  triggerAttachTumblrPost(/tumblr\.com$/.test(a.hostname));
}
