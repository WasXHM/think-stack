'use strict';

const path = require('node:path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const appConfig = require('./app.config.cjs');
const proxy = require('./proxy.config.cjs');

module.exports = {
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'assets/[name].[contenthash:8].js',
    publicPath: appConfig.baseHref,
    clean: true,
  },
  resolve: {
    extensions: ['.js'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'src/index.html'),
      title: appConfig.name,
      baseHref: appConfig.baseHref,
    }),
    new webpack.DefinePlugin({
      APP_BASE_HREF: JSON.stringify(appConfig.baseHref),
      APP_DISPLAY_NAME: JSON.stringify(appConfig.name),
    }),
  ],
  devServer: {
    host: '127.0.0.1',
    port: appConfig.webappPort,
    hot: true,
    historyApiFallback: {
      disableDotRule: true,
      rewrites: [
        {
          from: proxy.clientRoutePattern,
          to: `${appConfig.baseHref}index.html`,
        },
        {
          from: /^.*$/,
          to: ({ parsedUrl }) => parsedUrl.pathname,
        },
      ],
    },
    devMiddleware: {
      publicPath: appConfig.baseHref,
    },
    proxy: [
      {
        context: proxy.matchApiPath,
        target: proxy.target,
        changeOrigin: true,
        pathRewrite: proxy.rewriteApiPath,
      },
      {
        context: proxy.matchSocketPath,
        target: proxy.target,
        changeOrigin: true,
        ws: true,
        pathRewrite: proxy.rewriteSocketPath,
      },
    ],
  },
};

