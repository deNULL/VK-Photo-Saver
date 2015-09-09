if (!document.getElementById('vkps_injection')) {
  var e = document.createElement('script');
  e.id = 'vkps_injection';
  e.src = chrome.extension.getURL('vk-inject.js');
  document.head.appendChild(e);

  var dataUrlRequest = false;
  var dataUrlReady = false;

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.message == 'attachDataUrl') {
      dataUrlRequest = request;
      if (dataUrlReady) {
        window.postMessage(dataUrlRequest, '*');
      }
    }
  });

  window.addEventListener('message', function(event) {
    if (event.data.message == 'attachDataUrlReady') {
      dataUrlReady = true;
      if (dataUrlRequest) {
        window.postMessage(dataUrlRequest, '*');
      }
    } else
    if (event.data.message == 'attachDataUrlSuccess') {
      chrome.runtime.sendMessage(event.data);
    }
  });
}