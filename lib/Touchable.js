var Emitter = require('component-emitter');
var TransformRecognizer = require('./TransformRecognizer');
var taaspace = require('taaspace');

var pressModeDefaultOptions = {};
var transformModeDefaultOptions = {};

var Touchable = function (spaceView, spaceTransformer) {
  // Make it possible to transform or press a SpaceTransformer by hand.
  // TODO If spaceTransformer is SpaceView, then use inverse.
  Emitter(this);

  this.view = spaceView;
  this.transformer = spaceTransformer;
  this.element = spaceView.getElementBySpaceNode(spaceTransformer);

  this.recognizer = null;
};

Touchable.prototype.setMode = function (modeOptions) {
  // Parameters:
  //   modeOptions:
  //     pivot: a SpacePoint
  //     press: bool
  //     rotation: bool
  //     scale: bool
  //     translation: bool

  // TODO valid modeOptions

  var self = this;
  this.recognizer = new TransformRecognizer(this.element, 'TSR');
  var r = this.recognizer;
  var spacetaa = this.transformer;
  var originalParent = null;
  var originalLocal = null;

  r.on('transformstart', function (event) {
    // Store original parent so we can return spacetaa onto it after gesture.
    originalParent = spacetaa.getParent();
    // Change parent to view => not dependent on how view is transformed.
    // Keep location the same.
    var t = spacetaa.getGlobalTransform();
    spacetaa.setParent(self.view);
    spacetaa.setGlobalTransform(t);
    // Store new local transformation. Gesture modifies it instead
    // of global transform so therefore view location does not affect.
    originalLocal = spacetaa.getLocalTransform();
    // Render in touch order
    //el.style.zIndex = utils.getIncrementalZIndex();
    self.emit('transformstart');
    self.emit('pressstart');
  });
  r.on('transformmove', function (event) {
    // A safety feature to protect from invalid TouchAPI implementations.
    if (originalLocal === null) { return; }
    // Turn to SpaceTransform
    var spaceGesture = new taaspace.SpaceTransform(self.view, event.transform);
    // View might be transformed, therefore we graft a new
    // local transformation. We transform the result.
    var t = originalLocal.switchTo(self.view).transformBy(spaceGesture);
    // Apply to spacetaa
    spacetaa.setLocalTransform(t);
    self.emit('transformmove');
  });
  //r.on('transformcancel', function (event) {
  //  self.emit('transformcancel') if applicable
  //  self.emit('presscancel') if applicable
  //});
  r.on('transformend', function (event) {
    // Drop back to original parent.
    var t = spacetaa.getGlobalTransform();
    spacetaa.setParent(originalParent);
    spacetaa.setGlobalTransform(t);
    // We do not need the initial transformation and parent anymore.
    originalLocal = null;
    originalParent = null;
    self.emit('transformend');
    self.emit('pressend');  // TODO if applicable
  });

};

Touchable.prototype.setModeOff = function () {
  // Turn touchability off
  // TODO only if this.recognizer is not null.
  this.recognizer.off();
  // TODO remove handlers inside transform recognizer as well
};

module.exports = Touchable;
