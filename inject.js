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
  if (e.data && e.data.message == 'updateCaptureElement') {
    updateCursorPos(e.data.x, e.data.y, e.data.shift);
  }
}

var lastHovered = false;
var targetEl = false;
var lastDepth = 0;
var accumDelta = 0;
root.onmousemove = function(e) {
  updateCursorPos(e.x, e.y, e.shiftKey);
}
root.onmousewheel = function(e) {
  if (lastHovered) {
    accumDelta += e.deltaY;
    if (Math.abs(accumDelta) < 60) {
      return;
    }

    if (accumDelta < 0) {
      if (lastDepth > 0) {
        lastDepth--;
      } else {
        return;
      }
    } else {
      if (lastHovered.parentNode) {
        lastDepth++;
      } else {
        return;
      }
    }
    updateLastHovered();
    accumDelta = 0;
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
        lastDepth = 0;
        accumDelta = 0;
      }
    } else {
      if (el != lastHovered || targetEl) {
        targetEl = false;
        lastHovered = el;
        lastDepth = 0;
        accumDelta = 0;
      }
    }

    updateLastHovered();
  }
}
function getRect(el) {
  var rect = el.getBoundingClientRect();
  return {
    left: Math.min(Math.max(0, Math.min(rect.left, rect.right)), root.offsetWidth),
    right: Math.min(Math.max(0, Math.max(rect.left, rect.right)), root.offsetWidth),
    top: Math.min(Math.max(0, Math.min(rect.top, rect.bottom)), root.offsetHeight),
    bottom: Math.min(Math.max(0, Math.max(rect.top, rect.bottom)), root.offsetHeight),
  };
}
function updateLastHovered() {
  var el = lastHovered;
  if (!el) {
    return;
  }
  var rect;
  if (targetEl) {
    rect = getRect(el);
    var rect2 = getRect(targetEl);
    rect.left = Math.min(rect.left, rect2.left);
    rect.right = Math.max(rect.right, rect2.right);
    rect.top = Math.min(rect.top, rect2.top);
    rect.bottom = Math.max(rect.bottom, rect2.bottom);
  } else {
    for (var i = 0; i < lastDepth; i++) {
      if (el.parentNode) {
        el = el.parentNode;
      } else {
        lastDepth = i - 1;
        break;
      }
    }
    rect = getRect(el);
  }

  if ((rect.right - rect.left > 1) && (rect.bottom - rect.top > 1)) {
    root.contentWindow.postMessage({ message: 'updateCaptureBounds', x: rect.left, y: rect.top, w: rect.right - rect.left, h: rect.bottom - rect.top }, '*');
  } else {
    root.contentWindow.postMessage({ message: 'updateCaptureBounds', x: 0, y: 0, w: root.offsetWidth, h: root.offsetHeight }, '*');
  }
}

window.addEventListener("message", messageEvent, false);

})();