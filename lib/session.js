const { RosettaClient } = require("@lunarhq/rosetta-ts-client");
const {
  hex_decode,
  hex_encode,
  key_sign,
  key_to_pub_key,
  pub_key_to_address,
} = require("./key.js");
const { combine } = require("./construction_combine.js");

class Session extends RosettaClient {
  /**
   *
   * @param {import("@lunarhq/rosetta-ts-client").RosettaClientParams} params
   */
  constructor(params) {
    super(params);

    /**
     * @type {Promise<import("@lunarhq/rosetta-ts-client").NetworkIdentifier>}
     */
    this.network_identifier = this.networksList({}).then((res) =>
      res.network_identifiers.find(
        (net_id) => net_id.blockchain === "Internet Computer"
      )
    );

    const suggested_fee = this.network_identifier
      .then((net_id) => this.metadata({ network_identifier: net_id }))
      .then((res) =>
        res.suggested_fee.find((fee) => fee.currency.symbol === "ICP")
      );

    /**
     * @type {import("@lunarhq/rosetta-ts-client").Currency}
     */
    this.currency = suggested_fee.then((fee) => fee.currency);

    /**
     * @type {BigInt}
     */
    this.suggested_fee = suggested_fee.then((fee) => BigInt(fee.value));
  }

  /**
   *
   * @param {Buffer} src_addr
   * @param {Buffer} dest_addr
   * @param {BigInt} count
   * @returns {Promise<import("@lunarhq/rosetta-ts-client").ConstructionPayloadsResponse>}
   */
  async transfer_pre_combine(src_addr, dest_addr, count) {
    const net_id = await this.network_identifier;
    const currency = await this.currency;

    return this.payloads({
      network_identifier: net_id,
      operations: [
        {
          operation_identifier: { index: 0 },
          type: "TRANSACTION",
          account: {
            address: hex_encode(src_addr),
          },
          amount: {
            value: `${-count - (await this.suggested_fee)}`,
            currency: currency,
          },
        },
        {
          operation_identifier: { index: 1 },
          related_operations: [{ index: 0 }],
          type: "TRANSACTION",
          account: {
            address: hex_encode(dest_addr),
          },
          amount: {
            value: `${count}`,
            currency: currency,
          },
        },
      ],
      metadata: (await this.metadata({ network_identifier: net_id })).metadata,
    });
  }

  /**
   *
   * @param {Buffer} src_key
   * @param {Buffer} dest_addr
   * @param {BigInt} count
   * @returns {Promise<import("@lunarhq/rosetta-ts-client").TransactionIdentifierResponse>}
   */
  async transfer(src_key, dest_addr, count) {
    const net_id = await this.network_identifier;

    const payloads_res = await this.transfer_pre_combine(
      pub_key_to_address(key_to_pub_key(src_key)),
      dest_addr,
      count
    );

    const combine_res = combine({
      network_identifier: net_id,
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

    const submit_res = await this.submit({
      network_identifier: net_id,
      signed_transaction: combine_res.signed_transaction,
    });

    return submit_res;
  }
}

exports.Session = Session;
