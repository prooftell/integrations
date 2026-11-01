'use strict';

const authentication = require('./authentication');
const { befores, afters } = require('./middleware');
const phone = require('./creates/phone');
const email = require('./creates/email');
const ip = require('./creates/ip');
const assess = require('./creates/assess');
const fileCompleted = require('./triggers/file_completed');

// The ProofTell app for Zapier: four creates (a check runs and is charged, so none is a search) and one
// polling trigger, on the public api with an API key. The names are the ones every ProofTell connector uses.
module.exports = {
  version: require('./package.json').version,
  platformVersion: require('zapier-platform-core').version,

  authentication,

  // Empty values are handled here (lib/api.js strips them from each request body), not by the platform.
  flags: { cleanInputData: false },

  beforeRequest: [...befores],
  afterResponse: [...afters],

  triggers: {
    [fileCompleted.key]: fileCompleted,
  },

  searches: {},

  creates: {
    [phone.key]: phone,
    [email.key]: email,
    [ip.key]: ip,
    [assess.key]: assess,
  },

  resources: {},
};
