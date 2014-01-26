var is_options = true;

function selectOwner() {
  loadAlbums(this.value);
}

function selectAlbum() {
  localStorage['qu_album'] = quickUploadAlbum = this.value;
  localStorage['qu_name'] = quickUploadName = albums[quickUploadOwner][this.value].title;

  chrome.runtime.sendMessage({ message: 'setQuickUploadAlbum', value: quickUploadAlbum, name: quickUploadName });
}

function loadGroups(update) {
  api('groups.get', { extended: 1 }, function(data) {
    if (data.response) {
      var html = ['<option value=0' + (quickUploadOwner == 0 ? ' selected' : '') + '>Ваши альбомы</option>', '<option value=-1 disabled>— Альбомы групп —</option>'];
      for (var i = 0; i < data.response.items.length; i++) {
        var group = data.response.items[i];
        html.push('<option value=' + (-group.id) + (quickUploadOwner == -group.id ? ' selected' : '') + '>' + group.name + '</option>');
      }
      ge('select_owner').innerHTML = html.join('');

      if (quickUploadAlbum == 0) {
        loadAlbums(0);
      } else {
        loadAlbums();
      }
    }
  });
}

function loadAlbums(updateOwner) {
  var cur_owner = quickUploadOwner, cur_album = quickUploadAlbum, update = false;
  if (updateOwner !== undefined) {
    cur_owner = updateOwner;
    cur_album = false;
    update = true;
  }

  var params = { extended: 1 };
  if (cur_owner != 0) {
    params.owner_id = cur_owner;
  }

  api('photos.getAlbums', params, function(data) {
    ge('select_album').innerHTML = '<option value=-1 disabled>Нет альбомов</option>';
    if (data.response) {
      albums[cur_owner] = {};
      var html = [];
      if (cur_owner == 0 && false) {
        albums[cur_owner][-15] = { title: 'Сохранённые фотографии' };
        if (!cur_album) {
          cur_album = -15;
        }
        html.push('<option value=-15' + (cur_album == -15 ? ' selected' : '') + '>Сохранённые фотографии</option>');
        html.push('<option value=-1 disabled>— Альбомы —</option>');
      }
      for (var i = 0; i < data.response.items.length; i++) {
        var album = data.response.items[i];
        albums[cur_owner][album.id] = album;
        if (!cur_album) {
          cur_album = album.id;
        }
        html.push('<option value=' + album.id + (cur_album == album.id ? ' selected' : '') + '>' + album.title + '</option>');
      }
      if (update && cur_album) {
        localStorage['qu_owner'] = quickUploadOwner = cur_owner;
        localStorage['qu_album'] = quickUploadAlbum = cur_album;
        localStorage['qu_name'] = quickUploadName = albums[cur_owner][cur_album].title;

        chrome.runtime.sendMessage({ message: 'setQuickUploadOwner', value: quickUploadOwner });
        chrome.runtime.sendMessage({ message: 'setQuickUploadAlbum', value: quickUploadAlbum, name: quickUploadName });
      }
      ge('select_album').innerHTML = html.join('');
    }
    return true;
  });
}

ge('button_auth').onclick = performAuth;
ge('button_close').onclick = function() {
  window.close();
}
ge('link_logout').onclick = function() {
  delete localStorage['access_token'];
  checkAccessToken();
  return false;
}
ge('select_owner').onchange = selectOwner;
ge('select_album').onchange = selectAlbum;
checkAccessToken();