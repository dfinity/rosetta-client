import assert from "assert";
import crc from "crc";
import crypto from "crypto";
import forge from "node-forge";
import rfc4648 from "rfc4648";

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
export function hex_decode(s) {
  return bufferFromArrayBufferView(rfc4648.base16.parse(s));
}

/**
 *
 * @param {Buffer} buf
 * @returns {string}
 */
export function hex_encode(buf) {
  return rfc4648.base16.stringify(buf).toLowerCase();
}

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
 * @returns {Buffer}
 */
export function key_new() {
  return forge.pki.ed25519.generateKeyPair().privateKey;
}

/**
 * Given a private key, generate its public key used for signing.
 * @param {Buffer} priv_key
 * @returns {Buffer}
 */
export function key_to_pub_key(priv_key) {
  return forge.pki.ed25519.publicKeyFromPrivateKey({
    privateKey: priv_key,
  });
}

/**
 * Given a private key, sign a message.
 * @param {Buffer} priv_key
 * @param {Buffer} msg
 * @returns {Buffer}
 */
export function key_sign(priv_key, msg) {
  return forge.pki.ed25519.sign({ message: msg, privateKey: priv_key });
}

/**
 *
 * @param {Buffer} buf
 * @returns {Buffer}
 */
function sha224(buf) {
  const h = crypto.createHash("sha224");
  h.update(buf);
  return h.digest();
}

/**
 * Given a private key, generate the account address.
 * @param {Buffer} priv_key
 * @returns {Buffer}
 */
export function key_to_address(priv_key) {
  const pub_key = key_to_pub_key(priv_key);
  const pub_key_hash = sha224(pub_key);
  const principal_id_buf = Buffer.allocUnsafe(pub_key_hash.length + 1);
  pub_key_hash.copy(principal_id_buf, 0);
  principal_id_buf.writeUInt8(TYPE_SELF_AUTH, pub_key_hash.length);
  return principal_id_buf;
}

/**
 * Given an account address, generate its textual representation.
 * @param {Buffer} buf
 * @returns {string}
 */
export function principal_id_encode(buf) {
  return base32_encode(crc32_add(buf));
}

/**
 * Decode the textual representation of an account address.
 * @param {string} s
 * @returns {Buffer}
 */
export function principal_id_decode(s) {
  return crc32_del(base32_decode(s));
}
