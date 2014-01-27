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

root.innerHTML = '<img id="vkps_screenshot" width=100% height=100% style="position:absolute;left:0;top:0;right:0;bottom:0;z-index:-1"></canvas>\
<table cellspacing=0 cellpadding=0 width=100% height=100%><tr><td id="vkps_top" class="vkps_shadow" colspan=3></td></tr>\
<tr><td id="vkps_left" class="vkps_shadow">&nbsp;</td><td id="vkps_area">&nbsp;\
<div id="vkps_controls"></div>\
</td><td id="vkps_right" class="vkps_shadow">&nbsp;</td></tr>\
<tr><td class="vkps_shadow" colspan=3></td></tr></table>';
document.body.appendChild(root);

var screenshot = ge('vkps_screenshot');

chrome.runtime.sendMessage({ message: 'getCaptureParams' }, function(data) {
  var opts = data.opts;
  screenshot.src = data.screenshotSrc;

  var buttons = [];

  //if (opts.showAlbum) {
    for (var i = 0; i < opts.albums.length; i++) {
      if (isArray(opts.albums[i].album)) {
        buttons.push('<div class="vkps_submenu_wrap"><div id="vkps_upload' + i + '" class="vkps_button_blue"><div id="vkps_upload_btn">' + (opts.albums[i].group ? 'Загрузить в альбом группы «' + opts.albums[i].group.name + '» ▸' : 'Загрузить в свой альбом ▸') + '</div></div>');

        var submenu = [];
        for (var j = 0; j < opts.albums[i].album.length; j++) {
          submenu.push('<div id="vkps_upload' + i + '_subitem' + j + '" class="vkps_subitem">' + opts.albums[i].album[j].title + '</div>');
        }
        if (submenu.length == 0) {
          submenu.push('<div class="vkps_subitem disabled">Нет альбомов</div>');
        }
        buttons.push('<div id="vkps_upload' + i + '_submenu" class="vkps_submenu">' + submenu.join('') + '</div></div>');
      } else {
        buttons.push('<div id="vkps_upload' + i + '" class="vkps_button_blue"><div id="vkps_upload_btn">Загрузить в альбом «' + opts.albums[i].album.title + '»</div></div>');
      }
    }
  //}
  //if (opts.showMessage) {
    buttons.push('<div id="vkps_attach_message" class="vkps_button_blue"><div>Прикрепить к сообщению...</div></div>');
  //}
  //if (opts.showPost) {
    buttons.push('<div id="vkps_attach_post" class="vkps_button_blue"><div>Прикрепить к новой записи...</div></div>');
  //}

  buttons.push('<div id="vkps_save" class="vkps_button_blue"><div>Сохранить в файл</div></div>');
  buttons.push('<div id="vkps_cancel" class="vkps_button_gray"><div>Отмена</div></div>');

  ge('vkps_controls').innerHTML = buttons.join('');

  //if (opts.showAlbum) {
    for (var i = 0; i < opts.albums.length; i++) {
      var upload = ge('vkps_upload' + i);
      if (isArray(opts.albums[i].album)) {
        for (var j = 0; j < opts.albums[i].album.length; j++) {
          (function(i, j) {
            var subitem = ge('vkps_upload' + i + '_subitem' + j);
            subitem.onclick = function(e) {
              send('captureAlbum', { group: opts.albums[i].group, album: opts.albums[i].album[j] });
            }
          })(i, j);
        }
        (function(i) {
          var submenu = ge('vkps_upload' + i + '_submenu');
          submenu.onmousewheel = function(e) {
            e.stopPropagation();
          }
        })(i);
      } else {
        (function(i) {
          upload.onclick = function(e) {
            send('captureAlbum', { group: opts.albums[i].group, album: opts.albums[i].album });
          }
        })(i);
      }
    }
  //}

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

  var cancel = ge('vkps_cancel');
  cancel.onclick = function(e) {
    dismiss();
  }
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

function send(msg, extra) {
  var canvas = document.createElement('canvas');
  canvas.width = area.clientWidth * devicePixelRatio;
  canvas.height = area.clientHeight * devicePixelRatio;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(screenshot, - leftSide.clientWidth * devicePixelRatio, - topSide.clientHeight * devicePixelRatio);
  var message = {
    message: msg,
    screenshot: canvas.toDataURL('image/png')
  };
  if (extra) {
    for (var i in extra) {
      message[i] = extra[i];
    }
  }
  dismiss();
  chrome.runtime.sendMessage(message);
}

function ge(e) { return document.getElementById(e); }
function isArray(obj) { return Object.prototype.toString.call(obj) === '[object Array]'; }

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
document.body.style.overflow = 'hidden';

function dismiss() {
  window.removeEventListener('DOMMouseScroll', preventScroll, false);
  window.onmousewheel = document.onmousewheel = document.onkeydown = null;
  document.body.style.overflow = overflow;
  document.body.removeChild(root);
}

})();