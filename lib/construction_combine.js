const assert = require("assert").strict;
const { hex_decode, pub_key_to_der } = require("./key.js");

/**
 *
 * @param {import("@lunarhq/rosetta-ts-client").ConstructionCombineRequest} req
 * @returns {import("@lunarhq/rosetta-ts-client").ConstructionCombineResponse}
 */
function combine(req) {
  assert(req.signatures.length === 1);
  const sig = req.signatures[0];

  const unsigned_transaction = JSON.parse(req.unsigned_transaction);
  unsigned_transaction.request_type = "call";

  return {
    signed_transaction: `{"content":{"request_type":"call",${req.unsigned_transaction.slice(
      1,
      -1
    )}},"sender_pubkey":${bufferToJSON(
      pub_key_to_der(hex_decode(sig.public_key.hex_bytes))
    )},"sender_sig":${bufferToJSON(
      hex_decode(sig.hex_bytes)
    )},"sender_delegation":null}`,
  };

  // TODO: FIX THIS UPSTREAM!!!
  return {
    signed_transaction: JSON.stringify({
      content: unsigned_transaction,
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

/**
 *
 * @param {ArrayBufferView} buf
 * @returns {string}
 */
function bufferToJSON(buf) {
  return `[${new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)}]`;
}
