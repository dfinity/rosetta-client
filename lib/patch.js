const authentication = require("@dfinity/authentication");
const tweetnacl = require("tweetnacl");

if (!authentication.Ed25519KeyIdentity.fromSecretKey) {
  authentication.Ed25519KeyIdentity.fromSecretKey = (secretKey) => {
    const keyPair = tweetnacl.sign.keyPair.fromSecretKey(secretKey);
    return authentication.Ed25519KeyIdentity.fromKeyPair(
      keyPair.publicKey,
      keyPair.secretKey
    );
  };
}
