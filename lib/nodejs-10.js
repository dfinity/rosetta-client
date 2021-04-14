const util = require("util");

if (!global.TextEncoder) {
  global.TextEncoder = util.TextEncoder;
}
