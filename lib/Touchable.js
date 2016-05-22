var Emitter = require('component-emitter');
var MicroRecognizer = require('./MicroRecognizer');
var taaspace = require('taaspace');

var pressModeDefaultOptions = {};
var transformModeDefaultOptions = {};

var Touchable = function (spaceView, spaceTransformer) {
  // Make it possible to transform or press a SpaceTransformer by hand.
  // TODO If spaceTransformer is SpaceView, then use inverse.
  Emitter(this);
  var self = this;

  this.view = spaceView;
  this.transformer = spaceTransformer;
  this.element = spaceView.getElementBySpaceNode(spaceTransformer);

  this.recognizer = new MicroRecognizer(this.element, 'I');

  // We "lift" the SpaceTransformer and therefore have to remember things.
  var originalParent = null;

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
    // Render in touch order
    //el.style.zIndex = utils.getIncrementalZIndex();
    self.emit('transformstart');
    self.emit('pressstart');
    console.log('start');
  });

  this.recognizer.on('transformmove', function (event) {
    // A safety feature to protect from invalid TouchAPI implementations.
    // Also, root space nodes (parent === null) cannot be transformed.
    if (originalParent === null) { return; }
    // Turn to micro SpaceTransform
    var gesture = new taaspace.SpaceTransform(self.view, event.microtrans);
    // Apply to spacetaa
    self.transformer.transformBy(gesture);
    self.emit('transformmove');
  });
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
    self.emit('transformend');
    self.emit('pressend');  // TODO if applicable
    console.log('end');
  });
};

Touchable.prototype.setMode = function (modeOptions) {
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
  //     press_min_duration: 0
  //     press_max_duration: infinite

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

  this.recognizer.setType(type);
  this.recognizer.setPivot(pivot);
};

Touchable.prototype.setModeOff = function () {
  // Turn touchability off
  // TODO only if this.recognizer is not null.
  this.recognizer.off();
  // TODO remove handlers inside transform recognizer as well
};

module.exports = Touchable;
