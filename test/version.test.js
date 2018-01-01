
var taach = require('../index')
var pjson = require('../package.json')
var semver = require('semver')

module.exports = function (test) {
  test('taach.version', function (t) {
    t.ok(semver.valid(taach.version),
      'should be correctly formatted')
    t.equal(taach.version, pjson.version,
      'should be equal to version in package.json')
    t.end()
  })
}
