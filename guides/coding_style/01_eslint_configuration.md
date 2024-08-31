# ESLint Configuration

## STEP 1: Installation
Use following command to install the `ESLint` modules in `app` directory:
```bash
cd app
npm install --save-dev eslint @eslint/js @types/eslint__js typescript-eslint
```

## STEP 2: Configuration
Next, create an `eslint.config.mjs` config file in `app` directory, and populate it with the following:
```mjs
// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        rules: {
            semi: 'error',
            indent: ['error', 4]
        }
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended
);
```

## STEP 3: Running ESLint
Open a terminal to the root of your project and run the following command:

```bash
npx eslint .
```
ESLint will lint all TypeScript compatible files within the current folder, and will output the results to your terminal.

