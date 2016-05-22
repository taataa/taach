/*
Microtransformation recognizer

Usage
  var MicroModel = require('MicroModel');
  var m = new MicroModel('T');

Notes
  [1] Count them the hard way to avoid difference between a possible counter
      and the actual number of pointers. An "easy" way would be to maintain
      a variable that keeps record on the number of fingers.

*/

var nudged = require('nudged');

module.exports = function MicroModel(type, pivot) {
  // Parameters
  //   type: transformation type string, default to 'I'

  if (typeof type === 'undefined') { type = 'I'; }
  if (typeof pivot === 'undefined') { pivot = [0, 0]; }

  var locations = {};
  var totalTrans = nudged.Transform.IDENTITY;
  var startTime = null;

  this.setType = function (transformationType) {
    type = transformationType;
  }

  this.setPivot = function (transformationPivot) {
    pivot = transformationPivot;
  }

  this.startPointers = function (pointers) {
    // Add to locations
    var i, p, isFirst;

    // Test if first. After pointers are added, this information decides
    // if we return an event to inform recognizer about started gesture.
    // See [1] for implementation design.
    isFirst = true;
    for (k in locations) {
      if (locations.hasOwnProperty(k)) {
        isFirst = false;
        break;
      }
    }

    for (i = 0; i < pointers.length; i += 1) {
      p = pointers[i];
      locations[p.id] = p.xy;
    }
    // If first pointer.
    // Otherwise, return null to inform recognizer that
    // this is not the first pointer.
    if (isFirst) {
      startTime = Date.now();
      return {
        duration: 0,
        totaltrans: totalTrans,
        microtrans: totalTrans
      };
    } // else
    return null;
  };

  this.movePointers = function (pointers) {
    // Return transformation event?

    var i, p, id, domain, range, microt;

    domain = [];
    range = [];
    id_order = [];

    // Construct domain from current locations
    for (id in locations) {
      if (locations.hasOwnProperty(id)) {
        id_order.push(id);
        domain.push(locations[id]);
      }
    }

    // Update locations
    for (i = 0; i < pointers.length; i += 1) {
      p = pointers[i];
      locations[p.id] = p.xy;
    }

    // Construct range from updated locations.
    for (i = 0; i < id_order.length; i += 1) {
      id = id_order[i];
      range.push(locations[id]);
    }

    // Estimate a microtransformation and produce new total.
    microt = nudged.estimate(type, domain, range, pivot);
    totalTrans = microt.multiplyBy(totalTrans);

    return {
      duration: Date.now() - startTime,
      totaltrans: totalTrans,
      microtrans: microt
    };
  };

  this.endPointers = function (pointers) {
    // Delete pointers
    var i, id, n, dur;
    for (i = 0; i < pointers.length; i += 1) {
      id = pointers[i].id;
      delete locations[id];
    }
    // Count pointers. If 0 left, return final event. Otherwise, return null.
    // See also [1]
    for (i in locations) {
      if (locations.hasOwnProperty(i)) {
        return null;
      }
    }
    return {
      duration: Date.now() - startTime,
      totaltrans: totalTrans,
      microtrans: nudged.Transform.IDENTITY
    };
  };

};
