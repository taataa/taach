/*
MicroRecognizer

Defines how different input devices are normalized into id, x, and y.

Keep all taaspace-related stuff in Touchable.js
Keep this Recognizer compatible with all html elements.
*/
var Emitter = require('component-emitter');
var MicroModel = require('./MicroModel');

module.exports = function MicroRecognizer(element, type, pivot) {
  Emitter(this);
  var self = this;

  var model = new MicroModel(type, pivot);

  this.setType = function (newType) {
    model.setType(newType);
  };

  this.setPivot = function (newPivot) {
    model.setPivot(newPivot);
  }

  // Touch support

  var onTouchStart = function (ev) {
    var cts, i, pointers, firstEvent;
    pointers = [];
    cts = ev.changedTouches;
    for (i = 0; i < cts.length; i += 1) {
      pointers.push({
        id: cts[i].identifier,
        xy: [cts[i].pageX, cts[i].pageY]
      });
    }
    firstEvent = model.startPointers(pointers);
    if (firstEvent) {  // null if was not first
      self.emit('transformstart', firstEvent);
    }
    ev.preventDefault();
    ev.stopPropagation();
  };

  var onTouchMove = function (ev) {
    var cts, i, pointers, moveEvent;
    pointers = [];
    cts = ev.changedTouches;
    for (i = 0; i < cts.length; i += 1) {
      pointers.push({
        id: cts[i].identifier,
        xy: [cts[i].pageX, cts[i].pageY]
      });
    }
    moveEvent = model.movePointers(pointers);
    self.emit('transformmove', moveEvent);
    ev.preventDefault();
    ev.stopPropagation();
  };
  
  var onTouchEndTouchCancel = function (ev) {
    var cts, i, pointers, lastEvent;
    pointers = [];
    cts = ev.changedTouches;
    for (i = 0; i < cts.length; i += 1) {
      pointers.push({
        id: cts[i].identifier,
        xy: [cts[i].pageX, cts[i].pageY]
      });
    }
    lastEvent = model.endPointers(pointers);
    if (lastEvent) {  // null if was not last
      self.emit('transformend', lastEvent);
    }
    ev.preventDefault();
    ev.stopPropagation();
  };

  element.addEventListener('touchstart', onTouchStart);
  element.addEventListener('touchmove', onTouchMove);
  element.addEventListener('touchend', onTouchEndTouchCancel);
  element.addEventListener('touchcancel', onTouchEndTouchCancel);

  // Mouse support
  // No hover support.

  var mouseDown = false;

  var onMouseDown = function (ev) {
    var firstEvent;
    if (!mouseDown) {
      mouseDown = true;
      firstEvent = model.startPointers([{
        id: 'mouse',
        xy: [ev.pageX, ev.pageY]
      }]);
      if (firstEvent) {  // null if was not first
        self.emit('transformstart', firstEvent);
      }
      ev.preventDefault();
      ev.stopPropagation();
    }
  };

  var onMouseMove = function (ev) {
    var moveEvent;
    if (mouseDown) {
      moveEvent = model.movePointers([{
        id: 'mouse',
        xy: [ev.pageX, ev.pageY]
      }]);
      self.emit('transformmove', moveEvent);
      ev.preventDefault();
      ev.stopPropagation();
    }
  };

  var onMouseUp = function (ev) {
    var lastEvent;
    if (mouseDown) {
      mouseDown = false;
      lastEvent = model.endPointers([{
        id: 'mouse',
        xy: [ev.pageX, ev.pageY]
      }]);
      if (lastEvent) {  // null if was not last
        self.emit('transformend', lastEvent);
      }
      ev.preventDefault();
      ev.stopPropagation();
    }
  };

  element.addEventListener('mousedown', onMouseDown);
  element.addEventListener('mousemove', onMouseMove);
  element.addEventListener('mouseup', onMouseUp);
  element.addEventListener('mouseout', onMouseUp);
};
