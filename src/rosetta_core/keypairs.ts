import * as fs from "fs";
import { readFileSync } from "fs";
import { ec as EC } from "elliptic";

const ec = new EC("secp256k1");

enum CurveType {
  Secp256k1 = "secp256k1",
  Ed25519 = "ed25519",
}

class PublicKey {
  hex_bytes: string;
  curve_type: CurveType;

  constructor(hex_bytes: string, curve_type: CurveType) {
    this.hex_bytes = hex_bytes;
    this.curve_type = curve_type;
  }
}

interface KeyPair<KeyType> {
  keypair: KeyType;
  getPublicKey(): PublicKey;
}

class Secp256k1KeyPair implements KeyPair<EC.KeyPair> {
  keypair: EC.KeyPair;
  constructor(pem_file_path: string) {
    this.keypair = this.loadPrivateKey(pem_file_path);
  }

  loadPrivateKey(file_path: string): EC.KeyPair {
    const keyFileContent = readFileSync(file_path, "utf8");
    const privateKey = ec.keyFromPrivate(
      this.parsePemToHex(keyFileContent),
      "hex",
    );
    return privateKey;
  }

  parsePemToHex(pem: string): string {
    const pemLines = pem.split("\n");
    const base64Content = pemLines
      .filter((line) => line && !line.startsWith("---"))
      .join("");
    const buffer = Buffer.from(base64Content, "base64");
    return buffer.toString("hex");
  }

  getPublicKey(): PublicKey {
    return new PublicKey(
      this.keypair.getPublic().encode("hex", true),
      CurveType.Secp256k1,
    );
  }
}

export { KeyPair, Secp256k1KeyPair, PublicKey as PulbicKey, CurveType };
