# Implied Volatility Calculator

This is a simple tool using the Black-Scholes formula to calculate the implied volatility of wrapped Sonic options. The tool utilizes the Stryke API to fetch the options data and the odos API to fetch the current price of the asset.

## Setup Instructions

1. Install Git

   **macOS (using Homebrew):**

   ```bash
   # Install Homebrew if you haven't already
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

   # Install Git
   brew install git
   ```

   **Windows:**

   - Download and install Git from [git-scm.com](https://git-scm.com/download/windows)

   **Verify installation:**

   ```bash
   git --version
   ```

2. Clone the Repository

   Create a new directory (folder) in your desktop. Then, open your terminal and change to that directory to clone the repo:

   ```bash
   cd path/to/directory
   git clone https://github.com/compadre2049/IVcalc.git
   ```

   Then change to the repo directory:

   ```bash
   cd IVcalc
   ```

3. Install Node.js

   **macOS (using Homebrew):**

   ```bash
   # Install Node.js
   brew install node
   ```

   **Windows:**

   - Download and install Node.js from [nodejs.org](https://nodejs.org/)

   **Verify installation:**

   ```bash
   node --version
   npm --version
   ```

4. Install Project Dependencies

   ```bash
   npm install
   ```

5. Run the Application
   - First build the TypeScript files:
     ```bash
     npm run build
     ```
   - Then start the application:
     ```bash
     npm run start
     ```

## Project Structure

```
.
├── IVcalc.ts          # Main source file
├── dist/              # Compiled JavaScript output
│   └── IVcalc.js     # Compiled main file
├── package.json       # Project configuration
└── tsconfig.json     # TypeScript configuration
```

## Dependencies

This project uses:

- TypeScript for type-safe JavaScript
- ts-node for running TypeScript files directly
- Node.js runtime environment

## License

ISC License (ISC)

This is a permissive license that lets people do anything with your code with proper attribution and without warranty. The ISC license is functionally equivalent to the MIT license but with simpler language.
