# Widgetizer React

A dead simple static website builder for the rest of us.

## Minimum Requirements

- **Node.js:** >= 18.0.0 (Recommended to use the latest LTS version)
- **npm:** >= 8.0.0 (or compatible package manager like yarn)

## Getting Started

Follow these steps to get the project running on your local machine for development and testing purposes.

### Prerequisites

Ensure you have Node.js and npm installed. You can download them from [https://nodejs.org/](https://nodejs.org/).

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/tsiger/widgetizer.git
    cd widgetizer
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file by copying the example file:

    ```bash
    # On Windows (Command Prompt)
    copy .env.example .env

    # On macOS/Linux
    cp .env.example .env
    ```

    The `.env` file is used to configure environment variables. The default settings point the frontend to the backend server running on port 3001. You generally won't need to modify this for local development.

### Running the Application

To run the application in development mode (which includes both the Vite frontend dev server and the backend Node.js server with live reload), use the following command:

```bash
npm run dev:all
```

This will typically start:

- The frontend accessible at `http://localhost:3000`

Check the terminal output for the exact URLs.

### Building for Production

TBC
