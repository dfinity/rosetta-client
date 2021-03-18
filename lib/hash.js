const crypto = require("crypto");

/**
 *
 * @param {Array<Buffer>} chunks
 * @returns {Buffer}
 */
function sha256(chunks) {
  const hasher = crypto.createHash("sha256");
  chunks.forEach((chunk) => hasher.update(chunk));
  return hasher.digest();
}

exports.sha256 = sha256;

/**
 *
 * @param {Array<Buffer>} chunks
 * @returns {Buffer}
 */
function sha224(chunks) {
  const h = crypto.createHash("sha224");
  chunks.forEach((chunk) => h.update(chunk));
  return h.digest();
}

exports.sha224 = sha224;
