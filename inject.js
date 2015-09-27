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
root.style.zIndex = '4294967297';
root.style.cursor = 'pointer';

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
  var keys = [37, 38, 39, 40, 32, 107, 109, 187, 189];
  if (e.keyCode == 27) {
    dismiss();
  } else
  if (e.keyCode == 109 || e.keyCode == 189) {
    padding = Math.max(0, padding - 4);
    updateLastHovered();
  } else
  if (e.keyCode == 107 || e.keyCode == 187) {
    padding += 4;
    updateLastHovered();
  } else
  if (e.keyCode == 32) {
    fullScreen = !fullScreen;
    updateLastHovered();
  } else
  if (e.keyCode == 72) {
    root.contentWindow.postMessage({ message: 'toggleHelp' }, '*');
    //console.log(e.keyCode);
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
  if (e.data && e.data.message == 'updateCaptureElement') {
    updateCursorPos(e.data.x, e.data.y, e.data.shift);
  }
}

var lastHovered = false;
var targetEl = false;
var padding = 0;
var fullScreen = false;
var accumDelta = 0;
root.onmousemove = function(e) {
  updateCursorPos(e.x, e.y, e.shiftKey);
  root.contentWindow.postMessage({ message: 'updateCursorPos', x: e.x, y: e.y }, '*');
}
root.onmousewheel = function(e) {
  if (lastHovered) {
    accumDelta += e.deltaY;
    if (accumDelta < -80) {
      padding = Math.max(0, padding - 4);
      accumDelta = 0;
    } else
    if (accumDelta > 80) {
      padding += 4;
      accumDelta = 0;
    }
    updateLastHovered();
  }
}
function updateCursorPos(x, y, shift) {
  root.style.visibility = 'hidden';
  var el = document.elementFromPoint(x, y);
  root.style.visibility = 'visible';
  if (el) {
    if (shift) {
      if (el != targetEl) {
        targetEl = el;
        fullScreen = false;
      }
    } else {
      if (el != lastHovered || targetEl) {
        targetEl = false;
        lastHovered = el;
        fullScreen = false;
      }
    }

    updateLastHovered();
  }
}
function getRect(el) {
  var rect = el.getBoundingClientRect();
  return {
    left: Math.ceil(Math.min(Math.max(0, Math.min(rect.left, rect.right)), root.offsetWidth)),
    right: Math.floor(Math.min(Math.max(0, Math.max(rect.left, rect.right)), root.offsetWidth)),
    top: Math.ceil(Math.min(Math.max(0, Math.min(rect.top, rect.bottom)), root.offsetHeight)),
    bottom: Math.floor(Math.min(Math.max(0, Math.max(rect.top, rect.bottom)), root.offsetHeight)),
  };
}
function updateLastHovered() {
  var el = lastHovered;
  if (!el) {
    return;
  }
  var rect = getRect(el);
  if (targetEl) {
    rect = getRect(el);
    var rect2 = getRect(targetEl);
    rect.left = Math.min(rect.left, rect2.left);
    rect.right = Math.max(rect.right, rect2.right);
    rect.top = Math.min(rect.top, rect2.top);
    rect.bottom = Math.max(rect.bottom, rect2.bottom);
  }
  rect.left = Math.floor(Math.max(0, rect.left - padding));
  rect.top = Math.floor(Math.max(0, rect.top - padding));
  rect.right = Math.ceil(Math.min(root.offsetWidth, rect.right + padding));
  rect.bottom = Math.ceil(Math.min(root.offsetHeight, rect.bottom + padding));
  if (fullScreen) {
    rect.left = 0;
    rect.right = root.offsetWidth;
    rect.top = 0;
    rect.bottom = root.offsetHeight;
  }

  if ((rect.right - rect.left > 1) && (rect.bottom - rect.top > 1)) {
    root.contentWindow.postMessage({ message: 'updateCaptureBounds', x: rect.left, y: rect.top, w: rect.right - rect.left, h: rect.bottom - rect.top }, '*');
  } else {
    root.contentWindow.postMessage({ message: 'updateCaptureBounds', x: 0, y: 0, w: root.offsetWidth, h: root.offsetHeight }, '*');
  }
}

window.addEventListener("message", messageEvent, false);

})();