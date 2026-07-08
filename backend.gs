/**
 * GOOGLE APPS SCRIPT BACKEND (Username-based)
 * Paste this into your Google Apps Script project (script.google.com)
 */

const SHEET_NAME = 'Players';

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  // Initialize sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Username', 'Resolve', 'Reputation', 'Inventory', 'LastSeen']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#efefef');
  }

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const username = data.username;

    if (!username) {
      throw new Error("Username is required");
    }

    if (action === 'get_player') {
      const player = getPlayer(sheet, username);
      return ContentService.createTextOutput(JSON.stringify(player))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'save_player') {
      savePlayer(sheet, username, data.stats);
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getPlayer(sheet, username) {
  const range = sheet.getDataRange();
  const rows = range.getValues();
  
  // Search for existing username (case-insensitive check)
  const lowerUsername = username.toLowerCase();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0].toString().toLowerCase() === lowerUsername) {
      return {
        resolve: rows[i][1],
        reputation: rows[i][2],
        inventory: JSON.parse(rows[i][3] || '[]')
      };
    }
  }
  
  // Create default new player if username not found
  const defaultPlayer = { resolve: 100, reputation: 0, inventory: [] };
  sheet.appendRow([
    username, 
    defaultPlayer.resolve, 
    defaultPlayer.reputation, 
    JSON.stringify(defaultPlayer.inventory), 
    new Date()
  ]);
  return defaultPlayer;
}

function savePlayer(sheet, username, stats) {
  const range = sheet.getDataRange();
  const rows = range.getValues();
  const lowerUsername = username.toLowerCase();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0].toString().toLowerCase() === lowerUsername) {
      // Columns: 2=Resolve, 3=Reputation, 4=Inventory, 5=LastSeen
      sheet.getRange(i + 1, 2).setValue(stats.resolve);
      sheet.getRange(i + 1, 3).setValue(stats.reputation);
      sheet.getRange(i + 1, 4).setValue(JSON.stringify(stats.inventory));
      sheet.getRange(i + 1, 5).setValue(new Date());
      return;
    }
  }
  
  // Fallback: If for some reason the row was lost, recreate it
  sheet.appendRow([
    username, 
    stats.resolve, 
    stats.reputation, 
    JSON.stringify(stats.inventory), 
    new Date()
  ]);
}