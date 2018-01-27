var taach = require('../../index')
var taaspace = require('taaspace')

var space = new taaspace.Space()
var viewElement = document.getElementById('space')
var view = new taaspace.SpaceView(space)
view.mount(viewElement)

// Width and height of a grid tile
var SIDE = 128

// Snapping grid
var grid = new taaspace.geom.IGrid({
  xStep: SIDE,
  xPhase: SIDE / 2,
  yStep: SIDE,
  yPhase: SIDE / 2,
  rotateStep: Math.PI / 2,
  scaleStep: 10000,
  scalePhase: 1
}, space)

// Load images
taaspace.preload([
  '../assets/tile00.png',
  '../assets/tile01.png',
  '../assets/tile02.png',
  '../assets/tile03.png'
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

    // Position & snap scale
    var x = i % rows
    var y = Math.floor(i / rows)
    px.setLocalSize(new taaspace.geom.Vector(SIDE, SIDE))
    px.translate(px.atMid(), grid.at(x, y))
    px.snap(px.atMid(), grid)

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
