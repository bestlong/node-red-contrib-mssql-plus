module.exports = {

    env: {
        browser: true,
        commonjs: true,
        jquery: true,
        node: true,
        es2021: true
    },
    extends: [
        'eslint:recommended',
        'standard'
    ],
    globals: {
        RED: true,
        Promise: true
    },
    plugins: ['eslint-plugin-html', 'no-only-tests'],
    parserOptions: {
        ecmaVersion: 13
    },
    rules: {
        indent: ['error', 4],
        'spaced-comment': ['error', 'always', { block: { balanced: true }, line: { markers: ['/'] } }],
        'no-only-tests/no-only-tests': 'error'
    }
}
