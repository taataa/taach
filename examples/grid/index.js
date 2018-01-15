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
  var diag = new taaspace.Vector(SIDE, SIDE)
  var rows = Math.ceil(Math.sqrt(imgs.length))
  var touchmode = { translate: true, scale: true, rotate: true }

  imgs.forEach(function (img, i) {
    // Create
    var px = new taaspace.SpaceImage(g, img)
    px.setLocalSize(diag)

    // Position
    var x = SIDE * (i % rows)
    var y = SIDE * Math.floor(i / rows)
    px.translate(px.atNW(), space.at(x, y))

    // Define interaction
    var touch = new taach.Touchable(view, px)
    touch.start(touchmode)
    touch.on('transformend', function () {
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
