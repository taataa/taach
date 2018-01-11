var taach = require('../../index')
var taaspace = require('taaspace')

var space = new taaspace.Space()
var viewElement = document.getElementById('space')
var view = new taaspace.SpaceViewHTML(space)
view.mount(viewElement)

var grid = new taaspace.InvariantGrid(new taaspace.Grid({
  xStep: 64,
  yStep: 64,
  rotateStep: Math.PI
}), space)

var g = new taaspace.SpaceGroup(space)
var px1 = new taaspace.SpacePixel(g, '#E2AA9B')
var px2 = new taaspace.SpacePixel(g, '#976773')
var px3 = new taaspace.SpacePixel(g, '#49224E')
var px4 = new taaspace.SpacePixel(g, '#2E0F39')

var diag = new taaspace.Vector(128, 128)
px1.setLocalSize(diag)
px2.setLocalSize(diag)
px3.setLocalSize(diag)
px4.setLocalSize(diag)

px1.translate(px1.atNW(), space.at(0, 0))
px2.translate(px2.atNW(), space.at(128, 0))
px3.translate(px3.atNW(), space.at(0, 128))
px4.translate(px4.atNW(), space.at(128, 128))

view.fitScale(g)
view.scale(view.atMid(), 1.618)

var t1 = new taach.Touchable(view, px1)
var t2 = new taach.Touchable(view, px2)
var t3 = new taach.Touchable(view, px3)
var t4 = new taach.Touchable(view, px4)

var touchmode = { translate: true, rotate: true }
t1.start(touchmode)
t2.start(touchmode)
t3.start(touchmode)
t4.start(touchmode)

var tView = new taach.Touchable(view, view)
tView.start(touchmode)

t1.on('transformend', function () {
  px1.snap(grid)
})
t2.on('transformend', function () {
  px2.snap(grid)
})
t3.on('transformend', function () {
  px3.snap(grid)
})
t4.on('transformend', function () {
  px4.snap(grid)
})
