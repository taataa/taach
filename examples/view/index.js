var taach = require('../../index')
var taaspace = require('taaspace')

var space = new taaspace.Space()
var viewElement = document.getElementById('space')
var view = new taaspace.SpaceViewHTML(space)
view.mount(viewElement)

taaspace.preload('../assets/chellah_star.jpg', function (err, img) {
  if (err) { throw err }

  var staa = new taaspace.SpaceImage(space, img)

  staa.translate(staa.atMid(), view.atMid())

  var touch = new taach.Touchable(view, staa)
  touch.start({ tap: true, scale: true, rotate: true, translate: true })

  var viewTouch = new taach.Touchable(view, view)
  viewTouch.start({ translate: true });

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
