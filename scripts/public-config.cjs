const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");
module.exports = function publicConfig(
  root = path.resolve(__dirname, ".."),
  env = process.env,
) {
  let values = {};
  for (const name of [".env", ".env.local"]) {
    const file = path.join(root, name);
    if (fs.existsSync(file))
      Object.assign(values, dotenv.parse(fs.readFileSync(file)));
  }
  values = { ...values, ...env };
  return {
    __CIRCLE_PUBLIC_API_URL__: values.APP_PUBLIC_API_URL || "",
    __CIRCLE_PUBLIC_SHARE_URL__: values.APP_PUBLIC_SHARE_URL || "",
  };
};
