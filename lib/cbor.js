const assert = require("assert").strict;
const cbor = require("cbor");

/**
 *
 * @param {Buffer} buf
 * @returns {any}
 */
function cbor_decode(buf) {
  const res = cbor.decodeAllSync(buf);
  assert(res.length === 1);
  return res[0];
}

exports.cbor_decode = cbor_decode;

/**
 *
 * @param {any} value
 * @returns {Buffer}
 */
function cbor_encode(value) {
  return cbor.encodeOne(value, { collapseBigIntegers: true });
}

exports.cbor_encode = cbor_encode;
