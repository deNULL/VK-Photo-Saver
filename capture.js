var root = document.body;
var screenshot = ge('screenshot');
var overlay = ge('overlay');

function dismiss() {
  window.top.postMessage('dismissPhotoSaver', '*');
}

var controlsHeight = 0;
chrome.runtime.sendMessage({ message: 'getCaptureParams' }, function(data) {
  var opts = data.opts;
  var tabs = data.tabs;
  screenshot.onload = function() {
    screenshot.style.display = 'block';
    window.top.postMessage('hideScrollBarPhotoSaver', '*');
  }
  screenshot.src = data.screenshotSrc;

  var buttons = [];

  //if (opts.showAlbum) {
    for (var i = 0; i < opts.albums.length; i++) {
      if (isArray(opts.albums[i].album)) {
        buttons.push('<div class="submenu_wrap"><div id="upload' + i + '" class="button_blue"><div id="upload_btn">' + (opts.albums[i].group ? 'Загрузить в альбом группы «' + opts.albums[i].group.name + '» ▸' : 'Загрузить в свой альбом ▸') + '</div></div>');

        var submenu = [];
        for (var j = 0; j < opts.albums[i].album.length; j++) {
          if (!opts.albums[i].group || opts.albums[i].album[j].can_upload) {
            submenu.push('<div id="upload' + i + '_subitem' + j + '" class="subitem"><div class="thumb" style="background-image: url(' + opts.albums[i].album[j].thumb_src + ')"></div>' + opts.albums[i].album[j].title + '</div>');
          }
        }
        if (submenu.length == 0) {
          submenu.push('<div class="subitem disabled">Нет доступных альбомов</div>');
        }
        buttons.push('<div id="upload' + i + '_submenu" class="submenu">' + submenu.join('') + '</div></div>');
      } else {
        buttons.push('<div id="upload' + i + '" class="button_blue"><div id="upload_btn">Загрузить в альбом «' + opts.albums[i].album.title + '»</div></div>');
      }
    }
  //}
  //if (opts.showTabs) {
  for (var i = 0; i < tabs.length; i++) {
    buttons.push('<div id="attach_tab' + i + '" class="button_blue"><div>' + (tabs[i].wall ? ('Прикрепить к записи на стене «' + tabs[i].title + '»') : ('Прикрепить к диалогу «' + tabs[i].title + '»')) + '</div></div>');
  }
  //}
  //if (opts.showMessage) {
    buttons.push('<div id="attach_message" class="button_blue"><div>Прикрепить к сообщению...</div></div>');
  //}
  //if (opts.showPost) {
    buttons.push('<div id="attach_post" class="button_blue"><div>Прикрепить к новой записи...</div></div>');
  //}

  buttons.push('<div id="save" class="button_blue"><div>Сохранить в файл</div></div>');
  buttons.push('<div id="cancel" class="button_gray"><div>Отмена</div></div>');

  controls.innerHTML = buttons.join('');
  controlsHeight = controls.clientHeight;

  //if (opts.showAlbum) {
    for (var i = 0; i < opts.albums.length; i++) {
      var upload = ge('upload' + i);
      if (isArray(opts.albums[i].album)) {
        for (var j = 0; j < opts.albums[i].album.length; j++) {
          if (!opts.albums[i].group || opts.albums[i].album[j].can_upload) {
            (function(i, j) {
              var subitem = ge('upload' + i + '_subitem' + j);
              subitem.onclick = function(e) {
                send('captureAlbum', { group: opts.albums[i].group, album: opts.albums[i].album[j] });
              }
            })(i, j);
          }
        }
        (function(i) {
          var submenu = ge('upload' + i + '_submenu');
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
  //if (opts.showTabs) {
  for (var i = 0; i < tabs.length; i++) {
    var tab = ge('attach_tab' + i);
    (function(i) {
      tab.onclick = function(e) {
        send('captureTab', { tab: tabs[i].tab, wall: tabs[i].wall });
      }
    })(i);
  }
  //}

  var attach_post = ge('attach_post');
  attach_post.onclick = function(e) {
    send('captureAttachPost');
  }

  var attach_message = ge('attach_message');
  attach_message.onclick = function(e) {
    send('captureAttachMessage');
  }

  var attach_save = ge('save');
  attach_save.onclick = function(e) {
    send('captureSave');
  }

  var cancel = ge('cancel');
  cancel.onclick = function(e) {
    dismiss();
  }
});

var pos = {};
var drag = false;
var x0 = 0;
var y0 = 0;

var shadowL = ge('shadow_l'), shadowR = ge('shadow_r'), shadowT = ge('shadow_t'), shadowB = ge('shadow_b');
var edgeL = ge('edge_l'), edgeR = ge('edge_r'), edgeT = ge('edge_t'), edgeB = ge('edge_b');
var cornerTL = ge('corner_tl'), cornerTR = ge('corner_tr'), cornerBL = ge('corner_bl'), cornerBR = ge('corner_br');
var wrap = ge('wrap'), area = ge('area');

function updatePos(x, y, w, h) {
  pos = {x: x, y: y, w: w, h: h};
  var fw = window.innerWidth, fh = window.innerHeight;
  var rw = fw - (x + w), rh = fh - (y + h);
  shadowT.style.height = y + 'px';
  shadowL.style.top = wrap.style.top = shadowR.style.top = y + 'px';
  shadowL.style.height = wrap.style.height = shadowR.style.height = h + 'px';
  shadowL.style.width = x + 'px';
  wrap.style.left = x + 'px';
  wrap.style.width = w + 'px';
  shadowR.style.left = (x + w) + 'px';
  shadowR.style.width = rw + 'px';
  shadowB.style.top = (y + h) + 'px';
  shadowB.style.height = rh + 'px';

  //edgeT.style.width = area.style.width = edgeB.style.width = (w - 2) + 'px';
  //edgeL.style.height = area.style.height = edgeR.style.height = (h - 2) + 'px';
  //area.style.width = '1px';
  //area.style.height = '1px';
}

function updateControls() {
  if (shadowR.clientWidth > 300) {
    controls.style.left = '100%';
    controls.style.right = 'auto';
    controls.style.top = '0px';
  } else
  if (shadowL.clientWidth > 300) {
    controls.style.left = 'auto';
    controls.style.right = '100%';
    controls.style.top = '0px';
  } else {
    controls.style.left = '0px';
    controls.style.right = 'auto';
    controls.style.top = '10px';
  }

  if (controlsHeight > (wrap.clientHeight + shadowB.clientHeight)) {
    controls.style.top = 'auto';
    controls.style.bottom = '-12px';
  } else {
    controls.style.top = '0px';
    controls.style.bottom = 'auto';
  }
}

root.onmousedown = function(e) {
  if (e.button != 0) {
    dismiss();
    return false;
  }
  x0 = e.x, y0 = e.y;

  updatePos(e.x, e.y, 1, 1);
  overlay.style.cursor = 'crosshair';
  overlay.style.display = 'block';
  controls.style.display = 'none';
  drag = 'select';
  return false;
}

function startDrag(e, side) {
  e.stopPropagation();
  if (e.button != 0) {
    dismiss();
    return false;
  }

  overlay.style.cursor = getComputedStyle(e.target).cursor;
  overlay.style.display = 'block';
  controls.style.display = 'none';
  drag = side;
  return false;
}

edgeL.onmousedown = function(e) { return startDrag(e, 'left'); }
edgeR.onmousedown = function(e) { return startDrag(e, 'right'); }
edgeT.onmousedown = function(e) { return startDrag(e, 'top'); }
edgeB.onmousedown = function(e) { return startDrag(e, 'bottom'); }
cornerTL.onmousedown = function(e) { return startDrag(e, 'top-left'); }
cornerTR.onmousedown = function(e) { return startDrag(e, 'top-right'); }
cornerBL.onmousedown = function(e) { return startDrag(e, 'bottom-left'); }
cornerBR.onmousedown = function(e) { return startDrag(e, 'bottom-right'); }


root.onmousemove = function(e) {
  if (drag == 'select') {
    updatePos(
      Math.min(x0, e.x),
      Math.min(y0, e.y),
      Math.max(Math.max(x0, e.x) - Math.min(x0, e.x), 1),
      Math.max(Math.max(y0, e.y) - Math.min(y0, e.y), 1)
    );
  } else
  if (drag) {
    var x = pos.x, y = pos.y, w = pos.w, h = pos.h;
    var ax = e.x, ay = e.y;
    if (drag == 'left' || drag == 'top-left' || drag == 'bottom-left') {
      ax -= 2;

      if (ax >= pos.x + pos.w) {
        drag = drag.replace('left', 'right');
      }

      x = Math.min(pos.x + pos.w, ax);
      w = Math.max(pos.w + pos.x - x, 1);
    }
    if (drag == 'right' || drag == 'top-right' || drag == 'bottom-right') {
      ax += 2;

      if (ax <= pos.x) {
        drag = drag.replace('right', 'left');
      }

      x = Math.min(pos.x, ax);
      w = Math.max(pos.x, ax) - x;
    }
    if (drag == 'top' || drag == 'top-left' || drag == 'top-right') {
      ay -= 2;

      if (ay >= pos.y + pos.h) {
        drag = drag.replace('top', 'bottom');
      }

      y = Math.min(pos.y + pos.h, ay);
      h = Math.max(pos.h + pos.y - y, 1);
    }
    if (drag == 'bottom' || drag == 'bottom-left' || drag == 'bottom-right') {
      ay += 2;

      if (ay <= pos.y) {
        drag = drag.replace('bottom', 'top');
      }

      y = Math.min(pos.y, ay);
      h = Math.max(pos.y, ay) - y;
    }

    updatePos(x, y, w, h);
  }
}

root.onmouseup = function(e) {
  controls.style.display = 'block';
  updateControls();
  overlay.style.display = 'none';
  if (wrap.clientWidth < 2 && wrap.clientHeight < 2) {
    dismiss();
  }
  drag = false;
}

var controls = ge('controls');
controls.onmousedown = function(e) {
  e.stopPropagation();
  return false;
}

function send(msg, extra) {
  var canvas = document.createElement('canvas');
  canvas.width = wrap.clientWidth * devicePixelRatio;
  canvas.height = wrap.clientHeight * devicePixelRatio;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(screenshot, - shadowL.clientWidth * devicePixelRatio, - shadowT.clientHeight * devicePixelRatio);
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

updatePos(0, 0, window.innerWidth, window.innerHeight);
updateControls();