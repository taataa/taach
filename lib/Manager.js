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

var toRawPivot = function (mode, transformer) {
  // The pivot needs to be converted to [x, y]
  // on transformer's coordinate plane.
  //
  if (mode.pivot) {
    return mode.pivot.to(transformer).toArray()
  }

  // Use middle of transformer as a default pivot if translation not allowed.
  if (mode.translate === false) {
    return transformer.atMid().to(transformer).toArray()
  }

  // Return undefined so that when rawPivot is given as a parameter
  // to Recognizer, it looks like the parameter was not given.
}

var rebase = function (pointers, sourcePlane, targetPlane) {
  // Represent pointers on another SpacePlane
  //
  // Parameters
  //   pointers
  //     a map: id -> [x, y]
  //   sourcePlane
  //     a SpacePlane of the pointers
  //   targetPlane
  //     a SpacePlane of the returned pointers
  //
  if (sourcePlane === targetPlane) {
    return pointers
  }

  var k
  var result = {}
  var sourceToSpace = sourcePlane.getGlobalTransform().toSpace()
  var targetToSpace = targetPlane.getGlobalTransform().toSpace()
  var sourceToTarget = targetToSpace.inverse().multiplyRight(sourceToSpace)
  for (k in pointers) {
    if (pointers.hasOwnProperty(k)) {
      result[k] = sourceToTarget.transform(pointers[k])
    }
  }
  return result
}

var multiplyLeft = function (pointers, transform) {
  // Transform pointers
  var k
  var result = {}
  for (k in pointers) {
    if (pointers.hasOwnProperty(k)) {
      result[k] = transform.transform(pointers[k])
    }
  }
  return result
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
  var pointersOnItem = {}

  var onStart = function (firstPointers) {
    startTime = Date.now()
    totalTravel = 0

    pointersOnItem = rebase(firstPointers, view, transformer)

    emitter.emit('transformstart', {
      distance: 0,
      duration: 0
    })
  }

  var onMove = function (prevPointers, nextPointers) {
    var k, n, pivot, type, tr, itr
    var domain = []
    var range = []

    // Current location of new pointers on the transformer.
    // This approach zeroes the effects caused by
    // 1) transformations of the view
    // 2) transformations of the parents of the transformer
    var nextPointersOnItem = rebase(nextPointers, view, transformer)

    // Set intersection. Do not use removed or appeared pointers
    // in estimation.
    for (k in pointersOnItem) {
      if (pointersOnItem.hasOwnProperty(k) &&
          nextPointersOnItem.hasOwnProperty(k)) {
        domain.push(pointersOnItem[k])
        range.push(nextPointersOnItem[k])
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
    //
    // Note that we compute travel on view instead of travel on
    // the transformer. This way travel does not depend on transformations
    // of the space, but only the screen pixels.
    n = domain.length
    for (k in prevPointers) {
      if (prevPointers.hasOwnProperty(k) && nextPointers.hasOwnProperty()) {
        totalTravel += Math.abs(prevPointers[k][0] - nextPointers[k][0]) / n
        totalTravel += Math.abs(prevPointers[k][1] - nextPointers[k][1]) / n
      }
    }

    // Compute current position of the pivot on the transformer.
    // Pivot will be undefined if mode has no pivot but enables translation.
    pivot = toRawPivot(self.mode, self.transformer)
    // Get current nudged-compatible transformation type string
    type = utils.convertToTransformationType(mode)

    // Estimate optimal transformation
    tr = nudged.estimate(type, domain, range, pivot)
    itr = new taaspace.InvariantTransform(tr, transformer)

    // Apply the transformation to transformer. We also
    // memorize the new pointers for the next onMove call.
    // We want to memorize only their relative location on the transformer.
    // This way transformations of the view and parents between
    // onMove calls become part of the resulting transformation.
    // Note that transformBy emits 'transformed' that might eventually
    // cause transformations in the space. Therefore we should do all
    // coordinate-plane conversions before transformBy to avoid weird bugs.
    if (self.view === self.transformer) {
      // Somehow we do not need the following line with views:
      // pointersOnItem = multiplyLeft(nextPointersOnItem, tr)
      pointersOnItem = nextPointersOnItem
      transformer.transformBy(itr.inverse())
    } else {
      pointersOnItem = multiplyLeft(nextPointersOnItem, tr.inverse())
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

    pointersOnItem = {}

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
