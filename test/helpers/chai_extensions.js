'use strict';

/*
 * Created by raisch on 10/31/14.
 */

/*jshint node:true, bitwise:true, camelcase:false, curly:true, undef:false, unused:false, eqeqeq:true, shadow:true */


var _ = require('lodash'),
    chai = require('chai');

/**
 * @module test/helpers/chai_extensions
 * @version 0.1.0
 * @mixes chai
 *
 * Extends chai with Joi specific assertions.
 */

(function () {
  'use strict';

  chai.use(function (_chai, utils) {

    var Assertion = _chai.Assertion;

    /**
     * Returns a (possibly empty) array of error messages from a Joi.validate response.
     * @param {object} result
     * @returns {*|Array}
     * @private
     */
    var getErrmsgs = function (result) {
      var err = result.error || {},
          details = err.details || [],
          errmsgs = _.pluck(details, 'message');
      return errmsgs || [];
    };

    /**
     * @name validationResult
     * @description Assert that target is a result of a Joi.validate
     * @example
     *      expect(target).to.[not].be.a.validationResult
     *      {target.should.[not].be.a}.validationResult
     *      assert.validationResult(target)
     */
    utils.addProperty(Assertion.prototype, 'validationResult', function () {
      var result = this._obj;
      this.assert(
          'object' === typeof result,
          'expected #{this} to be an object',
          'expected #{this} to not be an object'
      );
      this.assert(
          0 === _.chain(result).keys().difference(['error', 'value']).value().length,
          'expected #{this} to be a validationResult',
          'expected #{this} to not be a validationResult'
      );
    });

    /**
     * @name validate
     * @description Assert that target validates correctly
     * @example target.should.[not].validate
     */
    utils.addProperty(Assertion.prototype, 'validate', function () {
      var obj = this._obj;

      //noinspection BadExpressionStatementJS
      new Assertion(obj).validationResult;

      var error = obj.error || null,
          json = JSON.stringify(obj, null, '\t');

      this.assert(null === error,
          '#{this} should validate but does not: ' + json,
          '#{this} should not validate but it does'
      );
    });

    /**
     * @name error
     * @description
     * Assert that target contains one or more errors (unsuccessful validation).
     * Mutates current chainable object to be target.error.
     * @example target.should.[not].have.error
     */
    utils.addProperty(Assertion.prototype, 'error', function () {
      var obj = this._obj;

      //noinspection BadExpressionStatementJS
      new Assertion(obj).validationResult;

      var error = obj.error || null,
          json = JSON.stringify(obj, null, '\t');

      this.assert(null !== error,
          '#{this} should have error but does not: ' + json,
          '#{this} should not not have error but does: ' + json
      );
      utils.flag(this, 'object', error);
    });


    /**
     * @name value
     * @description
     * Assert that target contains a value.
     * Mutates current chainable object to be target.error.
     * @example target.should.[not].have.value
     */
    utils.addProperty(Assertion.prototype, 'value', function () {
      var obj = this._obj,
          value = obj.value || {};

      //noinspection BadExpressionStatementJS
      new Assertion(obj).validationResult;

      this.assert(null !== value,
          '#{this} should have value',
          '#{this} should not have value'
      );
      utils.flag(this, 'object', value);
    });

    /**
     * @name errmsgs
     * @description
     * Assert that target contains one or more error messages (unsuccessful validation).
     * Mutates current chainable object to be list {String[]} of error messages.
     * @example
     *      target.should.[not].have.errmsgs
     *      target.should.have.errmsgs.that.contain(errmsg)
     */
    utils.addProperty(Assertion.prototype, 'errmsgs', function () {
      var obj = this._obj,
          errmsgs = getErrmsgs(obj);
      this.assert(
          'array' === utils.type(errmsgs) && errmsgs.length > 0,
          'expected #{this} to have errmsgs',
          'expected #{this} to not have errmsgs'
      );
      utils.flag(this, 'object', errmsgs);
    });

    /**
     * @method errmsg
     * @param {String} msg
     * @description Assert that target contains specified error message (unsuccessful validation).
     * @example
     *      target.should.[not].have.errmsg(msg)
     */
    Assertion.addMethod('errmsg', function (msg) {
      var obj = this._obj, errmsgs = getErrmsgs(obj);
      this.assert(
          _.contains(errmsgs, msg),
          'expected #{this} to have an error message: #{errmsg}',
          'expected #{this} to not an error message: #{errmsg}',
          msg,   // expected
          errmsgs   // actual
      );
    });

  });

})();