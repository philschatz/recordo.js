var path = require('path');
var webpack = require('webpack');

var config = {
  context: path.resolve(__dirname),
  entry: [
    './recordo.coffee'
  ],
  output: {
    library: '__Recordo',
    libraryTarget: 'umd',
    path: __dirname + '/dist',
    publicPath: '/dist/',
    filename: 'recordo.js'
  },
  module: {
    loaders: [
      { test: /\.coffee$/, loader: 'coffee' },
    ]
  },
};

module.exports = config;
