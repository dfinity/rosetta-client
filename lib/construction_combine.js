const assert = require("assert").strict;
const JSONbig = require("json-bigint")({ strict: true, useNativeBigInt: true });
const { hex_decode, pub_key_to_der } = require("./key.js");

/**
 *
 * @param {import("@lunarhq/rosetta-ts-client").ConstructionCombineRequest} req
 * @returns {import("@lunarhq/rosetta-ts-client").ConstructionCombineResponse}
 */
function combine(req) {
  assert(req.signatures.length === 1);
  const sig = req.signatures[0];

  return {
    signed_transaction: JSONbig.stringify({
      content: Object.assign(
        { request_type: "call" },
        JSONbig.parse(req.unsigned_transaction)
      ),
      sender_pubkey: arrayFromBuffer(
        pub_key_to_der(hex_decode(sig.public_key.hex_bytes))
      ),
      sender_sig: arrayFromBuffer(hex_decode(sig.hex_bytes)),
      sender_delegation: null,
    }),
  };
}
exports.combine = combine;

/**
 *
 * @param {Buffer} buf
 * @returns {Array<number>}
 */
function arrayFromBuffer(buf) {
  return Array.from(buf);
}
