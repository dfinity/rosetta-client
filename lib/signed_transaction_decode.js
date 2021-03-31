const assert = require("assert").strict;
const { blobFromHex, Principal } = require("@dfinity/agent");
const { BinaryReader } = require("google-protobuf");
const tweetnacl = require("tweetnacl");
const { SendRequest } = require("../autogen/types_pb");
const { cbor_decode } = require("./cbor");
const { principal_id_to_address } = require("./key");

function joinUint64(lo, hi) {
  return (BigInt(hi) << 32n) | BigInt(lo);
}

function proto_reader_new(buf) {
  const reader = new BinaryReader(buf);
  reader.readUint64 = function () {
    return this.decoder_.readSplitVarint64(joinUint64);
  };
  return reader;
}

/**
 *
 * @param {string} s
 * @returns {object}
 */
function signed_transaction_decode(s) {
  const envelopes = cbor_decode(blobFromHex(s));
  assert(envelopes.length === 2);
  const envelope = envelopes[0];
  assert(envelope.content.request_type === "call");
  assert(envelope.content.method_name === "send");
  const send_args = SendRequest.deserializeBinaryFromReader(
    new SendRequest(),
    proto_reader_new(envelope.content.arg)
  ).toObject();
  assert(!send_args.fromSubaccount);
  return {
    from: principal_id_to_address(Principal.fromBlob(envelope.content.sender)),
    to: Buffer.from(send_args.to.hash, "base64").subarray(4),
    amount: send_args.payment.receiverGets.doms,
    fee: send_args.maxFee.doms,
    last_height: send_args.createdAt.height,
    sender_pubkey: envelope.sender_pubkey.subarray(
      envelope.sender_pubkey.byteLength -
        tweetnacl.lowlevel.crypto_sign_PUBLICKEYBYTES
    ),
    ingress_expiry: envelope.content.ingress_expiry,
    memo: send_args.memo.memo,
  };
}

exports.signed_transaction_decode = signed_transaction_decode;
