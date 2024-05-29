import axios from "axios";
import { KeyPair } from "../rosetta_core/keypairs";
import { HEADERS } from "../rosetta_core/constants";
import { CurveType } from "../rosetta_core/keypairs";
import { Secp256k1KeyPair } from "../rosetta_core/keypairs";

const NETWORK_ID = {
  blockchain: "Internet Computer",
  network: "00000000000000020101",
};

class RosettaClient {
  keypair!: KeyPair<KeyType>;
  rosetta_url: string;

  constructor(
    path_private_key: string,
    rosetta_url: string,
    curvetype: CurveType,
  ) {
    switch (curvetype) {
      case CurveType.Secp256k1:
        this.keypair = new Secp256k1KeyPair(
          path_private_key,
        ) as unknown as KeyPair<KeyType>;
        break;
    }
    this.rosetta_url = rosetta_url;
  }

  public async post(urlSuffix: string, data: any) {
    const url = this.rosetta_url + urlSuffix;
    const datapp = JSON.stringify(data);
    console.log(`POST ${url} ${datapp}`);
    const response = await axios.post(url, data, {
      headers: HEADERS,
      timeout: 5000,
    });
    return response.data;
  }

  public async networkList() {
    return this.post("/network/list", { metadata: {} });
  }
}
export { RosettaClient };
