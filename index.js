require("./lib/nodejs-10");
const { blobFromHex, blobToHex } = require("@dfinity/agent");

// Use specific export syntax to allow bundlers and IDEs to properly load dependencies.
module.exports = {
  blobFromHex: blobFromHex,
  blobToHex: blobToHex,
  ...require("./lib/construction_combine"),
  ...require("./lib/key"),
  ...require("./lib/session"),
  ...require("./lib/signed_transaction_decode"),
};
