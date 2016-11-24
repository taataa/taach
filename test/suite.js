/*jshint expr: true*/  // prevent error in ...be.a.Function

var chai = require('chai');
var semver = require('semver');

var taaspace = require('taaspace');
var taach = require('../index');
var pjson = require('../package.json');



// Configuration

var should = chai.should();



// Define tests

describe('taach', function () {

  describe('version', function () {
    it('should be correctly formatted', function () {
      semver.valid(taach.version).should.be.True;
    });

    it('should be equal to version in package.json', function () {
      pjson.version.should.equal(taach.version);
    });
  });
});
