(function() {

var root;
if (root = ge('vkps_root')) {
  dismiss();
  return;
}

root = document.createElement('div');
root.id = 'vkps_root';
root.style.position = 'fixed';
root.style.left = '0';
root.style.top = '0';
root.style.right = '0';
root.style.bottom = '0';
root.style.zIndex = '100000000';
root.style.cursor = 'crosshair';

root.innerHTML = '<table cellspacing=0 cellpadding=0 width=100% height=100%><tr><td id="vkps_top" class="vkps_shadow" colspan=3></td></tr>\
<tr><td id="vkps_left" class="vkps_shadow">&nbsp;</td><td id="vkps_area">&nbsp;\
<div id="vkps_controls">\
<div id="vkps_quick_upload" class="vkps_button_blue"><button id="vkps_quick_upload_btn">Загрузить в альбом «...»</button></div>\
<div id="vkps_attach_post" class="vkps_button_blue"><button>Прикрепить к новой записи...</button></div>\
<div id="vkps_attach_message" class="vkps_button_blue"><button>Прикрепить к сообщению...</button></div>\
<div id="vkps_save" class="vkps_button_blue"><button>Сохранить в файл</button></div>\
<div id="vkps_cancel" class="vkps_button_gray"><button>Отмена</button></div>\
</div>\
</td><td id="vkps_right" class="vkps_shadow">&nbsp;</td></tr>\
<tr><td class="vkps_shadow" colspan=3></td></tr></table>';
document.body.appendChild(root);

chrome.runtime.sendMessage({ message: 'getParams' }, function(data) {
  ge('vkps_quick_upload_btn').innerHTML = 'Загрузить в альбом «' + data.qu_name + '»';
});

var pressed = false;
var x0 = 0;
var y0 = 0;

var leftSide = ge('vkps_left');
var rightSide = ge('vkps_right');
var topSide = ge('vkps_top');
var area = ge('vkps_area');

root.onmousedown = function(e) {
  if (e.button != 0) {
    dismiss();
    return false;
  }
  x0 = e.x, y0 = e.y;
  leftSide.style.width = e.x + 'px';
  topSide.style.height = e.y + 'px';
  area.style.width = '1px';
  area.style.height = '1px';
  controls.style.display = 'none';
  pressed = true;
  return false;
}

root.onmousemove = function(e) {
  if (pressed) {
    leftSide.style.width = Math.min(x0, e.x) + 'px';
    topSide.style.height = Math.min(y0, e.y) + 'px';
    area.style.width = Math.max(Math.max(x0, e.x) - Math.min(x0, e.x), 1) + 'px';
    area.style.height = Math.max(Math.max(y0, e.y) - Math.min(y0, e.y), 1) + 'px';
  }
}

root.onmouseup = function(e) {
  if (rightSide.clientWidth > 300) {
    controls.style.left = '100%';
    controls.style.right = 'auto';
    controls.style.top = '0px';
  } else
  if (leftSide.clientWidth > 300) {
    controls.style.left = 'auto';
    controls.style.right = '100%';
    controls.style.top = '0px';
  } else {
    controls.style.left = '0px';
    controls.style.right = 'auto';
    controls.style.top = '10px';
  }
  controls.style.display = 'block';
  if (area.clientWidth < 2 && area.clientHeight < 2) {
    dismiss();
  }
  pressed = false;
}

var controls = ge('vkps_controls');
controls.onmousedown = function(e) {
  e.stopPropagation();
  return false;
}

var quick_upload = ge('vkps_quick_upload');
quick_upload.onclick = function(e) {
  send('captureAlbum');
}

var attach_post = ge('vkps_attach_post');
attach_post.onclick = function(e) {
  send('captureAttachPost');
}

var attach_message = ge('vkps_attach_message');
attach_message.onclick = function(e) {
  send('captureAttachMessage');
}

var attach_save = ge('vkps_save');
attach_save.onclick = function(e) {
  send('captureSave');
}

function send(msg) {
  dismiss();
  chrome.runtime.sendMessage({
    message: msg,
    x: leftSide.clientWidth * devicePixelRatio,
    y: topSide.clientHeight * devicePixelRatio,
    w: area.clientWidth * devicePixelRatio,
    h: area.clientHeight * devicePixelRatio
  });
}

var cancel = ge('vkps_cancel');
cancel.onclick = function(e) {
  dismiss();
}

function ge(e) {
  return document.getElementById(e);
}

function preventDefault(e) {
  e = e || window.event;
  e.preventDefault();
  e.returnValue = false;
}

window.addEventListener('DOMMouseScroll', preventDefault, false);
window.onmousewheel = document.onmousewheel = preventDefault;
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

function dismiss() {
  window.removeEventListener('DOMMouseScroll', preventDefault, false);
  window.onmousewheel = document.onmousewheel = document.onkeydown = null;
  document.body.removeChild(root);
}

})();