'use strict';

const { url } = require('../lib/api');

// GET /v1/files answers the organization's 100 newest files, newest first. The trigger keeps the ones that
// have finished; Zapier deduplicates on `id`, so each file fires once. Files need a live key: with a
// sandbox key the api answers 501 sandbox_not_available, shown as it is.
const perform = async (z, bundle) => {
  const response = await z.request({ url: url('/v1/files') });
  return response.data.filter((file) => file.status === 'complete');
};

// The spec's FileJob example, as it reads once the file has run: 3 rows, 2 unique, 2 checks charged.
const sample = {
  id: 'fil_k2m9q7x3a8b4c5d6',
  name: 'leads.csv',
  status: 'complete',
  stage: 'complete',
  format: {
    bom: false,
    encoding: 'UTF-8',
    kind: 'csv',
    lenient: false,
    delimiter: ',',
  },
  columns: {
    email: 1,
    phone: 2,
    ip: -1,
    header_row: true,
  },
  rows: 3,
  unique_rows: 2,
  signals: ['phone_line_type'],
  country: 'MA',
  hold: '0.0000',
  charged: '0.0050',
  counters: {
    rows: 3,
    unique: 2,
    duplicates: 1,
    done: 2,
    unavailable: 0,
    deferred: 0,
    phone_line_type_runs: 2,
  },
  error: null,
  created_at: '2026-10-27T09:12:44.512031Z',
  expires_at: '2026-11-26T09:12:44.512031Z',
};

module.exports = {
  key: 'file_completed',
  noun: 'File',
  display: {
    // Title case: Zapier's check D018 (see creates/phone.js).
    label: 'File Completed',
    description:
      'Triggers when a file uploaded to ProofTell completes: its counters and what it was charged. ' +
      'Files need a live key; the results are downloaded from the dashboard or the api.',
  },
  operation: {
    type: 'polling',
    perform,
    sample,
    outputFields: [
      { key: 'id', label: 'File id', type: 'string' },
      { key: 'name', label: 'Name', type: 'string' },
      { key: 'status', label: 'Status', type: 'string' },
      { key: 'rows', label: 'Rows', type: 'integer' },
      { key: 'unique_rows', label: 'Unique rows', type: 'integer' },
      { key: 'country', label: 'Country', type: 'string' },
      { key: 'charged', label: 'Charged (USD)', type: 'string' },
      { key: 'counters__done', label: 'Rows done', type: 'integer' },
      { key: 'counters__duplicates', label: 'Duplicates', type: 'integer' },
      { key: 'counters__unavailable', label: 'Rows a source could not judge', type: 'integer' },
      { key: 'error', label: 'Error', type: 'string' },
      { key: 'created_at', label: 'Created at', type: 'datetime' },
      { key: 'expires_at', label: 'Expires at', type: 'datetime' },
    ],
  },
};
