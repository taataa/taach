var taach = require('../../index')
var taaspace = require('taaspace')

var space = new taaspace.Space()
var viewElement = document.getElementById('space')
var view = new taaspace.SpaceViewHTML(space)
view.mount(viewElement)

var data = [
  ['#FF0000', { translate: true }],
  ['#00FF00', { scale: true }],
  ['#0000FF', { rotate: true }],
  ['#FFFF00', { translate: true, scale: true }],
  ['#FF00FF', { translate: true, rotate: true }],
  ['#00FFFF', { scale: true, rotate: true }],
  ['#FFFFFF', { translate: true, scale: true, rotate: true }]
]

var g = new taaspace.SpaceGroup(space)

data.forEach(function (d, i) {
  var px = new taaspace.SpacePixel(g, d[0])
  px.translate(px.atMid(), space.at(i, 0))
  var touch = new taach.Touchable(view, px)
  var mode = d[1]
  mode.pivot = px.atMid()
  touch.start(mode)
})

view.fit(g.getHull())
