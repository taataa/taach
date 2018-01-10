/*
Manager

Handles integration to Taaspace and higher level events such as tap event.

Keep all taaspace-related stuff in Manager.
Keep Recognizer compatible with all html elements.

Notes
  [1] For press event detection, we can place a threshold how far
      we allow fingers to move to still classify it as a press.
*/
var Recognizer = require('./Recognizer')
var utils = require('./utils')
var taaspace = require('taaspace')
var nudged = require('nudged')

var toPivotOnView = function (mode, transformer, view) {
  // The pivot needs to be converted to [x, y]
  // on the same coordinate system as the touch points (view).
  //
  if (mode.pivot) {
    return mode.pivot.to(view).toArray()
  }

  // Use middle of transformer as a default pivot if translation not allowed.
  if (mode.translate === false) {
    return transformer.atMid().to(view).toArray()
  }

  // Return undefined so that when rawPivot is given as a parameter
  // to Recognizer, it looks like the parameter was not given.
}

var Manager = function (element, transformer, view, emitter, mode) {
  // Create a Manager
  //   var man = new Manager(...)
  //
  // Parameters:
  //   element
  //     HTML element to listen to
  //   transformer
  //     a taaspace.SpaceTransformer, the object to move
  //   view
  //     a taaspace.SpaceViewHTML
  //   emitter
  //     public emitter the user listens to
  //   mode
  //     a transformation type
  //
  var self = this

  this.mode = mode
  this.transformer = transformer
  this.view = view

  var startTime = null
  var totalTravel = null

  var onStart = function (firstPointers) {
    startTime = Date.now()
    totalTravel = 0

    emitter.emit('transformstart', {
      distance: 0,
      duration: 0
    })
  }

  var onMove = function (prevPointers, nextPointers) {
    var k, i, n, pivot, type, tr, itr
    var domain = []
    var range = []

    // Set intersection
    for (k in prevPointers) {
      if (prevPointers.hasOwnProperty(k) && nextPointers.hasOwnProperty(k)) {
        domain.push(prevPointers[k])
        range.push(nextPointers[k])
      }
    }

    // Accumulate to travelled distance. See [1]
    // Use Manhattan distance for simpler computation.
    // Goal is to form a threshold to filter out small
    // involuntary movement of the fingers or arm.
    //
    // N. Divide distance by number of fingers. This way
    // an involuntary arm movement has same threshold regardless of
    // the number of touching fingers.
    n = domain.length
    for (i = 0; i < n; i += 1) {
      totalTravel += Math.abs(domain[i][0] - range[i][0]) / n
      totalTravel += Math.abs(domain[i][1] - range[i][1]) / n
    }

    // Compute current position of the pivot on view.
    // Pivot will be undefined if the mode has translation.
    pivot = toPivotOnView(self.mode, self.transformer, self.view)
    // Get current nudged-compatible transformation type string
    type = utils.convertToTransformationType(mode)

    // Estimate optimal transformation
    tr = nudged.estimate(type, domain, range, pivot)
    itr = new taaspace.InvariantTransform(tr, view)

    // Apply to transformer
    if (self.view === self.transformer) {
      transformer.transformBy(itr.inverse())
    } else {
      transformer.transformBy(itr)
    }

    emitter.emit('transformmove', {
      distance: totalTravel,
      duration: Date.now() - startTime
    })
  }

  var onEnd = function (lastPointers) {
    emitter.emit('transformend', {
      distance: totalTravel,
      duration: Date.now() - startTime
    })

    if (mode.tap && totalTravel < mode.tapMaxTravel) {
      emitter.emit('tap', {
        distance: totalTravel,
        duration: Date.now() - startTime
      })
    }
  }

  this.recognizer = new Recognizer(element, {
    start: onStart,
    move: onMove,
    end: onEnd
  })
}

Manager.prototype.update = function (mode) {
  this.mode = mode
}

Manager.prototype.destroy = function () {
  this.recognizer.destroy()
}

module.exports = Manager
