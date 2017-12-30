/*
Microtransformation recognizer

Defines how a feed of pointer coordinates are computed into a geometric
transformation.

Usage
  var MicroModel = require('MicroModel');
  var m = new MicroModel('T');

Notes
  [1] Count them the hard way to avoid difference between a possible counter
      and the actual number of pointers. An "easy" way would be to maintain
      a variable that keeps record on the number of fingers.
  [2] For press event detection, we can place a threshold how far
      we allow fingers to move to still classify it as a press.
*/

var nudged = require('nudged')

module.exports = function MicroModel (type, pivot) {
  // Parameters
  //   type: transformation type string, default to 'I'

  if (typeof type === 'undefined') { type = 'I' }
  if (typeof pivot === 'undefined') { pivot = null }

  var locations = {}
  var totalTrans = nudged.Transform.IDENTITY
  var startTime = null

  // Mean distance that a finger has traveled during the gesture. See [2]
  var totalTravel = 0

  this.setType = function (transformationType) {
    type = transformationType
  }

  this.setPivot = function (transformationPivot) {
    pivot = transformationPivot
  }

  this.startPointers = function (pointers) {
    // Add to locations
    var k, i, p, isFirst

    // Test if first. After pointers are added, this information decides
    // if we return an event to inform recognizer about started gesture.
    // See [1] for implementation design.
    isFirst = true
    for (k in locations) {
      if (locations.hasOwnProperty(k)) {
        isFirst = false
        break
      }
    }

    for (i = 0; i < pointers.length; i += 1) {
      p = pointers[i]
      locations[p.id] = p.xy
    }
    // If first pointer, reset totals and emit start event.
    // Otherwise, return null to inform recognizer that
    // this is not the first pointer.
    if (isFirst) {
      startTime = Date.now()
      totalTrans = nudged.Transform.IDENTITY
      totalTravel = 0
      return {
        duration: 0,
        totaltrans: totalTrans,
        microtrans: totalTrans,
        totaltravel: totalTravel
      }
    } // else
    return null
  }

  this.movePointers = function (pointers) {
    // Return transformation event?

    var i, p, id, domain, range, microt, n, idOrder

    domain = []
    range = []
    idOrder = []

    // Construct domain from current locations
    for (id in locations) {
      if (locations.hasOwnProperty(id)) {
        idOrder.push(id)
        domain.push(locations[id])
      }
    }

    // Update locations
    for (i = 0; i < pointers.length; i += 1) {
      p = pointers[i]
      locations[p.id] = p.xy
    }

    // Construct range from updated locations.
    for (i = 0; i < idOrder.length; i += 1) {
      id = idOrder[i]
      range.push(locations[id])
    }

    // Estimate a microtransformation and produce new total.
    if (type === 'I') {
      // nudged.estimate does not know type 'I'
      microt = nudged.Transform.IDENTITY
    } else if (pivot) {
      microt = nudged.estimate(type, domain, range, pivot)
    } else {
      microt = nudged.estimate(type, domain, range)
    }
    totalTrans = microt.multiplyBy(totalTrans)

    // Accumulate to travel distance. See [2]
    // Use Manhattan distance
    // Could be optimized to loop only over changed. More complex though.
    n = domain.length
    for (i = 0; i < n; i += 1) {
      totalTravel += Math.abs(domain[i][0] - range[i][0]) / n
      totalTravel += Math.abs(domain[i][1] - range[i][1]) / n
    }

    return {
      duration: Date.now() - startTime,
      totaltrans: totalTrans,
      microtrans: microt,
      totaltravel: totalTravel
    }
  }

  this.endPointers = function (pointers) {
    // Delete pointers
    var i, id

    for (i = 0; i < pointers.length; i += 1) {
      id = pointers[i].id
      delete locations[id]
    }

    // Count pointers. If 0 left, return final event. Otherwise, return null.
    // See also [1].
    for (i in locations) {
      if (locations.hasOwnProperty(i)) {
        return null
      }
    }

    return {
      duration: Date.now() - startTime,
      totaltrans: totalTrans,
      microtrans: nudged.Transform.IDENTITY,
      totaltravel: totalTravel
    }
  }
}
