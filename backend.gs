/**
 * GOOGLE APPS SCRIPT BACKEND (Multiplayer Edition - Stability Fix)
 */

const SHEET_NAME = 'Players';
const EVENTS_SHEET = 'Events';

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  let eventSheet = ss.getSheetByName(EVENTS_SHEET);
  
  // Ensure the Players sheet exists and has headers
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Username', 'Resolve', 'Reputation', 'Inventory', 'LastSeen']);
    sheet.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#efefef');
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Username', 'Resolve', 'Reputation', 'Inventory', 'LastSeen']);
  }

  // Ensure the Events sheet exists and has headers
  if (!eventSheet) {
    eventSheet = ss.insertSheet(EVENTS_SHEET);
    eventSheet.appendRow(['Timestamp', 'Username', 'Text', 'Type']);
    eventSheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#efefef');
  } else if (eventSheet.getLastRow() === 0) {
    eventSheet.appendRow(['Timestamp', 'Username', 'Text', 'Type']);
  }

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const username = data.username;

    if (!username) throw new Error("Username missing from request.");

    if (action === 'get_player') {
      const player = getPlayer(sheet, username);
      return ContentService.createTextOutput(JSON.stringify(player)).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'save_player') {
      savePlayer(sheet, username, data.stats);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'log_event') {
      eventSheet.appendRow([Date.now(), username, data.text, data.type]);
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === 'poll') {
      const events = getEvents(eventSheet, data.lastTimestamp || 0);
      return ContentService.createTextOutput(JSON.stringify({ events })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getEvents(sheet, lastTimestamp) {
  const range = sheet.getDataRange();
  if (range.getLastRow() <= 1) return []; // Only header exists
  
  const rows = range.getValues();
  const events = [];
  // Read backwards to find recent events
  for (let i = rows.length - 1; i >= 1; i--) {
    const timestamp = Number(rows[i][0]);
    if (timestamp > lastTimestamp) {
      events.unshift({
        timestamp: timestamp,
        username: rows[i][1],
        text: rows[i][2],
        type: rows[i][3]
      });
    } else {
      break; 
    }
  }
  return events;
}

function getPlayer(sheet, username) {
  const range = sheet.getDataRange();
  const rows = range.getValues();
  const lowerUsername = username.toString().toLowerCase();
  
  // Search for existing player
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].toString().toLowerCase() === lowerUsername) {
      return { 
        resolve: Number(rows[i][1]), 
        reputation: Number(rows[i][2]), 
        inventory: JSON.parse(rows[i][3] || '[]') 
      };
    }
  }
  
  // Create default new player if not found
  // Updated defaults: Resolve: 10, Reputation: 0
  const defaultPlayer = { resolve: 10, reputation: 0, inventory: [] };
  sheet.appendRow([
    username, 
    defaultPlayer.resolve, 
    defaultPlayer.reputation, 
    JSON.stringify(defaultPlayer.inventory), 
    new Date()
  ]);
  
  // Ensure we return the newly created player stats
  return defaultPlayer;
}

function savePlayer(sheet, username, stats) {
  const range = sheet.getDataRange();
  const rows = range.getValues();
  const lowerUsername = username.toString().toLowerCase();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].toString().toLowerCase() === lowerUsername) {
      // Update Resolve, Reputation, Inventory
      sheet.getRange(i + 1, 2, 1, 3).setValues([[
        stats.resolve, 
        stats.reputation, 
        JSON.stringify(stats.inventory)
      ]]);
      sheet.getRange(i + 1, 5).setValue(new Date());
      return;
    }
  }
  
  // Fallback: Re-create if row was somehow deleted
  sheet.appendRow([
    username, 
    stats.resolve, 
    stats.reputation, 
    JSON.stringify(stats.inventory), 
    new Date()
  ]);
}