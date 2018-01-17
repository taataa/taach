var taach = require('../../index')
var taaspace = require('taaspace')

var space = new taaspace.Space()
var viewElement = document.getElementById('space')
var view = new taaspace.SpaceViewHTML(space)
view.mount(viewElement)

// Width and height of a grid tile
var SIDE = 256

// Snapping grid
var grid = new taaspace.InvariantGrid(new taaspace.Grid({
  xStep: SIDE,
  yStep: SIDE,
  rotateStep: Math.PI / 2,
  scaleStep: 100000000,
  scalePhase: 1
}), space)

var pickRandom = function (arr) {
  var i = Math.floor(Math.random() * 4)
  return arr[i]
}

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

  // Space size
  var W = 10

  // Additional container
  var g = new taaspace.SpaceGroup(space)

  var i, j, px, img, touch
  for (i = 0; i < W; i += 1) {
    for (j = 0; j < W; j += 1) {
      img = pickRandom(imgs)
      px = new taaspace.SpaceImage(g, img)
      px.translate(px.atMid(), grid.at(i, j))
      px.rotate(px.atMid(), pickRandom([
        0, Math.PI / 2, Math.PI, -Math.PI / 2
      ]))

      /*// Define interaction
      touch = new taach.Touchable(view, px)
      touch.start({
        tap: true
      })
      touch.on('transformend', function () {
        px.snap(px.atMid(), grid)
      })*/
    }
  }

  // Initial view position
  view.translate(view.atMid(), g.getHull().atMid())

  // Make view transformable
  var tView = new taach.Touchable(view, view)
  tView.start({
    translate: true,
    scale: true,
    rotate: true
  })

  // Snapping grid
  var viewGrid = new taaspace.InvariantGrid(new taaspace.Grid({
    rotateStep: Math.PI / 12
  }), space)

  tView.on('transformend', function () {
    view.snap(view.atMid(), viewGrid)
  })
})
