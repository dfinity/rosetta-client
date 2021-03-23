const assert = require("assert").strict;
const agent = require("@dfinity/agent");
const crc = require("crc");
const rfc4648 = require("rfc4648");
const { sha224 } = require("./hash.js");

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

const SUB_ACCOUNT_ZERO = Buffer.alloc(32);
const ACCOUNT_DOMAIN_SEPERATOR = Buffer.from("\x0Aaccount-id");

/**
 *
 * @param {import("@dfinity/agent").Principal} pid
 * @returns {Buffer}
 */
function principal_id_to_address(pid) {
  return sha224([ACCOUNT_DOMAIN_SEPERATOR, pid.toBlob(), SUB_ACCOUNT_ZERO]);
}

exports.principal_id_to_address = principal_id_to_address;

/**
 * Given a public key, generate the account address.
 * @param {import("@dfinity/authentication").Ed25519PublicKey} pub_key
 * @returns {Buffer}
 */
function pub_key_to_address(pub_key) {
  return principal_id_to_address(
    agent.Principal.selfAuthenticating(pub_key.toDer())
  );
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
  return agent.blobToHex(crc32_add(addr_buf));
}

exports.address_to_hex = address_to_hex;
