'use strict';

// Where the api lives. Shipped code talks to production; the tests point PROOFTELL_API_BASE at staging
// (https://api.prooftell.dev). Nothing else in the app reads the environment.
const BASE_URL = process.env.PROOFTELL_API_BASE || 'https://api.prooftell.com';

const url = (path) => `${BASE_URL}${path}`;

// A check's request body: the fields the user filled, and only those. Zapier hands an unfilled optional field
// over as an empty string, which the api would refuse as an invalid country or level.
const body = (inputData, keys) => {
  const out = {};
  for (const key of keys) {
    const value = inputData[key];
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  }
  return out;
};

module.exports = { BASE_URL, url, body };
