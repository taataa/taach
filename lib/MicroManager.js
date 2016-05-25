/*
MicroManager

Handles integration to Taaspace.

Keep all taaspace-related stuff in MicroManager
Keep MicroRecognizer compatible with all html elements.
*/
var MicroRecognizer = require('./MicroRecognizer');
var taaspace = require('taaspace');

exports.create = function (element, transformer, view, emitter, type, pivot) {

  var r, originalParent;

  r = new MicroRecognizer(element, type, pivot);

  // We "lift" the SpaceTransformer and therefore have to remember things.
  originalParent = null;

  r.on('transformstart', function (event) {
    // Store original parent so we can return spacetaa onto it after gesture.
    // TODO implement so that parent does not need to change.
    //      It can be done by computing view transformation as done here
    //      but then using setGlobalTransform.
    originalParent = transformer.getParent();
    // Change parent to view => not dependent on how view is transformed.
    // Keep location the same.
    var t = transformer.getGlobalTransform();
    transformer.setParent(view);
    transformer.setGlobalTransform(t);

    emitter.emit('transformstart', event);
    emitter.emit('pressstart', event);
  });

  r.on('transformmove', function (event) {
    // A safety feature to protect from invalid TouchAPI implementations.
    // Also, root space nodes (parent === null) cannot be transformed.
    if (originalParent === null) { return; }
    // Turn to micro SpaceTransform
    var gesture = new taaspace.SpaceTransform(view, event.microtrans);
    // Apply to spacetaa
    transformer.transformBy(gesture);
    emitter.emit('transformmove', event);
  });

  // Do we need handling of cancel?
  //r.on('transformcancel', function (event) {
  //  emitter.emit('transformcancel') if applicable
  //  emitter.emit('presscancel') if applicable
  //});

  r.on('transformend', function (event) {
    // Drop back to original parent.
    var t = transformer.getGlobalTransform();
    transformer.setParent(originalParent);
    transformer.setGlobalTransform(t);
    // We do not need the initial transformation and parent anymore.
    originalParent = null;
    emitter.emit('transformend', event);
    emitter.emit('pressend', event);

    if (event.totaltravel < 20.0) {
      emitter.emit('tap', event);
    }
  });

  r.setType(type);
  r.setPivot(pivot);

  return r;
};

exports.update = function (recognizer, type, pivot) {
  recognizer.setType(type);
  recognizer.setPivot(pivot);
};
