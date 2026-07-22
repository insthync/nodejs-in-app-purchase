'use strict';

module.exports = [
    {
        files: [ 'lib/**/*.js', 'index.js' ],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                __dirname: 'readonly',
                __filename: 'readonly',
                Buffer: 'readonly',
                clearImmediate: 'readonly',
                clearInterval: 'readonly',
                clearTimeout: 'readonly',
                console: 'readonly',
                exports: 'writable',
                global: 'readonly',
                module: 'readonly',
                process: 'readonly',
                require: 'readonly',
                setImmediate: 'readonly',
                setInterval: 'readonly',
                setTimeout: 'readonly'
            }
        },
        rules: {
            'max-depth': [ 'error', 5 ],
            'no-undef': 'error',
            'no-unused-vars': [ 'error', { caughtErrors: 'none' } ],
            'no-cond-assign': 'error',
            'no-console': 'warn',
            'no-dupe-args': 'error',
            'no-dupe-keys': 'error',
            'no-empty': 'error',
            'no-duplicate-case': 'error',
            'no-func-assign': 'error',
            'no-inner-declarations': 'warn',
            'no-irregular-whitespace': 'error',
            'no-obj-calls': 'error',
            'no-sparse-arrays': 'error',
            'no-unreachable': 'error',
            'no-unsafe-negation': 'error',
            'use-isnan': 'error',
            'valid-typeof': 'error',
            'dot-notation': 'warn',
            'guard-for-in': 'off',
            'no-eval': 'error',
            'no-global-assign': 'error',
            'no-implicit-globals': 'error',
            'no-implied-eval': 'error',
            'no-loop-func': 'error',
            'no-octal': 'off',
            'no-octal-escape': 'off',
            'no-proto': 'error',
            'no-redeclare': 'error',
            'no-restricted-properties': 'error',
            eqeqeq: 'error',
            quotes: [ 'error', 'single' ],
            curly: 'error',
            camelcase: 'error',
            validthis: 'off',
            bitwise: 'off',
            semi: 'error'
        }
    }
];
