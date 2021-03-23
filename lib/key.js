const assert = require("assert").strict;
const crc = require("crc");
const forge = require("node-forge");
const rfc4648 = require("rfc4648");
const { sha224 } = require("./hash.js");

/**
 * The principal ids we create are always self-authenticating ones.
 */
const TYPE_SELF_AUTH = 0x02;

/**
 * Instead of Buffer.from(), this doesn't do a new allocation.
 * @param {ArrayBufferView} buf
 * @returns {Buffer}
 */
function bufferFromArrayBufferView(buf) {
  return Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
}

/**
 *
 * @param {string} s
 * @returns {Buffer}
 */
function hex_decode(s) {
  return bufferFromArrayBufferView(rfc4648.base16.parse(s));
}

exports.hex_decode = hex_decode;

/**
 *
 * @param {Buffer} buf
 * @returns {string}
 */
function hex_encode(buf) {
  return rfc4648.base16.stringify(buf).toLowerCase();
}

exports.hex_encode = hex_encode;

/**
 * This is used to decode the textual representation of an account address. The
 * return value needs further processing.
 * @param {string} s
 * @returns {Buffer}
 */
function base32_decode(s) {
  return bufferFromArrayBufferView(
    rfc4648.base32.parse(s.trim().replaceAll("-", ""), {
      loose: true,
    })
  );
}

/**
 * Given an account address with a prepended big-endian CRC32 checksum, verify
 * the checksum and remove it.
 * @param {Buffer} buf
 * @returns {Buffer}
 */
function crc32_del(buf) {
  const res = buf.subarray(4);
  assert(crc.crc32(res) === buf.readUInt32BE(0));
  return res;
}

/**
 * Prepend a big-endian CRC32 checksum.
 * @param {Buffer} buf
 * @returns {Buffer}
 */
function crc32_add(buf) {
  const res = Buffer.allocUnsafe(4 + buf.length);
  res.writeUInt32BE(crc.crc32(buf));
  buf.copy(res, 4);
  return res;
}

/**
 * Given an account address with a prepended big-endian CRC32 checksum, generate
 * its textual representation.
 * @param {Buffer} buf
 * @returns {string}
 */
function base32_encode(buf) {
  let s = rfc4648.base32.stringify(buf, { pad: false });
  let acc = "";
  while (s) {
    acc = `${acc}${s.substr(0, 5).toLowerCase()}${s.length > 5 ? "-" : ""}`;
    s = s.substr(5);
  }
  return acc;
}

/**
 * Generate a new private key.
 *
 * To specify a 32-byte binary seed, pass {seed: seed_buffer} as the argument.
 * @returns {Buffer}
 */
function key_new(options) {
  return forge.pki.ed25519.generateKeyPair(options).privateKey;
}

exports.key_new = key_new;

/**
 * Given a private key, generate its public key used for signing.
 * @param {Buffer} priv_key
 * @returns {Buffer}
 */
function key_to_pub_key(priv_key) {
  return forge.pki.ed25519.publicKeyFromPrivateKey({
    privateKey: priv_key,
  });
}

exports.key_to_pub_key = key_to_pub_key;

/**
 * Given a private key, sign a message.
 * @param {Buffer} priv_key
 * @param {Buffer} msg
 * @returns {Buffer}
 */
function key_sign(priv_key, msg) {
  return forge.pki.ed25519.sign({ message: msg, privateKey: priv_key });
}

exports.key_sign = key_sign;

const der_header = Buffer.from([
  0x30,
  0x2a,
  0x30,
  0x05,
  0x06,
  0x03,
  0x2b,
  0x65,
  0x70,
  0x03,
  0x21,
  0x00,
]);

/**
 *
 * @param {Buffer} pub_key
 */
function pub_key_to_der(pub_key) {
  assert(pub_key.byteLength === 32);
  let buf = Buffer.allocUnsafe(12 + 32);
  der_header.copy(buf, 0);
  pub_key.copy(buf, 12);
  return buf;
}

exports.pub_key_to_der = pub_key_to_der;

/**
 *
 * @param {Buffer} buf
 */
function pub_key_from_der(buf) {
  return Buffer.from(
    forge.asn1.fromDer(forge.util.createBuffer(buf)).value[1].value,
    "binary"
  ).subarray(1);
}

/**
 *
 * @param {Buffer} pub_key
 * @returns {Buffer}
 */
function pub_key_to_principal_id(pub_key) {
  const pub_key_der_hash = sha224([pub_key_to_der(pub_key)]);
  const principal_id_buf = Buffer.allocUnsafe(pub_key_der_hash.length + 1);
  pub_key_der_hash.copy(principal_id_buf, 0);
  principal_id_buf.writeUInt8(TYPE_SELF_AUTH, pub_key_der_hash.length);
  return principal_id_buf;
}

const SUB_ACCOUNT_ZERO = Buffer.alloc(32);
const ACCOUNT_DOMAIN_SEPERATOR = Buffer.from("\x0Aaccount-id");

/**
 *
 * @param {Buffer} pid
 * @returns {Buffer}
 */
function principal_id_to_address(pid) {
  return sha224([ACCOUNT_DOMAIN_SEPERATOR, pid, SUB_ACCOUNT_ZERO]);
}

exports.principal_id_to_address = principal_id_to_address;

/**
 * Given a public key, generate the account address.
 * @param {Buffer} pub_key
 * @returns {Buffer}
 */
function pub_key_to_address(pub_key) {
  assert(pub_key.byteLength === 32);
  return principal_id_to_address(pub_key_to_principal_id(pub_key));
}

exports.pub_key_to_address = pub_key_to_address;

/**
 *
 * @param {string} hex_str
 * @returns {Buffer}
 */
function address_from_hex(hex_str) {
  const buf = hex_decode(hex_str);
  assert(buf.byteLength === 32);
  return crc32_del(buf);
}

exports.address_from_hex = address_from_hex;

/**
 *
 * @param {Buffer} addr_buf
 * @returns {string}
 */
function address_to_hex(addr_buf) {
  return hex_encode(crc32_add(addr_buf));
}

exports.address_to_hex = address_to_hex;

/**
 * Given an account address, generate its textual representation.
 * @param {Buffer} buf
 * @returns {string}
 */
function principal_id_encode(buf) {
  return base32_encode(crc32_add(buf));
}

/**
 * Decode the textual representation of an account address.
 * @param {string} s
 * @returns {Buffer}
 */
function principal_id_decode(s) {
  return crc32_del(base32_decode(s));
}
