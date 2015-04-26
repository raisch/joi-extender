'use strict';

/*
 * Created by raisch on 3/11/15.
 */

/*jshint node:true, bitwise:true, camelcase:false, curly:true, undef:false, unused:false, eqeqeq:true, shadow:true */

/*global __dirname:true */

//noinspection JSUnusedGlobalSymbols
var util = require('util'),
    path = require('path'),
    _ = require('lodash'),
    hoek = require('hoek'),
    joi = require('joi'),
    Any = require('joi/lib/any'),
    Errors = require('joi/lib/errors');

/**
 * @module joiExtender
 */

/**
 * @external Joi
 * @see {@link https://github.com/hapijs/joi}
 */

/**
 * Name of the new Joi validation type.
 * @typedef {string} ValidationTypeName
 * @alias module:joiExtender.ValidationTypeName
 */

/**
 * Joi validation type.
 * @name ValidationType
 * @class
 * @alias module:joiExtender.ValidationType
 */

/**
 * Joi-style chainable validation function.
 * @typedef {function} ValidationFunction
 * @alias module:joiExtender.ValidationFunction
 * @augments Joi.Any
 */

/**
 * Error messages.
 * @typedef {object} ValidationErrMsgs
 * @alias module:joiExtender.ValidationErrMsgs
 */

/**
 * Initial tests for new validator.
 * @typedef {object} ValidatorRequirements
 * @alias module:joiExtender.ValidatornRequirements
 */

/**
 * @typedef {object} ValidatorConfigOptions
 * @alias module:joiExtender.ValidatorConfigOptions
 * @property {ValidationErrMsgs} errmsgs
 * @property {ValidatorRequirements} requirements
 */

/**
 * Top-level Joi Validation Type Factory.
 * @alias module:joiExtender.typeFactory
 * @param {ValidationTypeName} type - name of the new validator
 * @param {ValidatorConfigOptions} [opts] - configuration options
 * @returns {ValidationType}
 */
var typeFactory = function (type, opts) {
  opts = opts || {};

  var _Proto_ = function () {
    Any.call(this);
    //noinspection JSPotentiallyInvalidUsageOfThis,JSUnusedGlobalSymbols
    this._type = type;
  };
  hoek.inherits(_Proto_, Any);

  var errmsgs = {};

  if (_.isObject(opts.errmsgs)) {
    _Proto_.ErrMsgs = opts.errmsgs;
  }

  errmsgs[type] = _Proto_.ErrMsgs || {};

  //noinspection JSUnusedGlobalSymbols
  _Proto_.prototype._base = function (value, state, options) {
    var err = null,
        keys = _.keys(opts.requirements);

    options.language = _.merge(errmsgs, options.language);

    for (var i = 0, len = keys.length; i < len; i++) {
      var name = keys[i],
          fn = opts.requirements[name];

      if (!_.isFunction(fn)) {
        throw new Error('requirement "' + name + '" requires a function');
      }

      if (!fn.call(this, value, state, options)) {
        err = Errors.create(type + '.' + name, null, state, options);
        break;
      }
    }

    return {
      value: value,
      errors: err
    };
  };

  _.forEach(opts.tests || {}, function (n, key) {
    var fn = opts.tests[key];

    if (!_.isFunction(fn)) {
      throw new Error('requirement "' + key + '" requires a function');
    }

    _Proto_.prototype[key] = function () {
      var args = _.flatten(arguments);

      return this._test(key, args, function (value, state, options) {

        options.language = _.merge(errmsgs, options.language);

        var result = fn(value, args, state, options),
            context = {
              value: value,
              args: args,
              options: options,
              state: state
            };

        return result ? Errors.create(type + '.' + result, context, state, options) : null;

      });
    };
  });

  return _Proto_;
};

/**
 * Creates an instance of a new top-level Joi Validator.
 * @alias module:joiExtender.create
 * @param {ValidationTypeName} type - name of the new validator
 * @param {ValidatorConfigOptions} [opts] - configuration options
 * @returns {ValidationFunction}
 */
var create = function (type, opts) {
  var ValidationType = typeFactory(type, opts);
  return /** @type ValidationFunction */new ValidationType();
};

/**
 * Container for known Validators
 * @alias module:joiExtender.Validators
 */
var Validators = {};

/** Constructs and installs a new validator so it can be registered in Joi.
 *
 * @alias module:joiExtender.addValidator
 * @param {ValidationTypeName} name
 * @param {ValidatorConfigOptions} opts
 *
 * @example
 *
 *  var _=require('lodash'),
 *      is_dma=require('is_dma'),
 *      joiExtender=require('joiExtender');
 *
 *  joiExtender.addValidator('dma',{
 *    errmsgs: {
 *      base: 'must be a string',
 *      invalid: 'is not a valid dma'
 *    },
 *    requirements: {
 *      base: _.isString,
 *      invalid: is_dma
 *    }
 *  });
 *
 *  var joi=joiExtender.registerType(require('joi'),'dma'); // register our new validator with Joi
 *
 *  joi.dma().validate('502'); // => true
 *
 */
var addValidator = function (name, opts) {
  Validators[name] = typeFactory(name, opts);
};

/**
 * Registers a previously installed Validator with Joi.
 * @alias module:joiExtender.registerType
 * @param {Joi} joi - instance of Joi
 * @param {ValidationTypeName} name
 * @returns {Joi}
 */
var registerType = function (joi, name) {

  if (!joi.isJoi) {
    throw new Error('requires joi');
  }

  if (!_.isString(name)) {
    throw new Error('requires a name');
  }

  var Validator = Validators[name];
  if (!Validator) {
    throw new Error('cannot find validator for type: ' + name);
  }

  var validate = Validator.prototype.validate;
  Validator.prototype.validate = function validateFacade(value, cb) {
    var obj = this.label(hoek.reach(this._settings, 'language.label') || 'value');
    return validate.call(obj, value, cb);
  };

  joi[name] = function () {
    return new Validator();
  };

  return joi;
};

/**
 * Exports.
 * @type {{create: Function, typeFactory: Function, registerType: Function, addValidator: Function, Validators: {}}}
 */
module.exports = {
  create: create,
  typeFactory: typeFactory,
  registerType: registerType,
  addValidator: addValidator,
  Validators: Validators
};
