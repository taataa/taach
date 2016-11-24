var taach = require('../../../index');
var taaspace = require('taaspace');

var space = new taaspace.Space();
var viewElement = document.getElementById('space');
var view = new taaspace.HTMLSpaceView(space, viewElement);

var taa = new taaspace.Taa('../assets/chellah_star.jpg');

var staa1 = new taaspace.SpaceTaa(space, taa);
var staa2 = new taaspace.SpaceTaa(space, taa);

staa1.translate(staa1.atMid(), view.atMid());
staa2.translate(staa2.atMidN(), staa1.atMidS());

var tou1 = new taach.Touchable(view, staa1);
tou1.start({ scale: true });

var tou2 = new taach.Touchable(view, staa2);
tou2.start({ rotate: true });
