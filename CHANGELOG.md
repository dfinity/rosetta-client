# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2021-08-13
### Added
- `proxy` option (of type AxiosProxyConfig) to the Session constructor (#57).

## Changed
- Stricter checks in `address_from_hex` with better error messages (#56).

## [0.6.0] - 2021-07-21
### Changed
- BREAKING CHANGE: this version of the client switches to the new
  encoding of transactions introduced in the recent rosetta-node
  update (#47, #54).  The `transfer` method won't work with older
  versions of rosetta-node (docker images dfinity/rosetta-api:20210526
  and below).

## [0.5.2] - 2021-06-03
### Added
- Function `seed_from_pem` to support loading a private key from a PEM file generated
  by `dfx identity` command. (#42)

## [0.5.1] - 2021-04-23
### Fixed
- Fix `signed_transaction_decode` to work with upstream changes. (#34)

## [0.5.0] - 2021-04-22
### Fixed
- Fix a quadratic slowdown in offline combine implementation. (#33)
- Misc documentation fixes. (#33)

## [0.4.0] - 2021-04-15
### Added
- Support for flexible ingress expiry. (#27)
- An example of calling `/search/transactions`. (#27)
- NodeJS v10 support. (#27)

### Changed
- Remove `ingress_expiry`/`memo` fields from result of
  `signed_transaction_decode`, since they are incompatible with flexible ingress
  expiry. (#27)
- Remove `chain`/`stats` modules, since we no longer need to poll for latest
  blocks to check if a transaction hit the chain. (#27)

## [0.3.0] - 2021-04-02
### Added
- Add `address_from_hex`/`address_to_hex` to handle hex encoding of addresses.
  Breaking change. (#14)
- Support decoding `signed_transaction`. (#22)
- Support bundling for NodeJS. (#18)

### Changed
- Update address logic to match upstream (#14).
  BREAKING CHANGE.
- `transfer_pre_combine` now requires source account's public key (#14).
  BREAKING CHANGE.
- Update `/construction/payloads` logic to match upstream (#14).
  BREAKING CHANGE.
- Update offline `/construction/combine` implementation to match upstream (#13).
  BREAKING CHANGE.
- Replace some internal utils by using `@dfinity/agent`, and use `tweetnacl` for ed25519 logic (#16) (#17).
- Test against multiple Node.js major versions. (#15)

## [0.2.0] - 2021-03-08
### Added
- A new variant of transfer functions which consumes private key only in an isolated environment. (#9)

### Changed
- Use explicit `FEE` operations in `/construction/payloads` requests to represent the fee (#10).
  BREAKING CHANGE.

## [0.1.0] - 2021-03-03
### Added
- Support for specifying a seed in `key_new()`. (#5)

### Changed
- DER-encode the public key when deriving principal ids.
  Derived account addresses are different given the same keys, this is a BREAKING CHANGE. (#3)
- Internal: offline `/construction/combine`. (#8)
- Internal: remove legacy default fee. (#7)
- Internal: add integration test. (#4)
- Internal: support syncing all blocks & dumping the balance book. (#2)

## [0.0.1]

- Initial release.
