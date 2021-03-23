const assert = require("assert").strict;
const { RosettaClient } = require("@lunarhq/rosetta-ts-client");
const { pub_key_to_address, address_to_hex, hex_encode } = require("./key.js");
const { transfer_combine } = require("./construction_combine.js");
const { transaction_hash } = require("./transaction_hash.js");

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
   * @param {import("@dfinity/authentication").Ed25519PublicKey} src_pub_key
   * @param {Buffer} dest_addr
   * @param {BigInt} count
   * @returns {Promise<import("@lunarhq/rosetta-ts-client").ConstructionPayloadsResponse>}
   */
  async transfer_pre_combine(src_pub_key, dest_addr, count) {
    const net_id = await this.network_identifier;
    const currency = await this.currency;

    const src_account = {
      address: address_to_hex(pub_key_to_address(src_pub_key)),
    };

    return this.payloads({
      network_identifier: net_id,
      operations: [
        {
          operation_identifier: { index: 0 },
          type: "TRANSACTION",
          account: src_account,
          amount: {
            value: `${-count}`,
            currency: currency,
          },
        },
        {
          operation_identifier: { index: 1 },
          type: "TRANSACTION",
          account: {
            address: address_to_hex(dest_addr),
          },
          amount: {
            value: `${count}`,
            currency: currency,
          },
        },
        {
          operation_identifier: { index: 2 },
          type: "FEE",
          account: src_account,
          amount: {
            value: `${-(await this.suggested_fee)}`,
            currency: currency,
          },
        },
      ],
      metadata: (await this.metadata({ network_identifier: net_id })).metadata,
      public_keys: [
        {
          hex_bytes: hex_encode(src_pub_key.toRaw()),
          curve_type: "edwards25519",
        },
      ],
    });
  }

  /**
   *
   * @param {import("@lunarhq/rosetta-ts-client").ConstructionCombineResponse} combine_res
   * @returns {Promise<import("@lunarhq/rosetta-ts-client").TransactionIdentifierResponse>}
   */
  async transfer_post_combine(combine_res) {
    const net_id = await this.network_identifier;

    return this.submit({
      network_identifier: net_id,
      signed_transaction: combine_res.signed_transaction,
    });
  }

  /**
   *
   * @param {import("@dfinity/authentication").Ed25519KeyIdentity} src_identity
   * @param {Buffer} dest_addr
   * @param {BigInt} count
   * @returns {Promise<import("@lunarhq/rosetta-ts-client").TransactionIdentifierResponse>}
   */
  async transfer(src_identity, dest_addr, count) {
    const payloads_res = await this.transfer_pre_combine(
      src_identity.getPublicKey(),
      dest_addr,
      count
    );

    const combine_res = await transfer_combine(src_identity, payloads_res);

    const submit_res = await this.transfer_post_combine(combine_res);

    assert(
      hex_encode(transaction_hash(payloads_res)) ===
        submit_res.transaction_identifier.hash
    );

    return submit_res;
  }
}

exports.Session = Session;
