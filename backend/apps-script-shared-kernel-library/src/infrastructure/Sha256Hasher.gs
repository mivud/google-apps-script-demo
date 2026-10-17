// Hasher port: lowercase hex SHA-256 of a text. Used to bind nonces and to key caches without storing raw secrets.
function Sha256Hasher() {}

Sha256Hasher.prototype.hex = function (text) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8);
  return digest.map(function (byte) { return ((byte & 0xff) + 0x100).toString(16).slice(1); }).join('');
};
