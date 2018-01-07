
exports.extend = function (target, source) {
  // Shallow object extend.
  // Return a new object where keys and values of the source
  // are merged with or replaced by target's keys and values.
  //
  var k
  var obj = {}
  for (k in target) {
    if (target.hasOwnProperty(k)) {
      obj[k] = target[k]
    }
  }
  for (k in source) {
    if (source.hasOwnProperty(k)) {
      obj[k] = source[k]
    }
  }
  return obj
}

exports.convertToTransformationType = function (opts) {
  // Converts transformation mode object to transformation type string.
  //
  // Parameters:
  //   opts: alternative properties
  //
  if (opts.translate || opts.scale || opts.rotate) {
    if (opts.translate && !opts.pivot) {
      if (opts.scale) {
        if (opts.rotate) {
          return 'TSR'
        }  // else
        return 'TS'
      }  // else
      if (opts.rotate) {
        return 'TR'
      }  // else
      return 'T'
    }  // else
    if (opts.scale) {
      if (opts.rotate) {
        return 'SR'
      }  // else
      return 'S'
    }  // else
    return 'R'
  }  // else
  return 'I'
}
