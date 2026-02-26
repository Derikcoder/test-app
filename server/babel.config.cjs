/**
 * @file babel.config.cjs
 * @description Babel configuration for Jest testing with ES modules
 */

module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
  ],
};
