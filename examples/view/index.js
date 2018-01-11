var taach = require('../../index')
var taaspace = require('taaspace')

var space = new taaspace.Space()
var viewElement = document.getElementById('space')
var view = new taaspace.SpaceViewHTML(space)
view.mount(viewElement)

taaspace.preload('../assets/chellah_star.jpg', function (err, img) {
  if (err) { throw err }

  var g = new taaspace.SpaceGroup(space)
  var simg1 = new taaspace.SpaceImage(g, img)
  var simg2 = new taaspace.SpaceImage(g, img)

  view.fitScale(g)
  view.scale(view.atMid(), 1.618)

  var touch1 = new taach.Touchable(view, simg1)
  var touch2 = new taach.Touchable(view, simg2)
  touch1.start({ translate: true, scale: true, rotate: true })
  touch2.start({ translate: true, scale: true, rotate: true })

  var viewTouch = new taach.Touchable(view, view)
  viewTouch.start({ translate: true, scale: true, rotate: true, tap: true });

  (function defineLog () {
    viewTouch.on('transformstart', function () {
      console.log('view:transformstart')
    })
    viewTouch.on('transformmove', function () {
      console.log('view:transformmove')
    })
    viewTouch.on('transformend', function () {
      console.log('view:transformend')
    })
    viewTouch.on('tap', function () {
      console.log('view:tap')
    })
  }())
})
