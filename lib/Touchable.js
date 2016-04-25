var Emitter = require('component-emitter');

var pressModeDefaultOptions = {};
var transformModeDefaultOptions = {};

var Touchable = function (spaceView, spaceTransformer) {
  // Make it possible to transform or press a SpaceTransformer by hand.
  // TODO If spaceTransformer is SpaceView, then use inverse.
  Emitter(this);

  this.view = spaceView;
  this.transformer = spaceTransformer;
  this.element = spaceView.getElementBySpaceNode(spaceTransformer);

  /*this.transformMode = null;  // null == no transforms
  this.pressMode = null;  // null == no presses */
};

Touchable.prototype.setTransformMode = function (type, pivot, options) {
  // Parameters:
  //   type: 'T', 'S', 'R', ..., 'TSR'
  //   pivot: taaspace.SpacePoint, optional
  //   options: optional object, TODO

  // Handle parameters
  /*if (typeof pivot === 'undefined') {
    // No pivot, no options
    pivot = null;
  } else {
    if (pivot is not SpacePoint) {
      options = pivot;
      pivot = null;
    }
  }
  if (typeof options === 'undefined') { options = }

  if (type === null) {
    if (this.gestureHandler !== null) {
      // Stop listening on gesture events
    }
  }

  if (this.gestureHandler === null) {
    // Setup gesture handler
    var gh = new GestureHandler(type, pivot);
    gh.on('gesturestart', function () {});
    gh.on('gesturemove', function () {});
    gh.on('gesturecancel', function () {});
    gh.on('gestureend', function () {});
    this.gestureHandler = gh;
  } else {
    this.gestureHandler.setMode(type, pivot);
  }


  on('gesturemove')
  on('gestureend')*/
};

Touchable.prototype.setPressMode = function (onOff, options) {
  // Parameters:
  //   onOff: boolean
  //   options: optional object, TODO

  /*if (typeof options === 'undefined') {
    options = pressModeDefaultOptions;
  }

  if (onOff === true) {

  }

  if (onOff === false) {

  }

  foo.on('gestureend', function () {
    this2.emit('pressend');
  })*/
};
