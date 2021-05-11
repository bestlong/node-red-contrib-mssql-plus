module.exports = {

    env: {
        browser: true,
        commonjs: true,
        jquery: true,
        node: true,
        es2021: true
    },
    extends: [
        'standard'
    ],
    globals: {
        RED: true,
        Promise: true
    },
    rules: {
        indent: ['error', 4],
        semi: ['error', 'always'],
        quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
        'quote-props': ['error', 'as-needed', { unnecessary: false }]
        // 'space-before-function-paren': ['never'],
        // 'spaced-comment': ['never']

    },
    plugins: [
        'html'
    ],
    settings: {
        'html/html-extensions': ['.html']
    }

};
