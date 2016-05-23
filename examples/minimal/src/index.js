var taach = require('../../../index');
var taaspace = require('taaspace');

var space = new taaspace.Space();
var viewElement = document.getElementById('space');
var view = new taaspace.HTMLSpaceView(space, viewElement);

var taa = new taaspace.Taa('chellah_star.jpg');
var staa = new taaspace.SpaceTaa(space, taa);
//var staa2 = new taaspace.SpaceTaa(staa, taa);

staa.translate(staa.atMid(), view.atMid());
//staa2.translate(staa2.atMidW(), staa.atMidE());

var touch = new taach.Touchable(view, staa);
touch.start({
  translate: false,
  scale: true,
  rotate: true,
  press: true,
  pivot: staa.atMid()
});

// var touch2 = new taach.Touchable(view, staa2);
//touch2.setMode({rotate: true, pivot: staa2.atNW()});

(function defineLog() {
  touch.on('transformmove', function (ev) {
    console.log(ev.totaltravel);
  });
}());

(function definePress() {
  var flag = false;
  touch.on('tap', function () {
    console.log('tap');
    flag = !flag;
    if (flag) {
      touch.element.style.opacity = '0.5';
    } else {
      touch.element.style.opacity = '1.0';
    }
  });
}());
