const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';
  
  return {
    entry: './src/renderer/index.tsx',
    target: 'electron-renderer',
    devtool: isDevelopment ? 'inline-source-map' : 'source-map',
    
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                configFile: 'tsconfig.renderer.json'
              }
            }
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader'],
        },
        {
          test: /\.scss$/,
          use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg|woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
        },
      ],
    },
    
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
      alias: {
        '@quantum': path.resolve(__dirname, 'src/quantum'),
        '@core': path.resolve(__dirname, 'src/core'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@renderer': path.resolve(__dirname, 'src/renderer'),
        '@components': path.resolve(__dirname, 'src/renderer/components'),
        '@hooks': path.resolve(__dirname, 'src/renderer/hooks'),
        '@services': path.resolve(__dirname, 'src/renderer/services'),
        '@styles': path.resolve(__dirname, 'src/renderer/styles'),
        '@assets': path.resolve(__dirname, 'src/renderer/assets'),
      },
    },
    
    output: {
      filename: 'renderer.js',
      path: path.resolve(__dirname, 'dist/renderer'),
      clean: true,
    },
    
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html',
        inject: 'body',
      }),
    ],
    
    devServer: {
      port: 3000,
      hot: true,
      static: {
        directory: path.join(__dirname, 'src/renderer/assets'),
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    },
    
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          quantum: {
            test: /[\\/]src[\\/]quantum[\\/]/,
            name: 'quantum',
            chunks: 'all',
          },
        },
      },
    },
  };
};