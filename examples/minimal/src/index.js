var taach = require('../../../index');
var taaspace = require('taaspace');

var space = new taaspace.Space();
var viewElement = document.getElementById('space');
var view = new taaspace.HTMLSpaceView(space, viewElement);

var taa = new taaspace.Taa('chellah_star.jpg');
var staa = new taaspace.SpaceTaa(space, taa);

staa.translate(staa.atMid(), view.atMid());

var touch = new taach.Touchable(view, staa);
touch.setMode({
  translate: true,
  press: true
});
