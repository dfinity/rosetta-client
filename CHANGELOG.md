# `0.4.0`

- Add support for flexible ingress expiry. (#27)
- Remove `ingress_expiry`/`memo` fields from result of
  `signed_transaction_decode`, since they are incompatible with flexible ingress
  expiry. (#27)
- Add example of calling `/search/transactions`. (#27)
- Remove `chain`/`stats` modules, since we no longer need to poll for latest
  blocks to check if a transaction hit the chain. (#27)
- Add NodeJS v10 support. (#27)

# `0.3.0`

- Update address logic to match upstream. Breaking change. (#14)
- Add `address_from_hex`/`address_to_hex` to handle hex encoding of addresses.
  Breaking change. (#14)
- `transfer_pre_combine` now requires source account's public key. Breaking
  change. (#14)
- Update `/construction/payloads` logic to match upstream. Breaking change.
  (#14)
- Update offline `/construction/combine` implementation to match upstream.
  Breaking change. (#13)
- Support decoding `signed_transaction`. (#22)
- Support bundling for NodeJS. (#18)
- Replace some internal utils by using `@dfinity/agent`, and use `tweetnacl` for
  ed25519 logic. (#16) (#17)
- Test against multiple Node.js major versions. (#15)

# `0.2.0`

- Use explicit `FEE` operations in `/construction/payloads` requests to
  represent the fee. Breaking change. (#10)
- Add new variant of transfer functions which consumes private key only in an
  isolated environment. (#9)

# `0.1.0`

- DER-encode the public key when deriving principal ids. Derived account
  addresses are different given the same keys, thus a breaking change. (#3)
- Support specifying seed in `key_new()`. (#5)
- Internal: offline /construction/combine. (#8)
- Internal: remove legacy default fee. (#7)
- Internal: add integration test. (#4)
- Internal: support syncing all blocks & dumping the balance book. (#2)

# `0.0.1`

- Initial release.
