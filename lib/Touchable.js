/*
Touchable

Defines the public methods, API.

Notes:
[1] As a design detail, the handling of element could be located
    within Manager and hidden from Touchable. However, it is
    convenient for Taach API users to access the element by touch.element.
*/
var Emitter = require('component-emitter')
var Manager = require('./Manager')
var utils = require('./utils')

var Touchable = function (spaceView, spaceTransformer) {
  // Make it possible to transform or press a SpaceTransformer by hand.
  Emitter(this)

  this.view = spaceView
  this.transformer = spaceTransformer

  // For pointer events (touch, mouse), we listen to the HTMLElement of
  // the given spaceTransformer. However, if the transformer is
  // the view itself, we must listen to the container element
  // of the view. This is because pointer events eventually
  // bubble to the container, instead of the view's own 0x0 div,
  // that receives only the pointer events of the children of the view.
  // See also [1] for note about code structure regarding elements.
  if (spaceView === spaceTransformer) {
    this.element = this.view.getHtmlContainer()
  } else {
    this.element = this.view.getElementBySpaceNode(this.transformer)
  }

  // Init interaction mode.
  this.mode = Touchable.DEFAULT_MODE

  this._manager = null  // A Manager. Null means deactive state.
}

Touchable.DEFAULT_MODE = {
  rotate: false,
  scale: false,
  translate: false,
  tap: false,
  tapMaxTravel: 20,
  pivot: null
}

Touchable.prototype.start = function (mode) {
  // Set current interaction mode. It is a combination of
  // a transformation mode and a press mode.
  //
  // Parameters:
  //   mode:
  //     pivot: a taaspace.InvariantVector
  //     rotate: bool
  //     scale: bool
  //     translate: bool
  //     tap: bool
  //     tapMaxTravel: number
  //
  var el, t, v

  // Reset mode and then add the given mode options.
  this.mode = utils.extend(Touchable.DEFAULT_MODE, mode)

  // Create or alternatively update the manager on the fly.
  if (this._manager === null) {
    el = this.element
    t = this.transformer
    v = this.view
    this._manager = new Manager(el, t, v, this, this.mode)
  } else {
    this._manager.update(this.mode)
  }
}

Touchable.prototype.restart = function (mode) {
  // Alias for start() but is more readable if recognition is really
  // "re"started.
  return this.start(mode)
}

Touchable.prototype.resume = function () {
  // Restart with the previous mode.
  if (this._manager === null) {
    this.start(this.mode)
  }
}

Touchable.prototype.stop = function () {
  // Turn touchability off
  if (this._manager !== null) {
    this._manager.destroy()
    this._manager = null
  }
}

module.exports = Touchable
