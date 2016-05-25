
exports.extend = function (target, source) {
  // Shallow object extend.
  // Return target.
  var k;
  for (k in source) {
    if (source.hasOwnProperty(k)) {
      target[k] = source[k];
    }
  }
  return target;
};

exports.convertToTransformationType = function (opts) {
  // Converts transformation mode object to transformation type string.
  //
  // Parameters:
  //   opts: alternative properties
  //
  if (opts.translate || opts.scale || opts.rotate) {
    if (opts.translate) {
      if (opts.scale) {
        if (opts.rotate) {
          return 'TSR';
        }  // else
        return 'TS';
      }  // else
      if (opts.rotate) {
        return 'TR';
      }  // else
      return 'T';
    }  // else
    if (opts.scale) {
      if (opts.rotate) {
        return 'SR';
      }  // else
      return 'S';
    }  // else
    return 'R';
  }  // else
  return 'I';
};
