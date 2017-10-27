'use strict';
/* eslint-env node, es6, mocha */

/**
 * @Author: Raisch Rob <raisch>
 * @Date:   20150315
 * @Email:  raisch@gmail.com
 * @Last modified by:   raisch
 * @Last modified time: 20171027
 */

const path = require('path');
const _ = require('lodash');
const joi = require('joi');
const chai = require('chai');
const extender = require(path.resolve(__dirname, '../lib/extender'));
const isDma = require('is_dma');

let requirementsArguments = null;

chai.should(); // side effect!!: extends Object.prototype

require('./helpers/chai_extensions'); // side effect!!: extends chai

describe('extender', function () {
  before(function () {
    /**
     * Add a new Designated Market Area (dma) validator.
     * @see {@link http://github.com/raisch/is_dma}
     */
    extender.addValidator('dma', {
      errmsgs: {
        base: 'must be a string',
        invalid: 'is not a valid dma',
        badFoo: '"{{value}}" is not a foo-worthy {{key}}'
      },
      requirements: {
        base: function (value) {
          requirementsArguments = arguments;
          return _.isString(value);
        },
        invalid: function (value) {
          return isDma(value);
        }
      },
      tests: {
        isFoo: function (value, args, state, options) {
          if (value === '502') return 'badFoo';
        }
      }
    });
    /**
     * And register it with joi.
     */
    extender.registerType(joi, 'dma');
  });

  it('should support adding a new validator', function () {
    joi.should.have.property('dma');
  });

  it('should not validate without a value', function () {
    const result = joi.dma().required().label('dma').validate();
    result.should.have.errmsg('"dma" is required');
  });

  it('should not validate with a non-string', function () {
    const value = 1;
    const result = joi.dma().required().label('dma').validate(value);
    result.should.have.errmsg('"dma" must be a string');
  });

  it('should not validate with a bad dma', function () {
    var result = joi.dma().required().label('dma').validate('100');
    result.should.have.errmsg('"dma" is not a valid dma');
  });

  it('should validate with a good dma', function () {
    var result = joi.dma().required().label('dma').validate('501');
    result.should.not.have.errmsgs; // eslint-disable-line no-unused-expressions
  });

  it('should not validate with a non-foo-worthy dma', function () {
    var result = joi.dma().required().isFoo(1, 2, 3).label('dma').validate('502');
    result.should.have.errmsg('"502" is not a foo-worthy dma');
  });

  it('should have passed value, state, and options to requirements functions', function () {
    requirementsArguments.should.have.length(3);
    requirementsArguments[0].should.equal('502');
    requirementsArguments[1].should.have.property('key');
    requirementsArguments[2].should.have.property('abortEarly');
  });
});
