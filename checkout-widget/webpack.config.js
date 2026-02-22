const path = require('path');

module.exports = {
  entry: './src/sdk/PaymentGateway.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'checkout.js',
    library: {
      name: 'PaymentGateway',
      type: 'umd',
      export: 'default',
    },
    globalObject: 'this',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};
