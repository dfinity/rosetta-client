const assert = require("assert").strict;
const IDL = require("@dfinity/agent").IDL;
const { cbor_decode, cbor_encode } = require("./cbor.js");
const { sha256 } = require("./hash.js");
const {
  address_to_hex,
  hex_decode,
  principal_id_to_address,
} = require("./key.js");

const ICPTsType = IDL.Record({ doms: IDL.Nat64 });

const MemoType = IDL.Nat64;

const AccountIdentifierType = IDL.Text;

const SubAccountType = IDL.Vec(IDL.Nat8);

const SendArgsType = IDL.Record({
  memo: MemoType,
  amount: ICPTsType,
  fee: ICPTsType,
  from_subaccount: IDL.Opt(SubAccountType),
  to: AccountIdentifierType,
  block_height: IDL.Opt(IDL.Nat64),
});

/**
 *
 * @param {import("@lunarhq/rosetta-ts-client").ConstructionPayloadsResponse} payloads_res
 * @returns {Buffer}
 */
function transaction_hash(payloads_res) {
  const update = cbor_decode(hex_decode(payloads_res.unsigned_transaction));
  assert(update.method_name === "send");
  const send_args = SendArgs_decode(update.arg);
  return sha256([
    cbor_encode(
      new Map([
        [
          0,
          new Map([
            [
              2,
              new Map([
                [0, address_to_hex(principal_id_to_address(update.sender))],
                [1, send_args.to],
                [2, new Map([[0, send_args.amount]])],
                [3, new Map([[0, send_args.fee]])],
              ]),
            ],
          ]),
        ],
        [1, send_args.memo],
        [2, send_args.block_height],
      ])
    ),
  ]);
}

exports.transaction_hash = transaction_hash;

/**
 *
 * @param {Buffer} buf
 * @returns {object}
 */
function SendArgs_decode(buf) {
  const arr = IDL.decode([SendArgsType], buf);
  assert(arr.length === 1);
  const send_args = arr[0];
  return {
    memo: bigintFromBigNumber(send_args.memo),
    amount: bigintFromBigNumber(send_args.amount.doms),
    fee: bigintFromBigNumber(send_args.fee.doms),
    to: send_args.to,
    block_height: bigintFromBigNumber(send_args.block_height[0]),
  };
}

/**
 *
 * @param {import("bignumber.js").BigNumber} n
 * @returns {bigint}
 */
function bigintFromBigNumber(n) {
  return BigInt(n.toString());
}
