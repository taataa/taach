var taach = require('../../../index');
var taaspace = require('taaspace');

var space = new taaspace.Space();
var viewElement = document.getElementById('space');
var view = new taaspace.HTMLSpaceView(space, viewElement);

var taa = new taaspace.Taa('../assets/chellah_star.jpg');
var staa = new taaspace.SpaceTaa(space, taa);

staa.translate(staa.atMid(), view.atMid());

var touch = new taach.Touchable(view, staa);
touch.start({ tap: true, scale: true, rotate: true, translate: true });

(function defineLog() {
  touch.on('transformstart', function () {
    console.log('transformstart');
  });
  touch.on('transformmove', function () {
    console.log('transformmove');
  });
  touch.on('transformend', function () {
    console.log('transformend');
  });
  touch.on('tap', function () {
    console.log('tap');
  });
}());
