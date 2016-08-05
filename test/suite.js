/*jshint expr: true*/  // prevent error in ...be.a.Function

var chai = require('chai');
var semver = require('semver');

var taaspace = require('taaspace');
var taach = require('../index');



// Configuration

var should = chai.should();



// Define tests

describe('taach', function () {

  describe('version', function () {
    it('should be correctly formatted', function () {
      semver.valid(taach.version).should.be.True;
    });
  });
});
