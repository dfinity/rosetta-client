const { blobFromHex, blobToHex } = require("@dfinity/agent");
const {
  Ed25519PublicKey,
  Ed25519KeyIdentity,
} = require("@dfinity/authentication");

// Use specific export syntax to allow bundlers and IDEs to properly load dependencies.
module.exports = {
  blobFromHex: blobFromHex,
  blobToHex: blobToHex,
  Ed25519PublicKey: Ed25519PublicKey,
  Ed25519KeyIdentity: Ed25519KeyIdentity,
  ...require("./lib/chain"),
  ...require("./lib/construction_combine"),
  ...require("./lib/key"),
  ...require("./lib/patch"),
  ...require("./lib/session"),
  ...require("./lib/stats"),
  ...require("./lib/transaction_hash"),
};
