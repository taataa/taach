// Combines test suites and runs them as single tape.
//
var harness = require('./lib/harness')

var UNITS = {
  version: require('./version.test')
}

for (var unit in UNITS) {
  if (UNITS.hasOwnProperty(unit)) {
    UNITS[unit](harness(unit))
  }
}
