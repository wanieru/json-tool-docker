const path = require('path');

module.exports = {
    entry: './src/www/index.ts',
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    output: {
        filename: 'main.js',
        path: __dirname + "/www/js",
    },
    resolve: {
        extensions: [".ts", ".js"]
    },
    devtool: "inline-source-map"
};