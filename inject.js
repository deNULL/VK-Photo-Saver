(function() {

var root;
if (root = ge('vkps_root')) {
  dismiss();
  return;
}

root = document.createElement('iframe');
root.id = 'vkps_root';
root.style.position = 'fixed';
root.style.left = '0';
root.style.top = '0';
root.style.right = '0';
root.style.bottom = '0';
root.style.zIndex = '100000000';
root.style.cursor = 'crosshair';

root.src = chrome.extension.getURL('capture.html');
root.frameBorder = 0;
root.width = '100%';
root.height = '100%';
root.scrolling = 'no';
document.body.appendChild(root);

function ge(e) { return document.getElementById(e); }

function preventDefault(e) {
  e = e || window.event;
  e.preventDefault();
  e.returnValue = false;
}

function preventScroll(e) {
  if (e.target && e.target.classList.contains('vkps_subitem')) return;
  preventDefault(e);
}

window.addEventListener('DOMMouseScroll', preventScroll, false);
window.onmousewheel = document.onmousewheel = preventScroll;
document.onkeydown = function(e) {
  console.log(e);
  var keys = [37, 38, 39, 40];
  if (e.keyCode == 27) {
    dismiss();
  }
  for (var i = keys.length; i--;) {
    if (e.keyCode === keys[i]) {
      preventDefault(e);
      return;
    }
  }
}
var overflow = document.body.style.overflow;
var overflowDoc = document.documentElement.style.overflow;

function dismiss() {
  window.removeEventListener('DOMMouseScroll', preventScroll, false);
  window.removeEventListener('message', messageEvent, false);
  window.onmousewheel = document.onmousewheel = document.onkeydown = null;
  document.body.style.overflow = overflow;
  document.documentElement.style.overflow = overflowDoc;
  document.body.removeChild(root);
}

function messageEvent(e) {
  if (e.data == 'dismissPhotoSaver') {
    dismiss();
  }
  if (e.data == 'hideScrollBarPhotoSaver') {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }
}

window.addEventListener("message", messageEvent, false);

})();