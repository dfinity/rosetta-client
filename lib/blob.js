function blobFromHex(hex) {
  return Buffer.from(hex, "hex");
}

exports.blobFromHex = blobFromHex;

function blobToHex(blob) {
  return blob.toString("hex");
}

exports.blobToHex = blobToHex;
