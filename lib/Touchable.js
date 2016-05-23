var Emitter = require('component-emitter');
var MicroRecognizer = require('./MicroRecognizer');
var taaspace = require('taaspace');

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
  this.element = spaceView.getElementBySpaceNode(spaceTransformer);

  this.recognizer = new MicroRecognizer(this.element, 'I');
  tap_max_travel = 20;

  // We "lift" the SpaceTransformer and therefore have to remember things.
  originalParent = null;

  this.recognizer.on('transformstart', function (event) {
    // Store original parent so we can return spacetaa onto it after gesture.
    // TODO implement so that parent does not need to change.
    //      It can be done by computing view transformation as done here
    //      but then using setGlobalTransform.
    originalParent = self.transformer.getParent();
    // Change parent to view => not dependent on how view is transformed.
    // Keep location the same.
    var t = self.transformer.getGlobalTransform();
    self.transformer.setParent(self.view);
    self.transformer.setGlobalTransform(t);

    self.emit('transformstart', event);
    //self.emit('pressstart', event);
  });

  this.recognizer.on('transformmove', function (event) {
    // A safety feature to protect from invalid TouchAPI implementations.
    // Also, root space nodes (parent === null) cannot be transformed.
    if (originalParent === null) { return; }
    // Turn to micro SpaceTransform
    var gesture = new taaspace.SpaceTransform(self.view, event.microtrans);
    // Apply to spacetaa
    self.transformer.transformBy(gesture);
    self.emit('transformmove', event);
  });
  // Do we need handling of cancel?
  //this.recognizer.on('transformcancel', function (event) {
  //  self.emit('transformcancel') if applicable
  //  self.emit('presscancel') if applicable
  //});
  this.recognizer.on('transformend', function (event) {
    // Drop back to original parent.
    var t = self.transformer.getGlobalTransform();
    self.transformer.setParent(originalParent);
    self.transformer.setGlobalTransform(t);
    // We do not need the initial transformation and parent anymore.
    originalParent = null;
    self.emit('transformend', event);
    self.emit('pressend');

    if (event.totaltravel < 20.0) {
      self.emit('tap');
    }
  });
};

Touchable.prototype.start = function (modeOptions) {
  // Set current interaction mode. It is a combination of
  // a transformation mode and a press mode.
  //
  // Parameters:
  //   modeOptions:
  //     pivot: a SpacePoint
  //     press: bool
  //     rotate: bool
  //     scale: bool
  //     translate: bool
  //     tap_max_travel: 20

  var opts = modeOptions;  // alias

  // Convert mode options to nudged transformation type.
  // Required in TransformRecognizer
  var type = (function convertToTransformationType() {
    if (opts.translate || opts.scale || opts.rotate) {
      if (opts.translate) {
        if (opts.scale) {
          if (opts.rotate) {
            return 'TSR';
          }  // else
          return 'TS';
        }  // else
        if (opts.rotate) {
          return 'TR';
        }  // else
        return 'T';
      }  // else
      if (opts.scale) {
        if (opts.rotate) {
          return 'SR';
        }  // else
        return 'S';
      }  // else
      return 'R';
    }  // else
    return 'I';
  }());

  // Keep undefined if pivot not given.
  // The pivot needs to be converted to [x, y]
  // on the same coordinate system as the touch points (view).
  var pivot;
  if (opts.hasOwnProperty('pivot')) {
    pivot = opts.pivot.to(this.view).xy;
  }

  if (opts.hasOwnProperty('tap_max_travel')) {

  }

  this.recognizer.setType(type);
  this.recognizer.setPivot(pivot);
};

Touchable.prototype.pause = function () {

};

Touchable.prototype.resume = function () {

};

Touchable.prototype.stop = function () {
  // Turn touchability off
  if (this.recognizer) {
    this.recognizer.destroy();
    this.recognizer = null;
  }
};

module.exports = Touchable;
