/*
MicroRecognizer

Defines how different input devices are normalized into id, x, and y.

Keep all taaspace-related stuff in MicroManager.js
Keep MicroRecognizer compatible with all html elements.
*/
var Emitter = require('component-emitter')
var MicroModel = require('./MicroModel')

var MicroRecognizer = function (element, type, pivot) {
  // Parameters:
  //   element
  //     HTMLElement
  //   type
  //     a nudged transformation type string.
  //   pivot
  //     Optional. A point [x, y].
  Emitter(this)
  var self = this

  this.model = new MicroModel(type, pivot)
  this.element = element

  // We need to remember listeners we make to be able to remove them
  // and only them.
  this.listeners = {}

  // Touch support

  var onTouchStart = function (ev) {
    var cts, i, pointers, firstEvent
    pointers = []
    cts = ev.changedTouches
    for (i = 0; i < cts.length; i += 1) {
      pointers.push({
        id: cts[i].identifier,
        xy: [cts[i].pageX, cts[i].pageY]
      })
    }
    firstEvent = self.model.startPointers(pointers)
    if (firstEvent) {  // null if was not first
      self.emit('transformstart', firstEvent)
    }
    ev.preventDefault()
    ev.stopPropagation()
  }

  var onTouchMove = function (ev) {
    var cts, i, pointers, moveEvent
    pointers = []
    cts = ev.changedTouches
    for (i = 0; i < cts.length; i += 1) {
      pointers.push({
        id: cts[i].identifier,
        xy: [cts[i].pageX, cts[i].pageY]
      })
    }
    moveEvent = self.model.movePointers(pointers)
    self.emit('transformmove', moveEvent)
    ev.preventDefault()
    ev.stopPropagation()
  }

  var onTouchEndTouchCancel = function (ev) {
    var cts, i, pointers, lastEvent
    pointers = []
    cts = ev.changedTouches
    for (i = 0; i < cts.length; i += 1) {
      pointers.push({
        id: cts[i].identifier,
        xy: [cts[i].pageX, cts[i].pageY]
      })
    }
    lastEvent = self.model.endPointers(pointers)
    if (lastEvent) {  // null if was not last
      self.emit('transformend', lastEvent)
    }
    ev.preventDefault()
    ev.stopPropagation()
  }

  this.element.addEventListener('touchstart', onTouchStart)
  this.element.addEventListener('touchmove', onTouchMove)
  this.element.addEventListener('touchend', onTouchEndTouchCancel)
  this.element.addEventListener('touchcancel', onTouchEndTouchCancel)
  this.listeners.touchstart = onTouchStart
  this.listeners.touchmove = onTouchMove
  this.listeners.touchend = onTouchEndTouchCancel
  this.listeners.touchcancel = onTouchEndTouchCancel

  // Mouse support
  // No hover support.

  var mouseDown = false

  var onMouseDown = function (ev) {
    var firstEvent
    if (!mouseDown) {
      mouseDown = true
      firstEvent = self.model.startPointers([{
        id: 'mouse',
        xy: [ev.pageX, ev.pageY]
      }])
      if (firstEvent) {  // null if was not first
        self.emit('transformstart', firstEvent)
      }
      ev.preventDefault()
      ev.stopPropagation()
    }
  }

  var onMouseMove = function (ev) {
    var moveEvent
    if (mouseDown) {
      moveEvent = self.model.movePointers([{
        id: 'mouse',
        xy: [ev.pageX, ev.pageY]
      }])
      self.emit('transformmove', moveEvent)
      ev.preventDefault()
      ev.stopPropagation()
    }
  }

  var onMouseUp = function (ev) {
    var lastEvent
    if (mouseDown) {
      mouseDown = false
      lastEvent = self.model.endPointers([{
        id: 'mouse',
        xy: [ev.pageX, ev.pageY]
      }])
      if (lastEvent) {  // null if was not last
        self.emit('transformend', lastEvent)
      }
      ev.preventDefault()
      ev.stopPropagation()
    }
  }

  this.element.addEventListener('mousedown', onMouseDown)
  this.element.addEventListener('mousemove', onMouseMove)
  this.element.addEventListener('mouseup', onMouseUp)
  this.element.addEventListener('mouseout', onMouseUp)
  this.listeners.mousedown = onMouseDown
  this.listeners.mousemove = onMouseMove
  this.listeners.mouseup = onMouseUp
  this.listeners.mouseout = onMouseUp
}

MicroRecognizer.prototype.setType = function (newType) {
  this.model.setType(newType)
}

MicroRecognizer.prototype.setPivot = function (newPivot) {
  this.model.setPivot(newPivot)
}

MicroRecognizer.prototype.destroy = function () {
  // Remove all listeners we made
  this.off()

  for (var k in this.listeners) {
    if (this.listeners.hasOwnProperty(k)) {
      this.element.removeEventListener(k, this.listeners[k])
    }
  }
  this.listeners = null
}

module.exports = MicroRecognizer
