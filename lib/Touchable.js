/*
Touchable

Defines the public methods, API.

Notes:
[1] Element could be located in Manager and hidden. However, it is
    convenient for api user to access the element by touch.element.
*/
var Emitter = require('component-emitter')
var Manager = require('./Manager')
var utils = require('./utils')

var Touchable = function (spaceView, spaceTransformer) {
  // Make it possible to transform or press a SpaceTransformer by hand.
  Emitter(this)

  this.view = spaceView
  this.transformer = spaceTransformer
  this.element = this.view.getElementBySpaceNode(this.transformer)  // [1]

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
