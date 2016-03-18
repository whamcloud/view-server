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

var logger = require('../logger');
var getStoppedSupervisorServices = require('../supervisor/get-stopped-supervisor-services');
var format = require('util').format;
var renderRequestError = require('../lib/render-request-error');

module.exports = function checkForProblems (req, res, next) {
  var log = logger.child({ path: req.matches[0], middleware: 'checkForProblems' });

  getStoppedSupervisorServices()
    .errors(function handleErrors (err, push) {
      log.error(err);

      push(null, 'supervisor');
    })
    .toArray(function render (stopped) {
      if (stopped.length === 0)
        return next(req, res);

      var description = format('The following services are not running: \n\n%s\n\n', stopped.join('\n'));
      renderRequestError(res, description, null);
    });
};
