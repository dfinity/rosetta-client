const { blobFromHex, blobToHex } = require("./blob");
const axios = require("axios");
const JSONbig = require("json-bigint")({ strict: true, useNativeBigInt: true });
const {
  key_sign,
  key_to_pub_key,
  pub_key_to_address,
  address_from_hex,
  address_to_hex,
} = require("./key");
const { transfer_combine } = require("./construction_combine");

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
      proxy: params.proxy,
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
        res.suggested_fee.find(
          (fee) => fee.currency.symbol === (params.symbol || "ICP")
        )
      );

    /**
     * @type {Promise<Currency>}
     */
    this.currency = suggested_fee.then((fee) => fee.currency);

    /**
     * @type {Promise<bigint>}
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
   * @param {bigint} count
   * @param {bigint?} max_fee
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
   * @returns {Promise<TransactionIdentifierResponse>}
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
   * @param {bigint} count
   * @param {bigint?} max_fee
   * @param {object?} opts
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

    const submit_res = await this.transfer_post_combine(combine_res);

    return submit_res;
  }

  /**
   *
   * @param {Buffer} src_key
   * @param {ConstructionPayloadsResponse} payloads_res
   * @returns {Promise<TransactionIdentifierResponse>}
   */
  async combine_submit(src_key, payloads_res) {
    const net_id = await this.network_identifier;

    const src_pub_key = key_to_pub_key(src_key);
    const src_pub_key_obj = {
      hex_bytes: blobToHex(src_pub_key),
      curve_type: "edwards25519",
    };

    const combine_res = await this.combine({
      network_identifier: net_id,
      signatures: payloads_res.payloads.map((p) => ({
        signing_payload: p,
        public_key: src_pub_key_obj,
        signature_type: "ed25519",
        hex_bytes: blobToHex(key_sign(src_key, blobFromHex(p.hex_bytes))),
      })),
      unsigned_transaction: payloads_res.unsigned_transaction,
    });

    const submit_res = await this.transfer_post_combine(combine_res);
    return submit_res;
  }

  /**
   *
   * @param {Buffer} src_pub_key
   * @param {bigint?} neuron_idx
   * @returns {Promise<Buffer>}
   */
  async neuron_address(src_pub_key, neuron_idx) {
    const net_id = await this.network_identifier;

    const derive_res = await this.derive({
      network_identifier: net_id,
      public_key: {
        hex_bytes: blobToHex(src_pub_key),
        curve_type: "edwards25519",
      },
      metadata: {
        account_type: "neuron",
        neuron_index: neuron_idx,
      },
    });

    return address_from_hex(derive_res.account_identifier.address);
  }

  /**
   *
   * @param {Buffer} src_pub_key
   * @param {bigint} neuron_idx
   * @returns {Promise<AccountBalanceResponse>}
   */
  async neuron_public_info(src_pub_key, neuron_idx) {
    const net_id = await this.network_identifier;

    const src_pub_key_obj = {
      hex_bytes: blobToHex(src_pub_key),
      curve_type: "edwards25519",
    };

    const neuron_addr = await this.neuron_address(src_pub_key, neuron_idx);

    const balance_res = await this.accountBalance({
      network_identifier: net_id,
      account_identifier: {
        address: address_to_hex(neuron_addr),
      },
      metadata: {
        account_type: "neuron",
        neuron_index: neuron_idx,
        public_key: src_pub_key_obj,
      },
    });

    return balance_res;
  }

  /**
   *
   * @param {Buffer} hot_key
   * @param {bigint} neuron_idx
   * @param {Buffer?} src_pub_key
   * @param {object?} opts
   * @returns {Promise<TransactionIdentifierResponse>}
   */
  async neuron_protected_info(hot_key, neuron_idx, src_pub_key, opts = {}) {
    const net_id = await this.network_identifier;

    const hot_pub_key = key_to_pub_key(hot_key);
    const hot_pub_key_obj = {
      hex_bytes: blobToHex(hot_pub_key),
      curve_type: "edwards25519",
    };

    if (!src_pub_key) src_pub_key = hot_pub_key;
    const src_pub_key_obj = {
      hex_bytes: blobToHex(src_pub_key),
      curve_type: "edwards25519",
    };
    const src_account = {
      address: address_to_hex(pub_key_to_address(src_pub_key)),
    };

    const payloads_res = await this.payloads({
      network_identifier: net_id,
      operations: [
        {
          operation_identifier: { index: 0 },
          type: "NEURON_INFO",
          account: src_account,
          metadata: {
            neuron_index: neuron_idx,
            controller: { public_key: src_pub_key_obj },
          },
        },
      ],
      metadata: opts,
      public_keys: [hot_pub_key_obj],
    });

    const submit_res = await this.combine_submit(hot_key, payloads_res);

    return submit_res;
  }

  /**
   *
   * @param {Buffer} src_key
   * @param {bigint} neuron_idx
   * @param {bigint} count
   * @param {bigint?} max_fee
   * @param {object?} opts
   * @returns {Promise<TransactionIdentifierResponse>}
   */
  async neuron_charge(
    src_key,
    neuron_idx,
    count,
    max_fee = undefined,
    opts = {}
  ) {
    const src_pub_key = key_to_pub_key(src_key);
    const neuron_addr = await this.neuron_address(src_pub_key, neuron_idx);
    const submit_res = await this.transfer(
      src_key,
      neuron_addr,
      count,
      max_fee,
      opts
    );
    return submit_res;
  }

  /**
   *
   * @param {Buffer} src_key
   * @param {bigint?} neuron_idx
   * @param {object?} opts
   * @returns {Promise<TransactionIdentifierResponse>}
   */
  async neuron_stake(src_key, neuron_idx, opts = {}) {
    const net_id = await this.network_identifier;

    const src_pub_key = key_to_pub_key(src_key);
    const src_account = {
      address: address_to_hex(pub_key_to_address(src_pub_key)),
    };
    const src_pub_key_obj = {
      hex_bytes: blobToHex(src_pub_key),
      curve_type: "edwards25519",
    };

    const payloads_res = await this.payloads({
      network_identifier: net_id,
      operations: [
        {
          operation_identifier: { index: 0 },
          type: "STAKE",
          account: src_account,
          metadata: {
            neuron_index: neuron_idx,
          },
        },
      ],
      metadata: opts,
      public_keys: [src_pub_key_obj],
    });

    const submit_res = await this.combine_submit(src_key, payloads_res);

    return submit_res;
  }

  /**
   *
   * @param {Buffer} src_key
   * @param {bigint} neuron_idx
   * @param {bigint} dissolve_time_utc_seconds
   * @param {object?} opts
   * @returns {Promise<TransactionIdentifierResponse>}
   */
  async neuron_set_dissolve_timestamp(
    src_key,
    neuron_idx,
    dissolve_time_utc_seconds,
    opts = {}
  ) {
    const net_id = await this.network_identifier;

    const src_pub_key = key_to_pub_key(src_key);
    const src_account = {
      address: address_to_hex(pub_key_to_address(src_pub_key)),
    };
    const src_pub_key_obj = {
      hex_bytes: blobToHex(src_pub_key),
      curve_type: "edwards25519",
    };

    const payloads_res = await this.payloads({
      network_identifier: net_id,
      operations: [
        {
          operation_identifier: { index: 0 },
          type: "SET_DISSOLVE_TIMESTAMP",
          account: src_account,
          metadata: {
            neuron_index: neuron_idx,
            dissolve_time_utc_seconds: dissolve_time_utc_seconds,
          },
        },
      ],
      metadata: opts,
      public_keys: [src_pub_key_obj],
    });

    const submit_res = await this.combine_submit(src_key, payloads_res);

    return submit_res;
  }

  async neuron_start_dissolving(src_key, neuron_idx, opts = {}) {
    const net_id = await this.network_identifier;

    const src_pub_key = key_to_pub_key(src_key);
    const src_account = {
      address: address_to_hex(pub_key_to_address(src_pub_key)),
    };
    const src_pub_key_obj = {
      hex_bytes: blobToHex(src_pub_key),
      curve_type: "edwards25519",
    };

    const payloads_res = await this.payloads({
      network_identifier: net_id,
      operations: [
        {
          operation_identifier: { index: 0 },
          type: "START_DISSOLVING",
          account: src_account,
          metadata: {
            neuron_index: neuron_idx,
          },
        },
      ],
      metadata: opts,
      public_keys: [src_pub_key_obj],
    });

    const submit_res = await this.combine_submit(src_key, payloads_res);

    return submit_res;
  }

  async neuron_stop_dissolving(src_key, neuron_idx, opts = {}) {
    const net_id = await this.network_identifier;

    const src_pub_key = key_to_pub_key(src_key);
    const src_account = {
      address: address_to_hex(pub_key_to_address(src_pub_key)),
    };
    const src_pub_key_obj = {
      hex_bytes: blobToHex(src_pub_key),
      curve_type: "edwards25519",
    };

    const payloads_res = await this.payloads({
      network_identifier: net_id,
      operations: [
        {
          operation_identifier: { index: 0 },
          type: "STOP_DISSOLVING",
          account: src_account,
          metadata: {
            neuron_index: neuron_idx,
          },
        },
      ],
      metadata: opts,
      public_keys: [src_pub_key_obj],
    });

    const submit_res = await this.combine_submit(src_key, payloads_res);

    return submit_res;
  }

  async neuron_disburse(src_key, neuron_idx, dest_addr, count, opts = {}) {
    const net_id = await this.network_identifier;
    const currency = await this.currency;

    const src_pub_key = key_to_pub_key(src_key);
    const src_addr = pub_key_to_address(src_pub_key);
    const src_account = {
      address: address_to_hex(src_addr),
    };
    const src_pub_key_obj = {
      hex_bytes: blobToHex(src_pub_key),
      curve_type: "edwards25519",
    };

    if (!dest_addr) dest_addr = src_addr;

    const amount_obj = count
      ? {
          amount: {
            value: `${count}`,
            currency: currency,
          },
        }
      : {};

    const payloads_res = await this.payloads({
      network_identifier: net_id,
      operations: [
        {
          operation_identifier: { index: 0 },
          type: "DISBURSE",
          account: src_account,
          metadata: Object.assign(
            {
              neuron_index: neuron_idx,
              recipient: address_to_hex(dest_addr),
            },
            amount_obj
          ),
        },
      ],
      metadata: opts,
      public_keys: [src_pub_key_obj],
    });

    const submit_res = await this.combine_submit(src_key, payloads_res);

    return submit_res;
  }
}

exports.Session = Session;
