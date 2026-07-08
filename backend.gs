/**
 * GOOGLE APPS SCRIPT BACKEND (Multiplayer Edition)
 */

const SHEET_NAME = 'Players';
const EVENTS_SHEET = 'Events';

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  let eventSheet = ss.getSheetByName(EVENTS_SHEET);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Username', 'Resolve', 'Reputation', 'Inventory', 'LastSeen']);
  }
  if (!eventSheet) {
    eventSheet = ss.insertSheet(EVENTS_SHEET);
    eventSheet.appendRow(['Timestamp', 'Username', 'Text', 'Type']);
  }

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const username = data.username;

    if (action === 'get_player') {
      return ContentService.createTextOutput(JSON.stringify(getPlayer(sheet, username))).setMimeType(ContentService.MimeType.JSON);
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
      const events = getEvents(eventSheet, data.lastTimestamp);
      return ContentService.createTextOutput(JSON.stringify({ events })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getEvents(sheet, lastTimestamp) {
  const rows = sheet.getDataRange().getValues();
  const events = [];
  // Read backwards from newest to find events since lastTimestamp
  for (let i = rows.length - 1; i >= 1; i--) {
    const timestamp = rows[i][0];
    if (timestamp > lastTimestamp) {
      events.unshift({
        timestamp: timestamp,
        username: rows[i][1],
        text: rows[i][2],
        type: rows[i][3]
      });
    } else {
      break; // Optimization: stop once we hit old events
    }
  }
  return events;
}

function getPlayer(sheet, username) {
  const rows = sheet.getDataRange().getValues();
  const lowerUsername = username.toLowerCase();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0].toString().toLowerCase() === lowerUsername) {
      return { resolve: rows[i][1], reputation: rows[i][2], inventory: JSON.parse(rows[i][3] || '[]') };
    }
  }
  const defaultPlayer = { resolve: 100, reputation: 0, inventory: [] };
  sheet.appendRow([username, defaultPlayer.resolve, defaultPlayer.reputation, JSON.stringify(defaultPlayer.inventory), new Date()]);
  return defaultPlayer;
}

function savePlayer(sheet, username, stats) {
  const rows = sheet.getDataRange().getValues();
  const lowerUsername = username.toLowerCase();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0].toString().toLowerCase() === lowerUsername) {
      sheet.getRange(i + 1, 2, 1, 3).setValues([[stats.resolve, stats.reputation, JSON.stringify(stats.inventory)]]);
      sheet.getRange(i + 1, 5).setValue(new Date());
      return;
    }
  }
}