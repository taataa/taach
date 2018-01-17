var LiveReloadPlugin = require('webpack-livereload-plugin')
var path = require('path')

module.exports = {
  entry: {
    'index': './index.js'
  },
  context: __dirname,

  output: {
    filename: 'app.js',
    path: path.join(__dirname, 'dist')
  },

  plugins: [
    new LiveReloadPlugin()
  ],

  devtool: 'eval-source-map',

  stats: 'minimal'
}
