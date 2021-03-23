const assert = require("assert").strict;
const authentication = require("@dfinity/authentication");
const cbor = require("cbor");
const { cbor_decode, cbor_encode } = require("./cbor.js");
const { sha256 } = require("./hash.js");
const { hex_decode, hex_encode } = require("./key.js");

/**
 *
 * @param {import("@dfinity/authentication").Ed25519KeyIdentity} src_identity
 * @param {import("@lunarhq/rosetta-ts-client").ConstructionPayloadsResponse} payloads_res
 * @returns {Promise<import("@lunarhq/rosetta-ts-client").ConstructionCombineResponse>}
 */
async function transfer_combine(src_identity, payloads_res) {
  return combine({
    signatures: await Promise.all(
      payloads_res.payloads.map(async (p) => ({
        signing_payload: p,
        public_key: {
          hex_bytes: hex_encode(src_identity.getPublicKey().toRaw()),
          curve_type: "edwards25519",
        },
        signature_type: "ed25519",
        hex_bytes: hex_encode(await src_identity.sign(hex_decode(p.hex_bytes))),
      }))
    ),
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
  assert(req.signatures.length === 2);

  const update = cbor_decode(hex_decode(req.unsigned_transaction));
  const read_state = make_read_state_from_update(update);

  const transaction_signature = req.signatures.find(
    (sig) =>
      hex_decode(sig.signing_payload.hex_bytes).compare(
        make_sig_data(HttpCanisterUpdate_id(update))
      ) === 0
  );

  const read_state_signature = req.signatures.find(
    (sig) =>
      hex_decode(sig.signing_payload.hex_bytes).compare(
        make_sig_data(HttpReadState_representation_independent_hash(read_state))
      ) === 0
  );

  const envelope = {
    content: Object.assign({ request_type: "call" }, update),
    sender_pubkey: authentication.Ed25519PublicKey.fromRaw(
      hex_decode(transaction_signature.public_key.hex_bytes)
    ).toDer(),
    sender_sig: hex_decode(transaction_signature.hex_bytes),
    sender_delegation: null,
  };
  envelope.content.encodeCBOR = cbor.Encoder.encodeIndefinite;

  const read_state_envelope = {
    content: Object.assign({ request_type: "read_state" }, read_state),
    sender_pubkey: authentication.Ed25519PublicKey.fromRaw(
      hex_decode(read_state_signature.public_key.hex_bytes)
    ).toDer(),
    sender_sig: hex_decode(read_state_signature.hex_bytes),
    sender_delegation: null,
  };
  read_state_envelope.content.encodeCBOR = cbor.Encoder.encodeIndefinite;

  const envelopes = [envelope, read_state_envelope];
  const signed_transaction = hex_encode(cbor_encode(envelopes));

  return { signed_transaction: signed_transaction };
}

/**
 *
 * @param {object} update
 * @returns {object}
 */
function make_read_state_from_update(update) {
  return {
    sender: update.sender,
    paths: [[Buffer.from("request_status"), HttpCanisterUpdate_id(update)]],
    ingress_expiry: update.ingress_expiry,
  };
}

/**
 *
 * @param {object} read_state
 * @returns {Buffer}
 */
function HttpReadState_representation_independent_hash(read_state) {
  return hash_of_map({
    request_type: "read_state",
    ingress_expiry: read_state.ingress_expiry,
    paths: read_state.paths,
    sender: read_state.sender,
  });
}

const DOMAIN_IC_REQUEST = Buffer.from("\x0Aic-request");

/**
 *
 * @param {Buffer} message_id
 * @returns {Buffer}
 */
function make_sig_data(message_id) {
  return Buffer.concat([DOMAIN_IC_REQUEST, message_id]);
}

/**
 *
 * @param {object} update
 * @returns {Buffer}
 */
function HttpCanisterUpdate_id(update) {
  return HttpCanisterUpdate_representation_independent_hash(update);
}

/**
 *
 * @param {object} update
 * @returns {Buffer}
 */
function HttpCanisterUpdate_representation_independent_hash(update) {
  return hash_of_map({
    request_type: "call",
    canister_id: update.canister_id,
    method_name: update.method_name,
    arg: update.arg,
    ingress_expiry: update.ingress_expiry,
    sender: update.sender,
  });
}

/**
 *
 * @param {object} map
 * @returns {Buffer}
 */
function hash_of_map(map) {
  const hashes = [];
  for (const key in map) {
    hashes.push(hash_key_val(key, map[key]));
  }
  hashes.sort((buf0, buf1) => buf0.compare(buf1));
  return sha256(hashes);
}

/**
 *
 * @param {string} key
 * @param {string|Buffer|BigInt} val
 * @returns {Buffer}
 */
function hash_key_val(key, val) {
  return Buffer.concat([hash_string(key), hash_val(val)]);
}

/**
 *
 * @param {string|Buffer|BigInt} val
 * @returns {Buffer}
 */
function hash_val(val) {
  if (typeof val === "string") {
    return hash_string(val);
  }
  if (Buffer.isBuffer(val)) {
    return hash_bytes(val);
  }
  if (typeof val === "bigint") {
    return hash_U64(val);
  }
  if (Array.isArray(val)) {
    return hash_array(val);
  }
  throw new Error(`hash_val(${val}) unsupported`);
}

/**
 *
 * @param {string} value
 * @returns {Buffer}
 */
function hash_string(value) {
  return sha256([value]);
}

/**
 *
 * @param {Buffer} value
 * @returns {Buffer}
 */
function hash_bytes(value) {
  return sha256([value]);
}

/**
 *
 * @param {BigInt} n
 * @returns {Buffer}
 */
function hash_U64(n) {
  const buf = Buffer.allocUnsafe(10);
  let i = 0;
  while (true) {
    const byte = Number(n & 0x7fn);
    n >>= 7n;
    if (n === 0n) {
      buf[i] = byte;
      break;
    } else {
      buf[i] = byte | 0x80;
      ++i;
    }
  }
  return hash_bytes(buf.subarray(0, i + 1));
}

/**
 *
 * @param {Array<any>} elements
 * @returns {Buffer}
 */
function hash_array(elements) {
  return sha256(elements.map(hash_val));
}
