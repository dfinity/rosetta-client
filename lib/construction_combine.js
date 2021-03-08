const assert = require("assert").strict;
const JSONbig = require("json-bigint")({ strict: true, useNativeBigInt: true });
const {
  hex_decode,
  hex_encode,
  key_sign,
  key_to_pub_key,
  pub_key_to_der,
} = require("./key.js");

function transfer_combine(src_key, payloads_res) {
  return combine({
    signatures: payloads_res.payloads.map((p) => ({
      signing_payload: p,
      public_key: {
        hex_bytes: hex_encode(key_to_pub_key(src_key)),
        curve_type: "edwards25519",
      },
      signature_type: "ed25519",
      hex_bytes: hex_encode(key_sign(src_key, hex_decode(p.hex_bytes))),
    })),
    unsigned_transaction: payloads_res.unsigned_transaction,
  });
}
exports.transfer_combine = transfer_combine;

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

/**
 *
 * @param {Buffer} buf
 * @returns {Array<number>}
 */
function arrayFromBuffer(buf) {
  return Array.from(buf);
}
