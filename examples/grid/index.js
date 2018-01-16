var taach = require('../../index')
var taaspace = require('taaspace')

var space = new taaspace.Space()
var viewElement = document.getElementById('space')
var view = new taaspace.SpaceViewHTML(space)
view.mount(viewElement)

// Width and height of a grid tile
var SIDE = 128

// Snapping grid
var grid = new taaspace.InvariantGrid(new taaspace.Grid({
  xStep: SIDE,
  xPhase: SIDE / 2,
  yStep: SIDE,
  yPhase: SIDE / 2,
  rotateStep: Math.PI / 2,
  scaleStep: 10000,
  scalePhase: 1
}), space)

// Load images
taaspace.preload([
  'assets/tile00.png',
  'assets/tile01.png',
  'assets/tile02.png',
  'assets/tile03.png'
], function (err, imgs) {
  if (err) {
    console.error(err)
    throw err
  }

  var g = new taaspace.SpaceGroup(space)
  var rows = Math.ceil(Math.sqrt(imgs.length))
  var touchmode = { translate: true, scale: true, rotate: true }

  imgs.forEach(function (img, i) {
    // Create
    var px = new taaspace.SpaceImage(g, img)

    // Position
    var x = i % rows
    var y = Math.floor(i / rows)
    var h = grid.getHullOf(x, y)
    px.fitSize(h)
    px.translate(px.atNW(), space.at(SIDE * x, SIDE * y))

    // TODO make this work:
    // var x = i % rows
    // var y = Math.floor(i / rows)
    // var h = grid.getHullOf(x, y)
    // px.fitSize(h)

    // Define interaction
    var touch = new taach.Touchable(view, px)
    touch.start(touchmode)
    touch.on('transformend', function () {
      // TODO snapHull? snapAt? grid.getHullAt(x, y)?
      px.snap(px.atMid(), grid)
    })
  })

  // Initial view position
  view.fitScale(g)
  view.scale(view.atMid(), 1.618)

  // Make view transformable
  var tView = new taach.Touchable(view, view)
  tView.start(touchmode)
})
