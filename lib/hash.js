const js_sha256 = require("js-sha256");

/**
 *
 * @param {Array<Buffer>} chunks
 * @returns {Buffer}
 */
function sha256(chunks) {
  const hasher = js_sha256.sha256.create();
  chunks.forEach((chunk) => hasher.update(chunk));
  return Buffer.from(hasher.arrayBuffer());
}

exports.sha256 = sha256;

/**
 *
 * @param {Array<Buffer>} chunks
 * @returns {Buffer}
 */
function sha224(chunks) {
  const hasher = js_sha256.sha224.create();
  chunks.forEach((chunk) => hasher.update(chunk));
  return Buffer.from(hasher.arrayBuffer());
}

exports.sha224 = sha224;
