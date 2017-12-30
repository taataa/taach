
var test = require('tape')
var semver = require('semver')

var taach = require('../index')
var pjson = require('../package.json')

// Define tests

test('taach.version', function (t) {
  t.ok(semver.valid(taach.version),
    'should be correctly formatted')
  t.equal(taach.version, pjson.version,
    'should be equal to version in package.json')
  t.end()
})
