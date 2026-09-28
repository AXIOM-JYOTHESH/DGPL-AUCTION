/**
 * ============================================================================
 * DGPL CRICKET AUCTION - GOOGLE APPS SCRIPT WEBHOOK FOR GOOGLE FORMS & SHEETS
 * ============================================================================
 * 
 * Instructions:
 * 1. Open your Google Form's linked Google Sheet.
 * 2. Click "Extensions" > "Apps Script" in the top menu bar.
 * 3. Replace any code in the editor with this entire file.
 * 4. Verify WEBHOOK_URL below.
 * 5. Click the floppy disk icon (Save).
 * 6. Select "syncNow" in the function dropdown and click "Run" (▶️) to sync!
 * ============================================================================
 */

// ⚙️ CONFIGURATION: Set your auction backend server URL
// Active HTTPS tunnel to your local backend server:
const WEBHOOK_URL = 'https://cedbb0c9c5dff7.lhr.life/api/v1/players/webhook/register';

// Optional: Set a secret token matching WEBHOOK_SECRET in backend config.env (leave empty if not using secret)
const WEBHOOK_SECRET = '';

/**
 * FAST 1-CLICK SYNC (No popups, runs instantly in 2 seconds)
 * Select this function in the Apps Script dropdown and click "Run" (▶️)
 */
function syncNow() {
  syncAllExistingRows();
}

/**
 * Triggered automatically every time a new response is submitted to Google Form.
 * Must be configured as an "On form submit" trigger in Apps Script Triggers.
 */
function onFormSubmit(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    let row;
    if (e && e.range) {
      row = e.range.getRow();
    } else {
      row = sheet.getLastRow();
    }

    // Safety guard: NEVER process header row (row 1)
    if (!row || row <= 1) {
      Logger.log('Skipping header / invalid row: ' + row);
      return;
    }

    Logger.log('Processing form submission row: ' + row);
    const result = processRow(sheet, row);
    Logger.log('Result: ' + JSON.stringify(result));
  } catch (err) {
    Logger.log('Error in onFormSubmit: ' + err.toString());
  }
}

/**
 * Extracts data from a given sheet row and sends the payload to the Auction Backend Webhook.
 */
function processRow(sheet, rowNumber) {
  // CRITICAL: NEVER process row 1 (header row)
  if (!rowNumber || rowNumber <= 1) {
    Logger.log('Skipping row ' + rowNumber + ': Header row.');
    return { status: 'skipped', reason: 'Header row' };
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowValues = sheet.getRange(rowNumber, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Map header names to lowercase trimmed keys
  const data = {};
  for (let col = 0; col < headers.length; col++) {
    const key = String(headers[col]).trim().toLowerCase();
    data[key] = rowValues[col];
  }

  // Find fields flexibly
  const name = findField(data, ['full name', 'name', 'player name', 'student name']);
  const year = findField(data, ['year', 'academic year', 'year of study', 'class', 'batch']);
  const category = findField(data, ['role', 'playing role', 'category', 'player role', 'specialization']);
  const photoRaw = findField(data, ['photo', 'upload photo', 'upload your photo', 'photo upload', 'image', 'picture']);
  const basePrice = findField(data, ['base price', 'baseprice', 'price']) || 0.5;

  if (!name || !String(name).trim()) {
    Logger.log('Skipping row ' + rowNumber + ': No name found.');
    return { status: 'skipped', reason: 'No name' };
  }

  // Extract Drive File ID and convert to direct CDN image URL
  let photoUrl = photoRaw;
  const driveId = extractDriveId(photoRaw);
  if (driveId) {
    photoUrl = 'https://lh3.googleusercontent.com/d/' + driveId;
    // Attempt to ensure public view permission in Drive without blocking
    try {
      DriveApp.getFileById(driveId).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (driveErr) {
      // Permission attempt optional, direct link still works
    }
  }

  const payload = {
    name: String(name).trim(),
    year: year,
    category: category || 'All-Rounder',
    image: photoUrl,
    basePrice: basePrice,
    secret: WEBHOOK_SECRET,
  };

  // POST to Auction App Backend
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: {
      'x-webhook-secret': WEBHOOK_SECRET,
    },
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  // Find or create 'Auction Sync Status' column
  let statusColIndex = headers.indexOf('Auction Sync Status') + 1;
  if (statusColIndex === 0) {
    statusColIndex = sheet.getLastColumn() + 1;
    sheet.getRange(1, statusColIndex).setValue('Auction Sync Status');
  }

  if (responseCode >= 200 && responseCode < 300) {
    sheet.getRange(rowNumber, statusColIndex).setValue('Received ⏳ Pending Review (' + new Date().toLocaleTimeString() + ')');
    Logger.log('Row ' + rowNumber + ' (' + name + ') synced successfully!');
    return { status: 'success', row: rowNumber, name: name };
  } else {
    sheet.getRange(rowNumber, statusColIndex).setValue('Failed ❌: ' + responseText.substring(0, 40));
    Logger.log('Row ' + rowNumber + ' (' + name + ') sync failed: ' + responseText);
    return { status: 'error', code: responseCode, response: responseText };
  }
}

/**
 * Sync all existing rows in the Google Sheet (Non-blocking, fast)
 */
function syncAllExistingRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    Logger.log('No player registrations found in this sheet yet (only header row).');
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast('No player registrations found in sheet yet.', 'DGPL Auction', 5);
    } catch (e) {}
    return;
  }

  Logger.log('Starting sync for ' + (lastRow - 1) + ' player registrations...');
  let successCount = 0;
  let failCount = 0;

  for (let r = 2; r <= lastRow; r++) {
    const res = processRow(sheet, r);
    if (res && res.status === 'success') {
      successCount++;
    } else if (res && res.status === 'error') {
      failCount++;
    }
  }

  Logger.log('Sync Complete: ' + successCount + ' succeeded, ' + failCount + ' failed.');
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast('Synced ' + successCount + ' players to Auction App!', 'DGPL Auction (Success)', 7);
  } catch (e) {}
}

/**
 * Test connectivity between Google Apps Script and your Auction App Backend
 */
function testWebhookConnection() {
  try {
    const options = { method: 'get', muteHttpExceptions: true };
    const res = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const code = res.getResponseCode();
    const text = res.getContentText();

    Logger.log('Webhook Test Result: HTTP ' + code + ' - ' + text);
    try {
      SpreadsheetApp.getActiveSpreadsheet().toast('Webhook Connected! Status: ' + code, 'DGPL Auction', 5);
    } catch (e) {}
  } catch (err) {
    Logger.log('Webhook Connection Failed: ' + err.toString());
  }
}

/**
 * Creates custom menu inside Google Sheets when opened
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🏏 DGPL Auction')
      .addItem('⚡ Sync All Responses Now', 'syncAllExistingRows')
      .addItem('🔍 Test Webhook Connection', 'testWebhookConnection')
      .addToUi();
  } catch (e) {}
}

/**
 * Helper to match common column header names
 */
function findField(dataObj, potentialKeys) {
  for (let i = 0; i < potentialKeys.length; i++) {
    const key = potentialKeys[i];
    for (const objKey in dataObj) {
      if (objKey === key || objKey.indexOf(key) !== -1) {
        if (dataObj[objKey] !== undefined && dataObj[objKey] !== '') {
          return dataObj[objKey];
        }
      }
    }
  }
  return null;
}

/**
 * Extracts Google Drive File ID from a link or string
 */
function extractDriveId(urlOrId) {
  if (!urlOrId) return null;
  const str = String(urlOrId).split(/[,;\n]/)[0].trim();

  // Pattern 1: /d/<id>
  const matchD = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (matchD && matchD[1]) return matchD[1];

  // Pattern 2: id=<id>
  const matchId = str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchId && matchId[1]) return matchId[1];

  // Pattern 3: raw id
  if (/^[a-zA-Z0-9_-]{25,}$/.test(str)) {
    return str;
  }

  return null;
}
