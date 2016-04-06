//
// INTEL CONFIDENTIAL
//
// Copyright 2013-2016 Intel Corporation All Rights Reserved.
//
// The source code contained or described herein and all documents related
// to the source code ("Material") are owned by Intel Corporation or its
// suppliers or licensors. Title to the Material remains with Intel Corporation
// or its suppliers and licensors. The Material contains trade secrets and
// proprietary and confidential information of Intel or its suppliers and
// licensors. The Material is protected by worldwide copyright and trade secret
// laws and treaty provisions. No part of the Material may be used, copied,
// reproduced, modified, published, uploaded, posted, transmitted, distributed,
// or disclosed in any way without Intel's prior express written permission.
//
// No license under any patent, copyright, trade secret or other intellectual
// property right is granted to or conferred upon you by disclosure or delivery
// of the Materials, either expressly, by implication, inducement, estoppel or
// otherwise. Any license under such intellectual property rights must be
// express and approved by Intel in writing.

'use strict';

var λ = require('highland');
var _ = require('lodash');
var fp = require('intel-fp');
var conf = require('../conf');
var apiRequest = require('../lib/api-request');
var renderRequestError = require('../lib/render-request-error');
var through = require('intel-through');

module.exports = function getCache (req, res, data, next) {
  var cache;
  var calls = [
    ['filesystem', {}],
    ['target', {}],
    ['host', {}],
    ['power_control_type', {}],
    ['server_profile', {}],
    ['lnet_configuration', {
      qs: {
        dehydrate__host: false
      }
    }],
    ['alert', {
      jsonMask: 'objects(affected,message)',
      qs: {
        active: true
      }
    }],
    ['job', {
      jsonMask: 'objects(write_locks,read_locks,description)',
      qs: {
        state__in: ['pending', 'tasked']
      }
    }]
  ];

  if (data.session.user != null || conf.get('ALLOW_ANONYMOUS_READ'))
    cache = λ(calls)
      .map(function performCalls (call) {
        return apiRequest(
          '/' + call[0],
          _.merge(
            {
              headers: {
                Cookie: data.cacheCookie
              },
              qs: {
                limit: 0
              }
            },
            call[1]
          )
        );
      })
      .parallel(calls.length)
      .pluck('body')
      .pluck('objects');
  else
    cache = λ(_.times(calls.length, fp.always([])));

  cache
    .through(through.zipObject(calls.map(function (call) {
      return call[0];
    })))
    .stopOnError(renderRequestError(res, function writeDescription (err) {
      return 'Exception rendering resources: ' + err.stack;
    }))
    .each(function setCache (cache) {
      cache.session = data.session;

      data.cache = cache;

      next(req, res, data);
    });
};
