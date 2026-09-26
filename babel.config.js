module.exports = function (api) {
  const values = api.cache.using(() =>
    JSON.stringify(require("./scripts/public-config.cjs")()),
  );
  const config = JSON.parse(values);
  return {
    presets: ["module:@react-native/babel-preset"],
    plugins: [
      function publicConfigPlugin() {
        return {
          visitor: {
            StringLiteral(path, state) {
              if (
                !state.filename
                  ?.replaceAll("\\", "/")
                  .endsWith("/src/config.ts")
              )
                return;
              if (Object.hasOwn(config, path.node.value))
                path.node.value = config[path.node.value];
            },
          },
        };
      },
    ],
  };
};
