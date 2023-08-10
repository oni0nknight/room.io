
module.exports =
{
    "root": true,
    "env": {
        "es2021": true,
        "node": true
    },
    "extends": [
        "eslint:recommended",
    ],
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module",
    },
    "overrides": [
        {
            "files": [
                "lib/**/*.js"
            ],
            "rules": {
                // Disallow use of undeclared variables unless mentioned in a /* global */ block
                // https://eslint.org/docs/rules/no-undef
                "no-undef": "error",

                // Disallow Unused Variables
                // https://eslint.org/docs/rules/no-unused-vars
                "no-unused-vars": ["error", {
                    "args" : "none"
                }],

                // Enforce variable initializations at declaration
                // https://eslint.org/docs/rules/init-declarations
                "init-declarations": [ "error", "always" ],

                // Disallow declaration of variables already declared in the outer scope
                // https://eslint.org/docs/rules/no-shadow
                "no-shadow": "error",

                // Disallow shadowing of names such as arguments
                // https://eslint.org/docs/rules/no-shadow-restricted-names
                "no-shadow-restricted-names": "error",

                // Disallow reassignment of function parameters
                // https://eslint.org/docs/rules/no-param-reassign
                "no-param-reassign": [ "error",
                {
                    "props": false
                }],

                // Disallow declaring the same variable more then once
                // https://eslint.org/docs/rules/no-redeclare
                "no-redeclare": "error",

                // Disallow assigning to the exception in a catch block
                // https://eslint.org/docs/rules/no-ex-assign
                "no-ex-assign": "error",

                // Disallow overwriting functions written as function declarations
                // https://eslint.org/docs/rules/no-func-assign
                "no-func-assign": "error",

                // Disallow use of variables before they are defined
                // https://eslint.org/docs/rules/no-use-before-define
                "no-use-before-define": [ "error",
                {
                    "variables": false,
                    "functions": false,
                    "classes": false
                }],

                // Require let or const instead of var
                // https://eslint.org/docs/rules/no-var
                "no-var": "error",

                // Disallow modifying variables that are declared using `const`
                // https://eslint.org/docs/rules/no-const-assign
                "no-const-assign": "error",

                // Suggest using `const` if a variable isn't re-assigned
                // https://eslint.org/docs/rules/prefer-const
                "prefer-const": [ "error",
                {
                    "destructuring": "all"
                }],


                // BEST PRACTICES


                // Disallow use of eval()
                // https://eslint.org/docs/rules/no-eval
                "no-eval": "error",

                // Disallow Implied eval()
                // https://eslint.org/docs/rules/no-implied-eval
                "no-implied-eval": "error",

                // Prevent the use of the built-in console functions
                // https://eslint.org/docs/rules/no-console
                "no-console": "error",

                // Require return statements to either always or never specify values
                // https://eslint.org/docs/rules/consistent-return
                "consistent-return": "error",

                // Require the use of === and !==
                // https://eslint.org/docs/rules/eqeqeq
                "eqeqeq": [ "error", "always" ],

                // Disallow magic numbers
                // https://eslint.org/docs/rules/no-magic-numbers
                "no-magic-numbers": [ "error",
                {
                    "ignore": [ 0, 0.5, 1, -1, 2, 3 ],
                    "ignoreArrayIndexes": true,
                    "enforceConst": true,
                    "detectObjects": false
                }],

                // Disallow fallthrough of case statements
                // https://eslint.org/docs/rules/no-fallthrough
                "no-fallthrough": "error",

                // Require default case in switch statements
                // https://eslint.org/docs/rules/default-case
                "default-case": "error",

                // Disallow lexical declarations in case/default clauses
                // https://eslint.org/docs/rules/no-case-declarations
                "no-case-declarations": "error",

                // Disallow use of assignment in return statement
                // https://eslint.org/docs/rules/no-return-assign
                "no-return-assign": [ "error", "always" ],

                // Disallow assignment in conditional expressions
                // https://eslint.org/docs/rules/no-cond-assign
                "no-cond-assign": [ "error", "always" ],

                // Disallow assignment to native objects or read-only global variables
                // https://eslint.org/docs/rules/no-global-assign
                "no-global-assign": "error",

                // Disallow use of chained assignment expressions
                // https://eslint.org/docs/rules/no-multi-assign
                "no-multi-assign": "error",

                // Enforces return statements in callbacks of array's methods
                // https://eslint.org/docs/rules/array-callback-return
                "array-callback-return": [ "error",
                {
                    "allowImplicit": true
                }],

                // Disallow the use of leading or trailing decimal points in numeric literals
                // https://eslint.org/docs/rules/no-floating-decimal
                "no-floating-decimal": "error",

                // Verify super() callings in constructors
                // https://eslint.org/docs/rules/constructor-super
                "constructor-super": "error",

                // Disallow to use this/super before super() calling in constructors
                // https://eslint.org/docs/rules/no-this-before-super
                "no-this-before-super": "error",

                // Disallow unnecessary constructor
                // https://eslint.org/docs/rules/no-useless-constructor
                "no-useless-constructor": "error",

                // Disallow modifying variables of class declarations
                // https://eslint.org/docs/rules/no-class-assign
                "no-class-assign": "error",

                // Disallow duplicate class members
                // https://eslint.org/docs/rules/no-dupe-class-members
                "no-dupe-class-members": "error",

                // Disallow use of the Object constructor
                // https://eslint.org/docs/rules/no-new-object
                "no-new-object": "error",

                // Disallows creating new instances of String, Number, and Boolean
                // https://eslint.org/docs/rules/no-new-wrappers
                "no-new-wrappers": "error",

                // Restrict what can be thrown as an exception
                // https://eslint.org/docs/rules/no-throw-literal
                "no-throw-literal": "error",

                // Require using Error objects as Promise rejection reasons
                // https://eslint.org/docs/rules/prefer-promise-reject-errors
                "prefer-promise-reject-errors": [ "error",
                {
                    "allowEmptyReject": true
                }],

                // Disallow duplicate arguments in functions
                // https://eslint.org/docs/rules/no-dupe-args
                "no-dupe-args": "error",

                // Disallow duplicate keys when creating object literals
                // https://eslint.org/docs/rules/no-dupe-keys
                "no-dupe-keys": "error",

                // Disallow a duplicate case label in a switch statement
                // https://eslint.org/docs/rules/no-duplicate-case
                "no-duplicate-case": "error",

                // Disallow invalid regular expression strings in the RegExp constructor
                // https://eslint.org/docs/rules/no-invalid-regexp
                "no-invalid-regexp": "error",

                // Ensure that the results of typeof are compared against a valid string
                // https://eslint.org/docs/rules/valid-typeof
                "valid-typeof": [ "error",
                {
                    "requireStringLiterals": true
                }],

                // Enforces that a return statement is present in property getters
                // https://eslint.org/docs/rules/getter-return
                "getter-return": "error",

                // Disallow specific global variables
                // https://eslint.org/docs/rules/no-restricted-globals
                "no-restricted-globals": [ "error",
                    {
                        "name": "parseInt",
                        "message": "Please use Number.parseInt instead"
                    },
                    {
                        "name": "parseFloat",
                        "message": "Please use Number.parseFloat instead"
                    }
                ],

                // Disallow certain object properties
                // https://eslint.org/docs/rules/no-restricted-properties
                "no-restricted-properties": [ "error",
                    {
                        "object": "arguments",
                        "property": "callee",
                        "message": "arguments.callee is deprecated",
                    },
                    {
                        "object": "global",
                        "property": "NaN",
                        "message": "Please use Number.isNaN instead",
                    },
                    {
                        "object": "self",
                        "property": "NaN",
                        "message": "Please use Number.isNaN instead",
                    },
                    {
                        "object": "window",
                        "property": "NaN",
                        "message": "Please use Number.isNaN instead",
                    },
                    {
                        "object": "global",
                        "property": "isFinite",
                        "message": "Please use Number.isFinite instead",
                    },
                    {
                        "object": "self",
                        "property": "isFinite",
                        "message": "Please use Number.isFinite instead",
                    },
                    {
                        "object": "window",
                        "property": "isFinite",
                        "message": "Please use Number.isFinite instead",
                    },
                    {
                        "object": "global",
                        "property": "isNaN",
                        "message": "Please use Number.isNaN instead",
                    },
                    {
                        "object": "self",
                        "property": "isNaN",
                        "message": "Please use Number.isNaN instead",
                    },
                    {
                        "object": "window",
                        "property": "isNaN",
                        "message": "Please use Number.isNaN instead",
                    },
                    {
                        "object": "global",
                        "property": "parseInt",
                        "message": "Please use Number.parseInt instead",
                    },
                    {
                        "object": "self",
                        "property": "parseInt",
                        "message": "Please use Number.parseInt instead",
                    },
                    {
                        "object": "window",
                        "property": "parseInt",
                        "message": "Please use Number.parseInt instead",
                    },
                    {
                        "object": "global",
                        "property": "parseFloat",
                        "message": "Please use Number.parseFloat instead",
                    },
                    {
                        "object": "self",
                        "property": "parseFloat",
                        "message": "Please use Number.parseFloat instead",
                    },
                    {
                        "object": "window",
                        "property": "parseFloat",
                        "message": "Please use Number.parseFloat instead",
                    }
                ],


                // CODEBASE HEALTH


                // Specify the maximum depth that blocks can be nested
                // https://eslint.org/docs/rules/max-depth
                "max-depth": [ "error", 6 ],

                // Specify the maximum length of a line in your program
                // https://eslint.org/docs/rules/max-len
                "max-len": [ "error",
                {
                    "code": 140,
                    "ignoreComments": true,
                    "ignoreUrls": true,
                    "ignoreRegExpLiterals": true,
                    "ignoreStrings": true,
                    "ignoreTemplateLiterals": true,
                }],
            
                // Specify the max number of lines in a file
                // https://eslint.org/docs/rules/max-lines
                "max-lines": [ "error",
                {
                    "max": 1000,
                    "skipBlankLines": true,
                    "skipComments": true
                }],

                // Limits the number of parameters that can be used in the function declaration
                // https://eslint.org/docs/rules/max-params
                "max-params": [ "error", 5 ],


                // STYLE


                // Disallow nested ternary expressions
                // https://eslint.org/docs/rules/no-nested-ternary
                "no-nested-ternary": "error",

                // Require CamelCase
                // https://eslint.org/docs/rules/camelcase
                "camelcase": "error",

                // Enforce the consistent use of quotes
                // https://eslint.org/docs/rules/quotes
                "quotes": [ "error", "single",
                {
                    "allowTemplateLiterals": true
                }],


                // IDE


                // Disallow use of constant expressions in conditions
                // https://eslint.org/docs/rules/no-constant-condition
                "no-constant-condition": "warn",
                
                // Disallow use of debugger
                // https://eslint.org/docs/rules/no-debugger
                "no-debugger": "warn",

                // Disallow empty block statements
                // https://eslint.org/docs/rules/no-empty
                "no-empty": "warn",

                // Disallow unreachable code (return, throw, continue, break)
                // https://eslint.org/docs/rules/no-unreachable
                "no-unreachable": "warn",

                // Disallow mixed spaces and tabs for indentation
                // https://eslint.org/docs/rules/no-mixed-spaces-and-tabs
                "no-mixed-spaces-and-tabs": [ "error", "smart-tabs" ],

                // Suggest using arrow functions as callbacks
                // https://eslint.org/docs/rules/prefer-arrow-callback
                "prefer-arrow-callback": [ "warn",
                {
                    "allowNamedFunctions": true
                }],

                // Use rest parameters instead of arguments
                // https://eslint.org/docs/rules/prefer-rest-params
                "prefer-rest-params": "warn",

                // Suggest using the spread operator instead of .apply()
                // https://eslint.org/docs/rules/prefer-spread
                "prefer-spread": "warn",

                // Require method and property shorthand syntax for object literals
                // https://eslint.org/docs/rules/object-shorthand
                "object-shorthand": [ "warn", "always",
                {
                    "avoidQuotes": true
                }],


                // AUTOFIX


                // Ensure statements end with a semicolon
                // https://eslint.org/docs/rules/semi
                "semi" : [ "error", "never" ],

                // Disallow unnecessary semicolons
                // https://eslint.org/docs/rules/no-extra-semi
                "no-extra-semi" : "error",

                // Disallow multiple spaces *not* used for indentation
                // https://eslint.org/docs/rules/no-multi-spaces
                "no-multi-spaces" : [ "error",
                {
                    "ignoreEOLComments": false,
                    "exceptions":
                    {
                        "Property": false
                    }
                }],

                // Disallow unnecessary function binding
                // https://eslint.org/docs/rules/no-extra-bind
                "no-extra-bind": "error",

                // Disallow use of undefined when initializing variables
                // https://eslint.org/docs/rules/no-undef-init
                "no-undef-init": "error",

                // Disallow trailing whitespace at the end of lines
                // https://eslint.org/docs/rules/no-trailing-spaces
                "no-trailing-spaces": ["error", {
                    "skipBlankLines": true
                }]
            }
        }
    ]
}