'use strict';

// z.errors.Error packs its message, code and status into the error's message as JSON (Zapier unpacks it and
// shows the message). The tests read the three back the same way.
const appError = (error) => {
  try {
    return JSON.parse(error.message);
  } catch (_e) {
    return { message: error.message };
  }
};

module.exports = { appError };
