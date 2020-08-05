const knownErrors = {
  ETIMEDOUT: "Connection to the server has timed out. Sorry.",
  "400": "Bad request, chat not found",
};

function getErrorMessage(code) {
  if (knownErrors[code]) {
    return knownErrors[code];
  } else {
    return "Unknown error. Error code: " + code;
  }
}

module.exports = {
  getErrorMessage,
};
