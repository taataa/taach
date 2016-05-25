/*
Touchable

Notes:
[1] Element could be located in MicroManager and hidden. However, it is
    convenient for api user to access the element by touch.element.
*/
var Emitter = require('component-emitter');
var MicroManager = require('./MicroManager');
var utils = require('./utils');

var pressModeDefaultOptions = {};
var transformModeDefaultOptions = {};


var Touchable = function (spaceView, spaceTransformer) {
  // Make it possible to transform or press a SpaceTransformer by hand.
  // TODO If spaceTransformer is SpaceView, then use inverse.
  var self, originalParent, tap_max_travel;

  Emitter(this);
  self = this;

  this.view = spaceView;
  this.transformer = spaceTransformer;
  this.element = this.view.getElementBySpaceNode(this.transformer);  // [1]
  this.recognizer = null;

  this.defaultMode = {
    press: false,
    rotate: false,
    scale: false,
    translate: false,
    tap_max_travel: 20
  };
  this.mode = null;  // reset on start
};

Touchable.prototype.start = function (mode) {
  // Set current interaction mode. It is a combination of
  // a transformation mode and a press mode.
  //
  // Parameters:
  //   mode:
  //     pivot: a SpacePoint
  //     press: bool
  //     rotate: bool
  //     scale: bool
  //     translate: bool
  //     tap_max_travel: 20
  var type, pivot, t, v;

  // Reset mode and add given mode options.
  this.mode = utils.extend({}, this.defaultMode);
  utils.extend(this.mode, mode);

  // Convert mode options to nudged transformation type.
  // Required in TransformRecognizer
  type = utils.convertToTransformationType(this.mode);
  // The pivot needs to be converted to [x, y]
  // on the same coordinate system as the touch points (view).
  if (this.mode.hasOwnProperty('pivot')) {
    pivot = this.mode.pivot.to(this.view).xy;
  }  // This way we keep the pivot undefined for the recognizer.

  // Create or alternatively update on the fly.
  if (this.recognizer === null) {
    el = this.element;
    t = this.transformer;
    v = this.view;
    this.recognizer = MicroManager.create(el, t, v, this, type, pivot);
  } else {
    MicroManager.update(this.recognizer, type, pivot);
  }
};

Touchable.prototype.restart = function (mode) {
  // Alias for start() but is more understandable if recognition is really
  // "re"started.
  return this.start(mode);
};

Touchable.prototype.resume = function () {
  // Restart with the previous mode.
  if (this.recognizer !== null) {
    this.start(this.mode);
  }
};

Touchable.prototype.stop = function () {
  // Turn touchability off
  if (this.recognizer !== null) {
    this.recognizer.destroy();
    this.recognizer = null;
  }
};

module.exports = Touchable;
