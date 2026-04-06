# Krushnam Management System

A management system for Pashu Ahar (Cattle Feed) business. Powered by Ruhi Computer.

## 🚀 Quick Setup

### Windows
1.  Ensure you have [Node.js](https://nodejs.org/) installed (LTS version recommended).
2.  Download/Clone this repository.
3.  Double-click `setup.bat` to install dependencies and configure the environment.
4.  Once setup is complete, run:
    ```bash
    npm start
    ```

### Linux
1.  Ensure you have `git` and `curl` installed.
2.  Run the following command:
    ```bash
    chmod +x setup.sh
    ./setup.sh
    ```

## 🛠️ Configuration
The setup scripts create a `.env` file for you. You may need to update the following variables:
- `GEMINI_API_KEY`: Required for AI features.
- `JWT_SECRET`: Automatically generated, but can be changed.
- `PORT`: Default is 3000.

## 📦 Dependencies
- **Frontend**: React, Tailwind CSS, Lucide Icons.
- **Backend**: Node.js, Express, Better-SQLite3.
- **AI**: Google Gemini API.

## 📝 License
Proprietary.
