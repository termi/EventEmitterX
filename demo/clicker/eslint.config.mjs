'use strict';

import eslint_js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
    { ignores: [ 'dist' ] },
    {
        extends: [
            eslint_js.configs.recommended,
            ...tseslint.configs.recommended,
            stylistic.configs.customize({
                indent: 4,
                quotes: 'single',
                semi: true,
                jsx: true,
            }),
        ],
        files: [ '**/*.{ts,tsx}' ],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,

            '@typescript-eslint/no-namespace': 0,

            'react-refresh/only-export-components': [
                'warn',
                { allowConstantExport: true },
            ],
            '@typescript-eslint/prefer-ts-expect-error': [
                'warn',
            ],

            '@stylistic/type-generic-spacing': 0,
            // Нет настроек для import/require и обращения к свойствам объекта
            '@stylistic/quotes': 0,
            '@stylistic/indent': ["error", 4, { "ignoredNodes": [ "ConditionalExpression", "FunctionExpression", "ArrowFunctionExpression" ] } ],
            '@stylistic/jsx-indent-props': ["error", { "ignoreTernaryOperator": true } ],
            '@stylistic/array-bracket-spacing': [ 'error', 'always' ],
            '@stylistic/member-delimiter-style': [
                'error',
                {
                    "multiline": {
                        "delimiter": "comma",
                        "requireLast": true,
                    },
                    "singleline": {
                        "delimiter": "comma",
                        "requireLast": false,
                    },
                    "overrides": {
                        "interface": {
                            "multiline": {
                                "delimiter": "semi",
                                "requireLast": true,
                            },
                            "singleline": {
                                "delimiter": "semi",
                                "requireLast": false,
                            },
                        },
                    },
                },
            ],
            '@stylistic/quote-props': ["error", "as-needed", { "numbers": false, "keywords": true, "unnecessary": false }],
            '@stylistic/comma-dangle': [
                "error",
                {
                    "arrays": "always-multiline",
                    "objects": "always-multiline",
                    "imports": "always-multiline",
                    "exports": "always-multiline",
                    "importAttributes": "always-multiline",
                    "dynamicImports": "always-multiline",
                    "enums": "always-multiline",
                    "generics": "always-multiline",
                    "tuples": "always-multiline",
                    "functions": "ignore",
                }
            ],
            '@stylistic/space-before-function-paren': [
                'error',
                {
                    "anonymous": "never",
                    "named": "never",
                    "asyncArrow": "always",
                    "catch": "always",
                },
            ],
            '@stylistic/spaced-comment': 0,
            // // `"exceptions": ["todo", "fixme"]` не работает в spaced-comment
            // '@stylistic/spaced-comment': ["error", "always", {
            //     "line": {
            //         "markers": ["/"],
            //         "exceptions": ["-", "+", "todo", "fixme"],
            //     },
            //     "block": {
            //         "markers": ["!"],
            //         "exceptions": ["*", "todo", "fixme"],
            //         "balanced": true,
            //     }
            // }],
            '@stylistic/operator-linebreak': [ "error", "before", { "overrides": { "=": "after" } } ],
            // blankLine: "ignore" нет и невозможно выставить перевод строки между non-static "field" и static "field"
            '@stylistic/lines-between-class-members': 0,
            // '@stylistic/lines-between-class-members': [
            //     "error",
            //     {
            //       enforce: [
            //         { blankLine: "always", prev: "*", next: "method" },
            //         { blankLine: "always", prev: "method", next: "*" },
            //         { blankLine: "never", prev: "field", next: "field" }
            //       ]
            //     },
            //     { exceptAfterSingleLine: true, exceptAfterOverload: true }
            // ],
            // Невозможно настроить под удобную наботу
            '@stylistic/no-extra-parens': 0,
            // '@stylistic/no-extra-parens': [ "error", "all", { "conditionalAssign": false, "returnAssign": false, "ternaryOperandBinaryExpressions": false } ],
            // Не работает как надо и не настроить. Нужно писать свою версию. Смотреть
            '@stylistic/multiline-ternary': 0,
            '@stylistic/comma-style': [ "error", "last", {
                "exceptions": {
                    "ObjectExpression": true
                },
            }],

            // Просто не нужно
            '@stylistic/jsx-first-prop-new-line': 0,
            // Не работает совместно с @stylistic/indent - условия этих правим могут противоречить друг-другу.
            '@stylistic/jsx-closing-tag-location': 0,
            // Мало настроек. Невозможно игнорировать некоторые кейсы.
            '@stylistic/jsx-closing-bracket-location': 0,
            // Слишком жесткое правило. Мало настроек. Невозможно игнорировать некоторые кейсы с тренарным оператором.
            '@stylistic/jsx-curly-newline': 0,
            // Слишком жесткое правило. Из-за его включения не удаётся экономить место и конструкции получаются слишком громоздкими.
            '@stylistic/jsx-one-expression-per-line': 0,
            '@stylistic/jsx-max-props-per-line': ["error", { "maximum": 2, "when": "multiline" }],
            '@stylistic/jsx-wrap-multilines': ["error", { condition: "parens" }],
        },
    },
);

