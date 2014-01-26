var last_target = null;
document.addEventListener('contextmenu', function(event){
  last_target = event.target;
}, true);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'find_sources') {
  	var sources = [];
  	var el = last_target;
  	while (el && el.className != 'post_media' && el.className != 'photoset') {
  		el = el.parentNode;
  	}
  	if (!el) {
  		return;
  	}
  	var photoset = el.className == 'photoset';
  	var imgs = el.querySelectorAll(photoset ? 'a.photoset_photo' : 'img');
  	for (var i = 0, l = imgs.length; i<l; i++) {
  		var prop = photoset ? 'href' : 'src';
  		if (imgs[i][prop]) sources.push(imgs[i][prop]);
  	}
  	sendResponse({sources:sources});
  }
});