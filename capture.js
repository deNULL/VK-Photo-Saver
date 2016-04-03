var root = document.body;
var screenshot = ge('screenshot');
var overlay = ge('overlay');
var hint = ge('hint');
var actions = ge('actions');
var canvas = ge('canvas');
var tcanvas = ge('tcanvas');
var scale = Math.max(1, devicePixelRatio);

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
  buttons.push('<div id="info"><span id="size_src"></span><span id="scale">x1</span><span id="size_trg"></span></div>');

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
    buttons.push('<div id="attach_tab' + i + '" class="button_blue"><div>' +
      (tabs[i].type == "ticket" ? ('Прикрепить к вопросу «' + tabs[i].title + '»') :
       tabs[i].wall ? ('Прикрепить к записи на стене «' + tabs[i].title + '»') : ('Прикрепить к диалогу «' + tabs[i].title + '»')) + '</div></div>');
  }
  //}
  //if (opts.showMessage) {
    buttons.push('<div id="attach_message" class="button_blue"><div>Прикрепить к сообщению...</div></div>');
  //}
  //if (opts.showPost) {
    buttons.push('<div id="attach_post" class="button_blue"><div>Прикрепить к новой записи...</div></div>');
  //}

  //buttons.push('<div id="copy" class="button_blue"><div>Копировать</div></div>');
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
        send('captureTab', { tab: tabs[i].tab, wall: tabs[i].wall, target: tabs[i].target });
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

  /*var attach_copy = ge('copy');
  attach_copy.onclick = function(e) {
    send('captureCopy');
  }*/

  var cancel = ge('cancel');
  cancel.onclick = function(e) {
    dismiss();
  }
});

window.addEventListener('message', function(e) {
  if (e.data.message == 'updateCaptureBounds') {
    if (act == 'crop') {
      updateCrop(e.data.x, e.data.y, e.data.w, e.data.h);
    } else
    if (act == 'blur' || act == 'focus') {
      if (((e.data.x > pos.x && e.data.x < pos.x + pos.w && e.data.y > pos.y && e.data.y < pos.y + pos.h) ||
          (e.data.x + e.data.w > pos.x && e.data.x + e.data.w < pos.x + pos.w && e.data.y + e.data.h > pos.y && e.data.y + e.data.h < pos.y + pos.h)) &&
          (act != 'focus' || Math.sqrt(e.data.w * e.data.w + e.data.h * e.data.h) <= 180)) {
        updateRegion(act, e.data.x, e.data.y, e.data.x + e.data.w, e.data.y + e.data.h);
      } else {
        var ctx = tcanvas.getContext('2d');
        ctx.clearRect(0, 0, tcanvas.width, tcanvas.height);
      }
    }
  } else
  if (e.data.message == 'updateCursorPos') {
    updateCursorPos(e.data.x, e.data.y);
  } else
  if (e.data.message == 'toggleHelp') {
    hint.style.display = (hint.style.display == 'none') ? 'block' : 'none';
  }
}, false);

var pos = {};
var drag = false;
var selected = false;
var x0, y0;
var hist = [];

var shadowL = ge('shadow_l'), shadowR = ge('shadow_r'), shadowT = ge('shadow_t'), shadowB = ge('shadow_b');
var edgeL = ge('edge_l'), edgeR = ge('edge_r'), edgeT = ge('edge_t'), edgeB = ge('edge_b');
var cornerTL = ge('corner_tl'), cornerTR = ge('corner_tr'), cornerBL = ge('corner_bl'), cornerBR = ge('corner_br');
var wrap = ge('wrap'), area = ge('area');

function updateCrop(x, y, w, h) {
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

  updateScale();
}

function updateScale() {
  var sizeSrc, sizeTrg, sc;
  if (sizeSrc = ge('size_src')) {
    sizeSrc.innerHTML = pos.w + '×' + pos.h;
  }
  if (sc = ge('scale')) {
    sc.innerHTML = '×<b>' + scale + '</b>';
  }
  if (sizeTrg = ge('size_trg')) {
    sizeTrg.innerHTML = Math.floor(pos.w * scale) + '×' + Math.floor(pos.h * scale);
  }
}

function updateCursorPos(x, y) {
  if (y < hint.clientHeight + 100 && x > window.innerWidth - hint.clientWidth - 100) {
    hint.style.left = '16px';
    hint.style.right = 'auto';
  } else {
    hint.style.left = 'auto';
    hint.style.right = '16px';
  }
}

function updateControls() {
  var actionsOffset = 68;
  if (shadowT.clientHeight > 75) {
    actions.style.top = 'auto';
    actions.style.bottom = '100%';
    actionsOffset = 0;
  } else
  if (shadowR.clientWidth > 300) {
    actions.style.left = '100%';
    actions.style.right = 'auto';
    actions.style.top = '-14px';
    actions.style.bottom = 'auto';
    actions.style.marginLeft = '10px';
  } else
  if (shadowL.clientWidth > 300) {
    actions.style.left = 'auto';
    actions.style.right = '100%';
    actions.style.top = '-14px';
    actions.style.bottom = 'auto';
  } else {
    actions.style.left = '0px';
    actions.style.right = '100%';
    actions.style.top = '-10px';
    actions.style.bottom = 'auto';
    actions.style.marginLeft = '5px';
  }

  if (shadowR.clientWidth > 300) {
    controls.style.left = '100%';
    controls.style.right = 'auto';
    controls.style.top = (actionsOffset - 4) + 'px';
    controls.style.marginLeft = '10px';
  } else
  if (shadowL.clientWidth > 300) {
    controls.style.left = 'auto';
    controls.style.right = '100%';
    controls.style.top = (actionsOffset - 4) + 'px';
  } else {
    controls.style.left = '0px';
    controls.style.right = 'auto';
    controls.style.top = actionsOffset + 'px';
    controls.style.marginLeft = '5px';
  }

  if (controlsHeight > (wrap.clientHeight + shadowB.clientHeight)) {
    controls.style.top = 'auto';
    controls.style.bottom = '-12px';
  } else {
    controls.style.bottom = 'auto';
  }
}

function updateRegion(act, x0, y0, x1, y1, mouse) {
  if (act == 'blur') {
    var ctx = tcanvas.getContext('2d');
    //ctx.clearRect(0, 0, tcanvas.width, tcanvas.height);
    stackBlur(Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1) - Math.min(x0, x1), Math.max(y0, y1) - Math.min(y0, y1), 20);
  } else
  if (act == 'focus') {
    var zoom = 2;
    var cx = mouse ? x0 : (x0 + x1) * 0.5;
    var cy = mouse ? y0 : (y0 + y1) * 0.5;
    var r = (Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)) + (mouse ? 0 : 8)) * (mouse ? 1/zoom : 0.5);

    var ctx = tcanvas.getContext('2d');
    ctx.clearRect(0, 0, tcanvas.width, tcanvas.height);
    ctx.webkitImageSmoothingEnabled = true;//false;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, (r - 1) * zoom + Math.max(4, Math.min(10, r * 0.15)), 0, 2 * Math.PI);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.66)';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowColor = 'rgba(0, 0, 0, 0)';
    ctx.shadowBlur = 0;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, (r + 1) * zoom, 0, 2 * Math.PI);
    ctx.clip();
    ctx.drawImage(screenshot, cx - r - 1, cy - r - 1, r * 2 + 2, r * 2 + 2, cx - (r + 1) * zoom, cy - (r + 1) * zoom, (r + 1) * zoom * 2, (r + 1) * zoom * 2);
    ctx.restore();


    ctx.strokeStyle = '#486D92';
    ctx.lineWidth = Math.max(4, Math.min(10, r * 0.15));
    ctx.beginPath();
    ctx.arc(cx, cy, r * zoom + Math.max(4, Math.min(10, r * 0.15)) * 0.5, 0, 2 * Math.PI);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.33)';
    ctx.shadowBlur = 30;
    ctx.stroke();
    ctx.shadowColor = 'rgba(0, 0, 0, 0)';
    ctx.shadowBlur = 0;
  } else
  if (act && act.indexOf('_') > -1) {
    var parts = act.split('_');
    var color = colors[parts[1]];

    var ctx = tcanvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.clearRect(0, 0, tcanvas.width, tcanvas.height);

    if (parts[0] == 'pen') {
      hist.push([x1, y1]);
      var used = new Array(hist.length);
      function checkRange(st, en, it) {
        if (en <= st) {
          return;
        }
        var len = Math.sqrt((hist[en][0] - hist[st][0]) * (hist[en][0] - hist[st][0]) + (hist[en][1] - hist[st][1]) * (hist[en][1] - hist[st][1]));
        var maxi = -1;
        var centi = -1;
        var maxdist = 0;
        var centdist = 0;
        var MIN_DIST = 25.0;
        for (var i = st + 1; i < en; i++) {
          var dist0 = Math.sqrt((hist[i][0] - hist[st][0]) * (hist[i][0] - hist[st][0]) + (hist[i][1] - hist[st][1]) * (hist[i][1] - hist[st][1]));
          var dist1 = Math.sqrt((hist[en][0] - hist[i][0]) * (hist[en][0] - hist[i][0]) + (hist[en][1] - hist[i][1]) * (hist[en][1] - hist[i][1]));
          if (dist0 < MIN_DIST || dist1 < MIN_DIST) {
            continue;
          }
          var dist = distToSegment(hist[i][0], hist[i][1], hist[st][0], hist[st][1], hist[en][0], hist[en][1]);
          if (maxi == -1 || maxdist < dist) {
            maxi = i;
            maxdist = dist;
          }
          if (centi == -1 || centdist < dist0 + dist1) {
            centi = i;
            centdist = dist0 + dist1;
          }
        }

        if (maxi > -1 && (maxdist > Math.max(len * 0.1, 4))) {
          used[maxi] = {it: it, d: Math.round(maxdist * 1000) / 1000.0, len: Math.round(len * 0.15 * 1000) / 1000.0 };
          checkRange(st, maxi, it + 1);
          checkRange(maxi, en, it + 1);
        } else
        if (centi > -1 && (len > 150)) {
          used[centi] = {it: -it, d: Math.round(centdist * 1000) / 1000.0, len: Math.round(len * 1000) / 1000.0 };
          checkRange(st, centi, it + 1);
          checkRange(centi, en, it + 1);
        }
      }
      // Computes distance from point (x, y) to segment (x1, y1) - (x2, y2)
      function distToSegment(x, y, x1, y1, x2, y2) {
        var vx = x2 - x1;
        var vy = y2 - y1;
        var wx = x - x1;
        var wy = y - y1;

        var c1 = vx * wx + vy * wy;
        if (c1 <= 0) {
          return Math.sqrt(wx * wx + wy * wy);
        }

        var c2 = vx * vx + vy * vy;
        if (c2 <= c1) {
          return Math.sqrt((x - x2) * (x - x2) + (y - y2) * (y - y2));
        }

        var px = x1 + vx * c1 / c2;
        var py = y1 + vy * c1 / c2;
        return Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
      }
      used[0] = true;
      used[hist.length - 1] = true;
      for (var i = 0; i < hist.length; i += 92) {
        used[i] = true;
        used[Math.min(hist.length - 1, i + 92)] = true;
        checkRange(i, Math.min(hist.length - 1, i + 92), 0);
      }
      //checkRange(0, hist.length - 1);
      var filtered = [];
      for (var i = 0; i < hist.length; i++) {
        if (used[i]) {
          if (i == hist.length - 1) {
            if (filtered.length == 1) {
              var len = Math.sqrt(
                (hist[i][0] - hist[0][0]) * (hist[i][0] - hist[0][0]) +
                (hist[i][1] - hist[0][1]) * (hist[i][1] - hist[0][1]));

              filtered.push({
                x: hist[i][0] * 0.33333 + hist[0][0] * 0.66666 + (Math.random() - 0.5) * len * 0.02,
                y: hist[i][1] * 0.33333 + hist[0][1] * 0.66666 + (Math.random() - 0.5) * len * 0.02 });
              filtered.push({
                x: hist[i][0] * 0.66666 + hist[0][0] * 0.33333 + (Math.random() - 0.5) * len * 0.02,
                y: hist[i][1] * 0.66666 + hist[0][1] * 0.33333 + (Math.random() - 0.5) * len * 0.02 });
            } else
            if (filtered.length == 2) {
              filtered.splice(1, 0, {
                x: filtered[1].x * 0.5 + hist[0][0] * 0.5,
                y: filtered[1].y * 0.5 + hist[0][1] * 0.5 });
              filtered.push({
                x: hist[i][0] * 0.5 + filtered[2].x * 0.5,
                y: hist[i][1] * 0.5 + filtered[2].y * 0.5 });
            }
          }
          /*if (filtered.length > 0) {
            var last = filtered[filtered.length - 1];
            var len =
              Math.sqrt(
                  (hist[i][0] - last.x) * (hist[i][0] - last.x) +
                  (hist[i][1] - last.y) * (hist[i][1] - last.y));
            var subd = Math.floor(len / 200);
            var sub = len / subd;
            for (var j = subd - 1; j >= 0; j--) { // Subdivide segment
              filtered.push({
                x: last.x * (j + 1) / (subd + 1) + hist[i][0] * (subd - j) / (subd + 1),
                y: last.y * (j + 1) / (subd + 1) + hist[i][1] * (subd - j) / (subd + 1) });
            }
          }*/
          filtered.push({ x: hist[i][0], y: hist[i][1], step: used[i] });
        }
      }

      var totallen = 0;

      //console.group();
      for (var i = 0; i < filtered.length; i++) {
        // Angle to previous / next vertice
        filtered[i].alpha = [
          (i > 0) ? Math.atan2(filtered[i - 1].y - filtered[i].y, filtered[i - 1].x - filtered[i].x) : 0,
          (i < filtered.length - 1) ? Math.atan2(filtered[i + 1].y - filtered[i].y, filtered[i + 1].x - filtered[i].x) : 0];
        if (i == 0) {
          filtered[i].alpha[0] = filtered[i].alpha[1] + (filtered[i].alpha[1] > 0 ? -Math.PI : Math.PI);
        }
        if (i == filtered.length - 1) {
          filtered[i].alpha[1] = filtered[i].alpha[0] + (filtered[i].alpha[0] > 0 ? -Math.PI : Math.PI);
        }
        filtered[i].diff = Math.abs(filtered[i].alpha[0] - filtered[i].alpha[1]);
        var avg = (filtered[i].alpha[0] + filtered[i].alpha[1]) * 0.5;
        // First normal should be looking outside, second - inside
        if (filtered[i].diff > Math.PI) {
          filtered[i].normal = [avg, avg + (avg < 0 ? Math.PI : -Math.PI)];
          filtered[i].diff = Math.PI * 2 - filtered[i].diff;
        } else {
          filtered[i].normal = [avg + (avg < 0 ? Math.PI : -Math.PI), avg];
        }
        // Length of previous / next segment
        filtered[i].len = [
          (i > 0) ? Math.sqrt(
            (filtered[i].x - filtered[i - 1].x) * (filtered[i].x - filtered[i - 1].x) +
            (filtered[i].y - filtered[i - 1].y) * (filtered[i].y - filtered[i - 1].y)) : 15,
          (i < filtered.length - 1) ?
            Math.sqrt(
              (filtered[i].x - filtered[i + 1].x) * (filtered[i].x - filtered[i + 1].x) +
              (filtered[i].y - filtered[i + 1].y) * (filtered[i].y - filtered[i + 1].y)) : 15];
        totallen += filtered[i].len[1];
      }
      if (filtered.length > 0) {
        totallen += filtered[0].len[0];
      }
      for (var i = 0; i < filtered.length; i++) {


        /*filtered[i].w = (i == filtered.length - 1 || i == 0) ? 0 :
          Math.min(filtered[i].diff * filtered[i].diff * filtered[i].diff * 0.08,
            filtered[i].len[0] * 0.04,
            filtered[i].len[1] * 0.04);*/
        var cnt = 1;
        filtered[i].avgdiff = filtered[i].diff * 1;
        for (var j = -2; j <= 2; j++) {
          if (i + j >= 0 && i + j <= filtered.length - 1) {
            var w = (j == -2 || j == 2) ? 0.5 : 1;
            cnt += w;
            filtered[i].avgdiff += filtered[i + j].diff * w;
          }
        }
        filtered[i].avgdiff /= cnt;

        filtered[i].w = Math.min(1.2, Math.max(0.3, (2.9 - filtered[i].avgdiff) / (2.9 - 2.2)));

        filtered[i].w *= Math.max(2, Math.min(5, totallen * 0.002));

        // lnormal is on the left-hand side, rnormal is on the right-hand side (going from previous vertice to the next)
        if ((filtered[i].alpha[0] >= filtered[i].normal[0] && filtered[i].normal[0] >= filtered[i].alpha[1]) ||
            (filtered[i].alpha[0] < filtered[i].alpha[1] && (filtered[i].alpha[0] >= filtered[i].normal[0] || filtered[i].normal[0] >= filtered[i].alpha[1]))) {
          filtered[i].lnormal = filtered[i].normal[0];
          filtered[i].rnormal = filtered[i].normal[1];
        } else {
          filtered[i].lnormal = filtered[i].normal[1];
          filtered[i].rnormal = filtered[i].normal[0];
        }

        filtered[i].tangent = [
            filtered[i].lnormal + (filtered[i].lnormal < Math.PI * 1.5 ? (Math.PI * 0.5) : (-Math.PI * 1.5)),
            filtered[i].lnormal + (filtered[i].lnormal > -Math.PI * 1.5 ? (-Math.PI * 0.5) : (Math.PI * 1.5))];

        filtered[i].lx = (filtered[i].x + Math.cos(filtered[i].lnormal) * filtered[i].w);
        filtered[i].ly = (filtered[i].y + Math.sin(filtered[i].lnormal) * filtered[i].w);
        filtered[i].rx = (filtered[i].x + Math.cos(filtered[i].rnormal) * filtered[i].w);
        filtered[i].ry = (filtered[i].y + Math.sin(filtered[i].rnormal) * filtered[i].w);

        //console.log(filtered[i]);
        filtered[i].sharp = (filtered[i].diff < 0.25);
      }
      //console.groupEnd();

      var CP_DIST = 0.35;

      ctx.lineWidth = 1;
      ctx.strokeStyle = '#' + color;
      ctx.fillStyle = '#' + color;
      ctx.beginPath();
      ctx.moveTo(filtered[0].lx, filtered[0].ly);
      for (var i = 1; i < filtered.length; i++) {
        ctx.bezierCurveTo(
          filtered[i - 1].lx + Math.cos(filtered[i - 1].sharp ? filtered[i - 1].alpha[1] : filtered[i - 1].tangent[1]) * filtered[i - 1].len[1] * CP_DIST,
          filtered[i - 1].ly + Math.sin(filtered[i - 1].sharp ? filtered[i - 1].alpha[1] : filtered[i - 1].tangent[1]) * filtered[i - 1].len[1] * CP_DIST,
          filtered[i].lx + Math.cos(filtered[i].sharp ? filtered[i].alpha[0] : filtered[i].tangent[0]) * filtered[i].len[0] * CP_DIST,
          filtered[i].ly + Math.sin(filtered[i].sharp ? filtered[i].alpha[0] : filtered[i].tangent[0]) * filtered[i].len[0] * CP_DIST,
          filtered[i].lx, filtered[i].ly);
      }
      ctx.bezierCurveTo(
          filtered[filtered.length - 1].lx + Math.cos(filtered[filtered.length - 1].sharp ? filtered[filtered.length - 1].alpha[1] : filtered[filtered.length - 1].tangent[1]) * filtered[filtered.length - 1].len[1] * CP_DIST,
          filtered[filtered.length - 1].ly + Math.sin(filtered[filtered.length - 1].sharp ? filtered[filtered.length - 1].alpha[1] : filtered[filtered.length - 1].tangent[1]) * filtered[filtered.length - 1].len[1] * CP_DIST,
          filtered[filtered.length - 1].rx + Math.cos(filtered[filtered.length - 1].sharp ? filtered[filtered.length - 1].alpha[1] : filtered[filtered.length - 1].tangent[1]) * filtered[filtered.length - 1].len[1] * CP_DIST,
          filtered[filtered.length - 1].ry + Math.sin(filtered[filtered.length - 1].sharp ? filtered[filtered.length - 1].alpha[1] : filtered[filtered.length - 1].tangent[1]) * filtered[filtered.length - 1].len[1] * CP_DIST,
          filtered[filtered.length - 1].rx, filtered[filtered.length - 1].ry);
      for (var i = filtered.length - 2; i >= 0; i--) {
        ctx.bezierCurveTo(
          filtered[i + 1].rx + Math.cos(filtered[i + 1].sharp ? filtered[i + 1].alpha[0] : filtered[i + 1].tangent[0]) * filtered[i + 1].len[0] * CP_DIST,
          filtered[i + 1].ry + Math.sin(filtered[i + 1].sharp ? filtered[i + 1].alpha[0] : filtered[i + 1].tangent[0]) * filtered[i + 1].len[0] * CP_DIST,
          filtered[i].rx + Math.cos(filtered[i].sharp ? filtered[i].alpha[1] : filtered[i].tangent[1]) * filtered[i].len[1] * CP_DIST,
          filtered[i].ry + Math.sin(filtered[i].sharp ? filtered[i].alpha[1] : filtered[i].tangent[1]) * filtered[i].len[1] * CP_DIST,
          filtered[i].rx, filtered[i].ry);
      }
      ctx.bezierCurveTo(
          filtered[0].rx + Math.cos(filtered[0].sharp ? filtered[0].alpha[0] : filtered[0].tangent[0]) * filtered[0].len[0] * CP_DIST,
          filtered[0].ry + Math.sin(filtered[0].sharp ? filtered[0].alpha[0] : filtered[0].tangent[0]) * filtered[0].len[0] * CP_DIST,
          filtered[0].lx + Math.cos(filtered[0].sharp ? filtered[0].alpha[0] : filtered[0].tangent[0]) * filtered[0].len[0] * CP_DIST,
          filtered[0].ly + Math.sin(filtered[0].sharp ? filtered[0].alpha[0] : filtered[0].tangent[0]) * filtered[0].len[0] * CP_DIST,
          filtered[0].lx, filtered[0].ly);
      ctx.fill();
      //ctx.stroke();

/*
      for (var i = 0; i < hist.length; i++) {
        // Blue: Source points (unfiltered)
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';
        ctx.arc(hist[i][0], hist[i][1], 1.0, 0, 2 * Math.PI);
        ctx.fill();
      }
      for (var i = 0; i < filtered.length; i++) {
        // Black lines: Control points for Bezier curves
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(filtered[i].lx, filtered[i].ly);
        ctx.lineTo(filtered[i].lx + Math.cos(filtered[i].tangent[0]) * filtered[i].len[0] * CP_DIST, filtered[i].ly + Math.sin(filtered[i].tangent[0]) * filtered[i].len[0] * CP_DIST);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(filtered[i].lx, filtered[i].ly);
        ctx.lineTo(filtered[i].lx + Math.cos(filtered[i].tangent[1]) * filtered[i].len[1] * CP_DIST, filtered[i].ly + Math.sin(filtered[i].tangent[1]) * filtered[i].len[1] * CP_DIST);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.moveTo(filtered[i].rx, filtered[i].ry);
        ctx.lineTo(filtered[i].rx + Math.cos(filtered[i].tangent[0]) * filtered[i].len[0] * CP_DIST, filtered[i].ry + Math.sin(filtered[i].tangent[0]) * filtered[i].len[0] * CP_DIST);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(filtered[i].rx, filtered[i].ry);
        ctx.lineTo(filtered[i].rx + Math.cos(filtered[i].tangent[1]) * filtered[i].len[1] * CP_DIST, filtered[i].ry + Math.sin(filtered[i].tangent[1]) * filtered[i].len[1] * CP_DIST);
        ctx.stroke();

        // Brown lines: Normals (outside darker, inside lighter)
        ctx.strokeStyle = 'rgba(90, 50, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(filtered[i].x, filtered[i].y);
        ctx.lineTo(filtered[i].x + Math.cos(filtered[i].normal[0]) * 15, filtered[i].y + Math.sin(filtered[i].normal[0]) * 15);

        ctx.strokeStyle = 'rgba(120, 80, 0, 0.6)';
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(filtered[i].x, filtered[i].y);
        ctx.lineTo(filtered[i].x + Math.cos(filtered[i].normal[1]) * 15, filtered[i].y + Math.sin(filtered[i].normal[1]) * 15);
        ctx.stroke();

        // Black: Left and right edges of the stroke
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.arc(filtered[i].lx, filtered[i].ly, 1.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.arc(filtered[i].rx, filtered[i].ry, 1.5, 0, 2 * Math.PI);
        ctx.fill();

        // Green: Middle point of the stroke
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 200, 0, 0.7)';
        ctx.arc(filtered[i].x, filtered[i].y, 1.5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.font = '10px Verdana';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillText('∠ ' + Math.round(filtered[i].diff * 1000.0) / 1000.0 + ' (avg ' + Math.round(filtered[i].avgdiff * 1000.0) / 1000.0 + ')', filtered[i].x + 2, filtered[i].y);
        //ctx.fillText('#' + (filtered[i].step === undefined ? 'AUX' : (filtered[i].step === true ? 'CP' : (filtered[i].step.it + ' (D=' + filtered[i].step.d + ', len=' + filtered[i].step.len + ')'))), filtered[i].x + 2, filtered[i].y + 9);
      }
*/
    } else
    if (parts[0] == 'arrow') {
      var len = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
      function arrow(x0, y0, x1, y1) {
        var angle = Math.atan2(y1 - y0, x1 - x0);
        var midp = [x1 * 0.6 + x0 * 0.4, y1 * 0.6 + y0 * 0.4];
        var dir = Math.cos(angle) > 0 ? -1 : 1;

        var curvedist = Math.max(5, Math.min(64, len * 0.11));
        var curvewidth = Math.min(4, len * 0.01);

        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(
          midp[0] + Math.cos(angle + Math.PI * 0.5 * dir) * (curvedist + curvewidth),
          midp[1] + Math.sin(angle + Math.PI * 0.5 * dir) * (curvedist + curvewidth),
          x1, y1);
        ctx.quadraticCurveTo(
          midp[0] + Math.cos(angle + Math.PI * 0.5 * dir) * (curvedist - curvewidth),
          midp[1] + Math.sin(angle + Math.PI * 0.5 * dir) * (curvedist - curvewidth),
          x0, y0);
        ctx.fill();
        ctx.stroke();

        var arrlen = Math.min(len * 0.6, Math.max(30, Math.min(52, len * 0.2)));

        function quadratic(p0, p1, p2, t) {
          return (1 - t) * ((1 - t) * p0 + t * p1) + t * ((1 - t) * p1 + t * p2);
        }

        var angle2 = Math.atan2(
          quadratic(y0, midp[1] + Math.sin(angle + Math.PI * 0.5 * dir) * curvedist, y1, 1 - arrlen / len) - y1,
          quadratic(x0, midp[0] + Math.cos(angle + Math.PI * 0.5 * dir) * curvedist, x1, 1 - arrlen / len) - x1
        );

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(
          x1 + Math.cos(angle2 - Math.PI * 0.04) * arrlen,
          y1 + Math.sin(angle2 - Math.PI * 0.04) * arrlen);
        ctx.lineTo(
          quadratic(x0, midp[0] + Math.cos(angle + Math.PI * 0.5 * dir) * curvedist, x1, 1 - arrlen * 0.8 / len),
          quadratic(y0, midp[1] + Math.sin(angle + Math.PI * 0.5 * dir) * curvedist, y1, 1 - arrlen * 0.8 / len));
        ctx.lineTo(
          x1 + Math.cos(angle2 + Math.PI * 0.04) * arrlen,
          y1 + Math.sin(angle2 + Math.PI * 0.04) * arrlen);
        ctx.lineTo(x1, y1);
        ctx.fill();
        ctx.stroke();
      }

      ctx.lineWidth = 8;
      ctx.strokeStyle = (parts[1] == 'yellow') ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.4)';
      ctx.fillStyle = (parts[1] == 'yellow') ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.4)';
      arrow(x0, y0, x1, y1);

      ctx.lineWidth = 3;
      ctx.strokeStyle = '#' + color;
      ctx.fillStyle = '#' + color;
      arrow(x0, y0, x1, y1);
    }
  } else
  if (drag == 'crop') {
    updateCrop(Math.min(x0, x1), Math.min(y0, y1), Math.max(Math.abs(x1 - x0), 1), Math.max(Math.abs(y1 - y0), 1));
  } else {
    return false;
  }
  return true;
}

root.onmousedown = function(e) {
  if (e.button != 0) {
    dismiss();
    return false;
  }
  x0 = e.x, y0 = e.y;
  hist = [[x0, y0]];

  //updateCrop(e.x, e.y, 1, 1);
  overlay.style.cursor = 'crosshair';
  overlay.style.display = 'block';
  controls.style.display = 'none';
  actions.style.display = 'none';
  hint.style.display = 'none';
  drag = act;
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
  actions.style.display = 'none';
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
  updateCursorPos(e.x, e.y);
  var len = Math.sqrt((e.x - x0) * (e.x - x0) + (e.y - y0) * (e.y - y0));
  if (len < 3) {
    return;
  }
  if (!drag) {
    window.top.postMessage({ message: 'updateCaptureElement', x: e.x, y: e.y, shift: e.shiftKey }, '*');
  } else
  if (!updateRegion(drag, x0, y0, e.x, e.y, true)) {
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

    updateCrop(x, y, w, h);
  }
}

var mul_table = [
  512,512,456,512,328,456,335,512,405,328,271,456,388,335,292,512,
  454,405,364,328,298,271,496,456,420,388,360,335,312,292,273,512,
  482,454,428,405,383,364,345,328,312,298,284,271,259,496,475,456,
  437,420,404,388,374,360,347,335,323,312,302,292,282,273,265,512,
  497,482,468,454,441,428,417,405,394,383,373,364,354,345,337,328,
  320,312,305,298,291,284,278,271,265,259,507,496,485,475,465,456,
  446,437,428,420,412,404,396,388,381,374,367,360,354,347,341,335,
  329,323,318,312,307,302,297,292,287,282,278,273,269,265,261,512,
  505,497,489,482,475,468,461,454,447,441,435,428,422,417,411,405,
  399,394,389,383,378,373,368,364,359,354,350,345,341,337,332,328,
  324,320,316,312,309,305,301,298,294,291,287,284,281,278,274,271,
  268,265,262,259,257,507,501,496,491,485,480,475,470,465,460,456,
  451,446,442,437,433,428,424,420,416,412,408,404,400,396,392,388,
  385,381,377,374,370,367,363,360,357,354,350,347,344,341,338,335,
  332,329,326,323,320,318,315,312,310,307,304,302,299,297,294,292,
  289,287,285,282,280,278,275,273,271,269,267,265,263,261,259];

var shg_table = [
  9, 11, 12, 13, 13, 14, 14, 15, 15, 15, 15, 16, 16, 16, 16, 17,
  17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18, 18, 18, 18, 19,
  19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 20, 20, 20,
  20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 21,
  21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 21,
  21, 21, 21, 21, 21, 21, 21, 21, 21, 21, 22, 22, 22, 22, 22, 22,
  22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22,
  22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 22, 23,
  23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
  23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
  23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23, 23,
  23, 23, 23, 23, 23, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24,
  24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24 ];


function stackBlur(top_x, top_y, width, height, radius) {
  function BlurStack() {
    this.r = 0;
    this.g = 0;
    this.b = 0;
    this.a = 0;
    this.next = null;
  }

  if (isNaN(radius) || radius < 1 || width < 1 || height < 1) return;
  radius |= 0;

  var context = tcanvas.getContext('2d');
  context.drawImage(screenshot, 0, 0);
  var imageData = context.getImageData(top_x, top_y, width, height);
  var pixels = imageData.data;

  var x, y, i, p, yp, yi, yw, r_sum, g_sum, b_sum,
  r_out_sum, g_out_sum, b_out_sum,
  r_in_sum, g_in_sum, b_in_sum,
  pr, pg, pb, rbs;

  var div = radius + radius + 1;
  var w4 = width << 2;
  var widthMinus1  = width - 1;
  var heightMinus1 = height - 1;
  var radiusPlus1  = radius + 1;
  var sumFactor = radiusPlus1 * ( radiusPlus1 + 1 ) / 2;

  var stackStart = new BlurStack();
  var stack = stackStart;
  for (i = 1; i < div; i++) {
    stack = stack.next = new BlurStack();
    if (i == radiusPlus1) {
      var stackEnd = stack;
    }
  }
  stack.next = stackStart;
  var stackIn = null;
  var stackOut = null;

  yw = yi = 0;

  var mul_sum = mul_table[radius];
  var shg_sum = shg_table[radius];

  for (y = 0; y < height; y++) {
    r_in_sum = g_in_sum = b_in_sum = r_sum = g_sum = b_sum = 0;

    r_out_sum = radiusPlus1 * ( pr = pixels[yi] );
    g_out_sum = radiusPlus1 * ( pg = pixels[yi+1] );
    b_out_sum = radiusPlus1 * ( pb = pixels[yi+2] );

    r_sum += sumFactor * pr;
    g_sum += sumFactor * pg;
    b_sum += sumFactor * pb;

    stack = stackStart;

    for (i = 0; i < radiusPlus1; i++) {
      stack.r = pr;
      stack.g = pg;
      stack.b = pb;
      stack = stack.next;
    }

    for (i = 1; i < radiusPlus1; i++) {
      p = yi + (( widthMinus1 < i ? widthMinus1 : i ) << 2 );
      r_sum += ( stack.r = ( pr = pixels[p])) * ( rbs = radiusPlus1 - i );
      g_sum += ( stack.g = ( pg = pixels[p+1])) * rbs;
      b_sum += ( stack.b = ( pb = pixels[p+2])) * rbs;

      r_in_sum += pr;
      g_in_sum += pg;
      b_in_sum += pb;

      stack = stack.next;
    }


    stackIn = stackStart;
    stackOut = stackEnd;
    for (x = 0; x < width; x++) {
      pixels[yi]   = (r_sum * mul_sum) >> shg_sum;
      pixels[yi+1] = (g_sum * mul_sum) >> shg_sum;
      pixels[yi+2] = (b_sum * mul_sum) >> shg_sum;

      r_sum -= r_out_sum;
      g_sum -= g_out_sum;
      b_sum -= b_out_sum;

      r_out_sum -= stackIn.r;
      g_out_sum -= stackIn.g;
      b_out_sum -= stackIn.b;

      p =  ( yw + ( ( p = x + radius + 1 ) < widthMinus1 ? p : widthMinus1 ) ) << 2;

      r_in_sum += ( stackIn.r = pixels[p]);
      g_in_sum += ( stackIn.g = pixels[p+1]);
      b_in_sum += ( stackIn.b = pixels[p+2]);

      r_sum += r_in_sum;
      g_sum += g_in_sum;
      b_sum += b_in_sum;

      stackIn = stackIn.next;

      r_out_sum += ( pr = stackOut.r );
      g_out_sum += ( pg = stackOut.g );
      b_out_sum += ( pb = stackOut.b );

      r_in_sum -= pr;
      g_in_sum -= pg;
      b_in_sum -= pb;

      stackOut = stackOut.next;

      yi += 4;
    }
    yw += width;
  }


  for (x = 0; x < width; x++) {
    g_in_sum = b_in_sum = r_in_sum = g_sum = b_sum = r_sum = 0;

    yi = x << 2;
    r_out_sum = radiusPlus1 * ( pr = pixels[yi]);
    g_out_sum = radiusPlus1 * ( pg = pixels[yi+1]);
    b_out_sum = radiusPlus1 * ( pb = pixels[yi+2]);

    r_sum += sumFactor * pr;
    g_sum += sumFactor * pg;
    b_sum += sumFactor * pb;

    stack = stackStart;

    for (i = 0; i < radiusPlus1; i++) {
      stack.r = pr;
      stack.g = pg;
      stack.b = pb;
      stack = stack.next;
    }

    yp = width;

    for (i = 1; i <= radius; i++) {
      yi = ( yp + x ) << 2;

      r_sum += ( stack.r = ( pr = pixels[yi])) * ( rbs = radiusPlus1 - i );
      g_sum += ( stack.g = ( pg = pixels[yi+1])) * rbs;
      b_sum += ( stack.b = ( pb = pixels[yi+2])) * rbs;

      r_in_sum += pr;
      g_in_sum += pg;
      b_in_sum += pb;

      stack = stack.next;

      if (i < heightMinus1) {
        yp += width;
      }
    }

    yi = x;
    stackIn = stackStart;
    stackOut = stackEnd;
    for (y = 0; y < height; y++) {
      p = yi << 2;
      pixels[p]   = (r_sum * mul_sum) >> shg_sum;
      pixels[p+1] = (g_sum * mul_sum) >> shg_sum;
      pixels[p+2] = (b_sum * mul_sum) >> shg_sum;

      r_sum -= r_out_sum;
      g_sum -= g_out_sum;
      b_sum -= b_out_sum;

      r_out_sum -= stackIn.r;
      g_out_sum -= stackIn.g;
      b_out_sum -= stackIn.b;

      p = ( x + (( ( p = y + radiusPlus1) < heightMinus1 ? p : heightMinus1 ) * width )) << 2;

      r_sum += ( r_in_sum += ( stackIn.r = pixels[p]));
      g_sum += ( g_in_sum += ( stackIn.g = pixels[p+1]));
      b_sum += ( b_in_sum += ( stackIn.b = pixels[p+2]));

      stackIn = stackIn.next;

      r_out_sum += ( pr = stackOut.r );
      g_out_sum += ( pg = stackOut.g );
      b_out_sum += ( pb = stackOut.b );

      r_in_sum -= pr;
      g_in_sum -= pg;
      b_in_sum -= pb;

      stackOut = stackOut.next;

      yi += width;
    }
  }

  //var context = tcanvas.getContext('2d');
  context.clearRect(0, 0, tcanvas.width, tcanvas.height);
  context.putImageData(imageData, top_x, top_y);
}

root.onmouseup = function(e) {
  // Transfer drawing from tcanvas to canvas
  var ctx = canvas.getContext('2d');
  ctx.drawImage(tcanvas, 0, 0);
  ctx = tcanvas.getContext('2d');
  ctx.clearRect(0, 0, tcanvas.width, tcanvas.height);
  if (drag == 'focus') {
    scale = devicePixelRatio * 0.75;
    updateScale();
    screenshot.style.webkitFilter = 'brightness(88%)';
  }

  controls.style.display = 'block';
  actions.style.display = 'block';
  updateControls();
  overlay.style.display = 'none';
  /*if (wrap.clientWidth < 2 && wrap.clientHeight < 2) {
    dismiss();
  }*/
  if (drag == 'crop') {
    setAction('pen_red');
  }
  drag = false;
  hist = [];
}

var controls = ge('controls');
controls.style.display = 'none';
overlay.style.display = 'block';
actions.style.display = 'none';

controls.onmousedown = function(e) {
  e.stopPropagation();
  return false;
}
actions.onmousedown = function(e) {
  e.stopPropagation();
  return false;
}
ge('action_clear').onclick = function(e) {
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  scale = devicePixelRatio;
  updateScale();
  screenshot.style.webkitFilter = 'none';
  e.stopPropagation();
  return false;
}

var colors = { 'red': 'ff4b1b', 'yellow': 'ffffa8', 'green': '0db100', 'blue': '0c97df' };
var acts = [
  { name: 'crop' },
  { name: 'pen_red' }, { name: 'pen_yellow' }, { name: 'pen_green' }, { name: 'pen_blue' },
  { name: 'arrow_red' }, { name: 'arrow_yellow' }, { name: 'arrow_green' }, { name: 'arrow_blue' },
  { name: 'blur' }, { name: 'focus' }];
var act;
for (var i = 0; i < acts.length; i++) {
  (function(a) {
    ge('action_' + a.name).onclick = function(e) {
      setAction(a.name);
      e.stopPropagation();
      return false;
    }
  })(acts[i]);
}

function setAction(_act) {
  act = _act;
  for (var j = 0; j < acts.length; j++) {
    ge('action_' + acts[j].name).classList.toggle('active', acts[j].name == act);
  }
  var ctx = tcanvas.getContext('2d');
  ctx.clearRect(0, 0, tcanvas.width, tcanvas.height);
}

setAction('crop');

function send(msg, extra) {
  var c = document.createElement('canvas');
  c.width = wrap.clientWidth * scale;
  c.height = wrap.clientHeight * scale;
  var ctx = c.getContext('2d');
  ctx.webkitImageSmoothingEnabled = true;
  ctx.drawImage(screenshot,
    shadowL.clientWidth * devicePixelRatio, shadowT.clientHeight * devicePixelRatio,
    wrap.clientWidth * devicePixelRatio, wrap.clientHeight * devicePixelRatio,
    0, 0, c.width, c.height);
  if (screenshot.style.webkitFilter && screenshot.style.webkitFilter != 'none') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.rect(0, 0, c.width, c.height);
    ctx.fill();
  }
  ctx.webkitImageSmoothingEnabled = true; // false;
  ctx.drawImage(canvas,
    shadowL.clientWidth * devicePixelRatio, shadowT.clientHeight * devicePixelRatio,
    wrap.clientWidth * devicePixelRatio, wrap.clientHeight * devicePixelRatio,
    0, 0, c.width, c.height);

  var message = {
    message: msg,
    screenshot: c.toDataURL('image/png')
  };
  if (extra) {
    for (var i in extra) {
      message[i] = extra[i];
    }
  }
  chrome.runtime.sendMessage(message);
  dismiss();
}

function ge(e) { return document.getElementById(e); }
function isArray(obj) { return Object.prototype.toString.call(obj) === '[object Array]'; }

updateCrop(0, 0, window.innerWidth, window.innerHeight);
canvas.width = window.innerWidth * devicePixelRatio;
canvas.height = window.innerHeight * devicePixelRatio;
tcanvas.width = window.innerWidth * devicePixelRatio;
tcanvas.height = window.innerHeight * devicePixelRatio;
updateControls();