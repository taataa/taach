/*
MicroManager

Handles integration to Taaspace and higher level events such as tap event.

Keep all taaspace-related stuff in MicroManager
Keep MicroRecognizer compatible with all html elements.
*/
var MicroRecognizer = require('./MicroRecognizer');
var utils = require('./utils');
var taaspace = require('taaspace');

var toRawPivot = function (mode, transformer, view) {
  // The pivot needs to be converted to [x, y]
  // on the same coordinate system as the touch points (view).
  if (mode.pivot) {
    return mode.pivot.to(view).xy;
  }

  // Use middle of transformer as a default pivot if translation not allowed.
  if (mode.translate === false) {
    return transformer.atMid().to(view).xy;
  }

  // Return undefined so that when rawPivot is given as a parameter
  // it looks like the parameter was not given.
  return;
};

var toSpaceEvent = function (ev, view) {
  // Turn recognizer events to Taaspace compatible events.
  //
  // Parameters:
  //   ev
  //     event from MicroRecognizer
  //   view
  //     taaspace.HTMLSpaceView
  return {
    duration: ev.duration,
    totalTrans: new taaspace.SpaceTransform(view, ev.totaltrans),
    microTrans: new taaspace.SpaceTransform(view, ev.microtrans),
    totalTravel: ev.totaltravel
  };
};

var MicroManager = function (element, transformer, view, emitter, mode) {
  // Create a MicroManager
  //   var man = new MicroManager(...)
  //
  // Parameters:
  //   element
  //     HTML element to listen to
  //   transformer
  //     a taaspace.SpaceTransformer
  //   view
  //     a taaspace.HTMLSpaceView
  //   emitter
  //     public emitter the user listens to
  //   type
  //     transformation type
  //   pivot
  //     a taaspace.SpacePoint

  var self = this;

  this.mode = mode;
  this.transformer = transformer;
  this.view = view;

  // Convert mode options for the Taaspace-agnostic MicroRecognizer
  var type = utils.convertToTransformationType(mode);
  var rawPivot = toRawPivot(this.mode, this.transformer, this.view);
  this.recognizer = new MicroRecognizer(element, type, rawPivot);

  // We "lift" the SpaceTransformer and therefore have to remember things.
  originalParent = null;

  this.recognizer.on('transformstart', function (event) {
    // Store original parent so we can return spacetaa onto it after gesture.
    // TODO implement so that parent does not need to change.
    //      It can be done by computing view transformation as done here
    //      but then using setGlobalTransform.
    // TODO prepare for views, so that the effective transformation on views
    //      is inverted.

    originalParent = transformer.getParent();
    if (self.mode.view === false) {
      // Change parent to view => not dependent on how view is transformed.
      // Keep location the same.
      var t = transformer.getGlobalTransform();
      transformer.setParent(view);
      transformer.setGlobalTransform(t);
    }

    emitter.emit('transformstart', toSpaceEvent(event, self.view));
  });

  this.recognizer.on('transformmove', function (event) {
    // A safety feature to protect from invalid TouchAPI implementations.
    // Also, root space nodes (parent === null) cannot be transformed.
    if (originalParent === null) { return; }

    var spaceEvent = toSpaceEvent(event, self.view);

    // Apply to spacetaa
    if (self.mode.view === true) {
      transformer.transformBy(spaceEvent.microTrans.inverse());
    } else {
      transformer.transformBy(spaceEvent.microTrans);
    }

    emitter.emit('transformmove', spaceEvent);
  });

  // Do we need handling of cancel?
  //r.on('transformcancel', function (event) {
  //  emitter.emit('transformcancel') if applicable
  //  emitter.emit('presscancel') if applicable
  //});

  this.recognizer.on('transformend', function (event) {
    var t, spaceEvent;

    if (self.mode.view === false) {
      // Drop back to original parent.
      t = transformer.getGlobalTransform();
      transformer.setParent(originalParent);
      transformer.setGlobalTransform(t);
      // We do not need the initial transformation and parent anymore.
    }
    originalParent = null;


    spaceEvent = toSpaceEvent(event, self.view);

    emitter.emit('transformend', spaceEvent);

    if (self.mode.tap && event.totaltravel < self.mode.tapMaxTravel) {
      emitter.emit('tap', spaceEvent);
    }
  });

};

MicroManager.prototype.update = function (mode) {
  var type, rawPivot;

  this.mode = mode;

  type = utils.convertToTransformationType(this.mode);
  this.recognizer.setType(type);

  rawPivot = toRawPivot(this.mode, this.transformer, this.view);
  this.recognizer.setPivot(type);
};

MicroManager.prototype.destroy = function () {
  this.recognizer.destroy();
};

module.exports = MicroManager;
