const { blobToHex } = require("@dfinity/agent");
const axios = require("axios");
const JSONbig = require("json-bigint")({ strict: true, useNativeBigInt: true });
// const assert = require("assert").strict;
const { key_to_pub_key, pub_key_to_address, address_to_hex } = require("./key");
const { transfer_combine } = require("./construction_combine");
// const { signed_transaction_decode } = require("./signed_transaction_decode");

class Session {
  /**
   *
   * @param {RosettaClientParams} params
   */
  constructor(params) {
    /**
     * @type {axios.AxiosInstance}
     */
    this.axios = axios.create({
      baseURL: params.baseUrl,
      method: "post",
      transformRequest: (data) => JSONbig.stringify(data),
      transformResponse: (data) => JSONbig.parse(data),
      headers: { "Content-Type": "application/json;charset=utf-8" },
    });

    /**
     * @type {Promise<NetworkIdentifier>}
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
     * @type {Promise<Currency>}
     */
    this.currency = suggested_fee.then((fee) => fee.currency);

    /**
     * @type {Promise<BigInt>}
     */
    this.suggested_fee = suggested_fee.then((fee) => BigInt(fee.value));
  }

  /**
   *
   * @param {string} url
   * @param {object} req
   */
  async _request(url, req) {
    return (await this.axios.request({ url: url, data: req })).data;
  }

  accountBalance(req) {
    return this._request("/account/balance", req);
  }

  accountCoins(req) {
    return this._request("/account/coins", req);
  }

  block(req) {
    return this._request("/block", req);
  }

  blockTransaction(req) {
    return this._request("/block/transaction", req);
  }

  networksList(req) {
    return this._request("/network/list", req);
  }

  networkOptions(req) {
    return this._request("/network/options", req);
  }

  networkStatus(req) {
    return this._request("/network/status", req);
  }

  mempool(req) {
    return this._request("/mempool", req);
  }

  mempoolTransaction(req) {
    return this._request("/mempool/transaction", req);
  }

  combine(req) {
    return this._request("/construction/combine", req);
  }

  derive(req) {
    return this._request("/construction/derive", req);
  }

  hash(req) {
    return this._request("/construction/hash", req);
  }

  metadata(req) {
    return this._request("/construction/metadata", req);
  }

  parse(req) {
    return this._request("/construction/parse", req);
  }

  payloads(req) {
    return this._request("/construction/payloads", req);
  }

  preprocess(req) {
    return this._request("/construction/preprocess", req);
  }

  submit(req) {
    return this._request("/construction/submit", req);
  }

  transactions(req) {
    return this._request("/search/transactions", req);
  }

  /**
   *
   * @param {Buffer} src_pub_key
   * @param {Buffer} dest_addr
   * @param {BigInt} count
   * @param {BigInt?} max_fee
   * @param {object} opts
   * @returns {Promise<ConstructionPayloadsResponse>}
   */
  async transfer_pre_combine(src_pub_key, dest_addr, count, max_fee, opts) {
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
            value: `${-(typeof max_fee === "bigint"
              ? max_fee
              : await this.suggested_fee)}`,
            currency: currency,
          },
        },
      ],
      metadata: Object.assign(
        (await this.metadata({ network_identifier: net_id })).metadata,
        opts
      ),
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
   * @param {ConstructionCombineResponse} combine_res
   * @returns {TransactionIdentifierResponse>}
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
   * @param {BigInt?} max_fee
   * @param {object} opts
   * @returns {Promise<TransactionIdentifierResponse>}
   */
  async transfer(src_key, dest_addr, count, max_fee = undefined, opts = {}) {
    const payloads_res = await this.transfer_pre_combine(
      key_to_pub_key(src_key),
      dest_addr,
      count,
      max_fee,
      opts
    );

    const combine_res = transfer_combine(src_key, payloads_res);

    // const tx = signed_transaction_decode(combine_res.signed_transaction);

    // assert(tx.from.compare(pub_key_to_address(key_to_pub_key(src_key))) === 0);
    // assert(tx.to.compare(dest_addr) === 0);
    // assert(tx.amount === count);
    // assert(tx.fee === (await this.suggested_fee));
    // assert(tx.sender_pubkey.compare(key_to_pub_key(src_key)) === 0);

    const submit_res = await this.transfer_post_combine(combine_res);

    return submit_res;
  }
}

exports.Session = Session;
