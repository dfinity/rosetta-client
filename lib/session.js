const { blobToHex } = require("@dfinity/agent");
const { RosettaClient } = require("@lunarhq/rosetta-ts-client");
const assert = require("assert").strict;
const { key_to_pub_key, pub_key_to_address, address_to_hex } = require("./key");
const { transfer_combine } = require("./construction_combine");
const { signed_transaction_decode } = require("./signed_transaction_decode");

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
   * @param {Buffer} src_pub_key
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
          hex_bytes: blobToHex(src_pub_key),
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
   * @param {Buffer} src_key
   * @param {Buffer} dest_addr
   * @param {BigInt} count
   * @returns {Promise<import("@lunarhq/rosetta-ts-client").TransactionIdentifierResponse>}
   */
  async transfer(src_key, dest_addr, count) {
    const payloads_res = await this.transfer_pre_combine(
      key_to_pub_key(src_key),
      dest_addr,
      count
    );

    const combine_res = transfer_combine(src_key, payloads_res);

    const tx = signed_transaction_decode(combine_res.signed_transaction);

    assert(tx.from.compare(pub_key_to_address(key_to_pub_key(src_key))) === 0);
    assert(tx.to.compare(dest_addr) === 0);
    assert(tx.amount === count);
    assert(tx.fee === (await this.suggested_fee));
    assert(tx.sender_pubkey.compare(key_to_pub_key(src_key)) === 0);

    const submit_res = await this.transfer_post_combine(combine_res);

    return submit_res;
  }
}

exports.Session = Session;
