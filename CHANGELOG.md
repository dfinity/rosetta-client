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
