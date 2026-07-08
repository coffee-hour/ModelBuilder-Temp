# MUD Engine (Google Sheets Backend)

This is a lightweight Multi-User Dungeon (MUD) engine that uses a Google Sheet as its database.

## Setup Instructions

1. **Google Sheet Setup**:
   - Create a new Google Sheet.
   - Go to **Extensions > Apps Script**.
   - Copy the contents of `backend.gs` from this repository into the script editor.
   - Click **Deploy > New Deployment**.
   - Select **Web App**.
   - Set "Execute as" to **Me** and "Who has access" to **Anyone**.
   - Copy the **Web App URL**.

2. **Frontend Configuration**:
   - Open `main.js`.
   - Replace the `GAS_ENDPOINT` variable value with your copied Web App URL.

3. **Playing**:
   - Open `index.html` in your browser.
   - Enter a unique Player ID to start your adventure.

## Features
- **Resolve**: Your primary resource for actions.
- **Reputation**: Determines how NPCs and the world perceive you.
- **Inventory**: Stores items found during exploration.
- **Persistence**: All data is saved in real-time to your Google Sheet.