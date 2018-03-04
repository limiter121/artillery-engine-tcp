'use strict';

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const net = require('net');
const debug = require('debug')('engine:tcp');
const A = require('async');
const _ = require('lodash');
const helpers = require('artillery-core/lib/engine_util');

function TCPEngine (script, ee) {
  this.script = script;
  this.ee = ee;
  this.helpers = helpers;
  this.config = script.config;

  return this;
}

TCPEngine.prototype.createScenario = function createScenario (scenarioSpec, ee) {
  const tasks = scenarioSpec.flow.map(rs => this.step(rs, ee));

  return this.compile(tasks, scenarioSpec.flow, ee);
};

TCPEngine.prototype.step = function step (rs, ee, opts) {
  opts = opts || {};
  let self = this;

  if (rs.loop) {
    let steps = _.map(rs.loop, function (rs) {
      return self.step(rs, ee, opts);
    });

    return this.helpers.createLoopWithCount(
      rs.count || -1,
      steps,
      {
        loopValue: rs.loopValue || '$loopCount',
        overValues: rs.over,
        whileTrue: self.config.processor
          ? self.config.processor[rs.whileTrue] : undefined
      });
  }

  if (rs.log) {
    return function log (context, callback) {
      return process.nextTick(function () { callback(null, context); });
    };
  }

  if (rs.think) {
    return this.helpers.createThink(rs, _.get(self.config, 'defaults.think', {}));
  }

  if (rs.function) {
    return function (context, callback) {
      let func = self.config.processor[rs.function];
      if (!func) {
        return process.nextTick(function () { callback(null, context); });
      }

      return func(context, ee, function () {
        return callback(null, context);
      });
    };
  }

  if (rs.send) {
    return function send (context, callback) {
      const payload = typeof rs.send.payload === 'object'
            ? JSON.stringify(rs.send.payload) : rs.send.payload;
      const buff = Buffer.from(payload, rs.send.encoding);

      const onError = err => {
        debug('Send error');
        ee.emit('error', err);
        return callback(err, context);
      };

      ee.emit('request');
      const startedAt = process.hrtime();

      context.client.once('error', function (error) {
        onError(error)
      })
      context.client.once('close', function (withError) {
        return onError('Socket closed', withError ? ' with error' : '')
      })
      context.client.once('data', function (data) {
        const endedAt = process.hrtime(startedAt);
        let delta = (endedAt[0] * 1e9) + endedAt[1];
        ee.emit('response', delta, data.toString('hex'), context._uid);
        debug('Response');
        debug(data);
        return callback(null, context);
      });
      context.client.write(buff, function (err) {
        if (err) return onError(err);
      });
    };
  }

  return function (context, callback) {
    return callback(null, context);
  };
};

TCPEngine.prototype.compile = function compile (tasks, scenarioSpec, ee) {
  const self = this;
  return function scenario (initialContext, callback) {
    const init = function init (next) {
      initialContext.client = net.createConnection(self.script.config.tcp.port, self.script.config.target)
      ee.emit('started');
      return next(null, initialContext);
    };

    let steps = [init].concat(tasks);

    A.waterfall(
      steps,
      function done (err, context) {
        if (err) {
          debug(err);
        }

        return callback(err, context);
      });
  };
};

module.exports = TCPEngine;
