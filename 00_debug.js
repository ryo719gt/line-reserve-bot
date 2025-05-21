/**
 * デバッグログをCloud Loggingおよびスプレッドシートに記録
 * @param {string} text - ログとして記録したいテキスト
 */
function debugLog(text) {
  const timestamp = new Date();
  const message = `[DEBUG] ${text}`;

  try {
    console.log(message); // Cloud Logging用

    const sheetId = getProperty('SHEET_ID');
    if (!sheetId) throw new Error('SHEET_ID が未設定です');

    const ss = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getSheetByName('debuglog');
    if (!sheet) throw new Error('debuglog シートが存在しません');

    sheet.appendRow([timestamp, String(text)]);
  } catch (err) {
    console.error(`[ERROR][debugLog] ${err.message || err}`);
  }
}

/**
 * エラーログをCloud Loggingおよびスプレッドに記録
 * @param {Error|string} error - Errorオブジェクトまたは文字列
 */
function logError(error) {
  const timestamp = new Date();
  const message = `[ERROR] ${error instanceof Error ? error.message : error}`;

  try {
    console.error(message);

    const sheetId = getProperty('SHEET_ID');
    const ss = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getSheetByName('debuglog');
    if (!sheet) throw new Error('debuglog シートが存在しません');

    sheet.appendRow([timestamp, message]);
  } catch (err) {
    console.error(`[FATAL][logError] ${err.message || err}`);
  }
}

/**
 * WARNログ用（任意：INFO未満の注意喚起用）
 * @param {string} text - 警告内容
 */
function logWarning(text) {
  const timestamp = new Date();
  const message = `[WARNING] ${text}`;

  try {
    console.warn(message);

    const sheetId = getProperty('SHEET_ID');
    const ss = SpreadsheetApp.openById(sheetId);
    const sheet = ss.getSheetByName('debuglog');
    if (!sheet) throw new Error('debuglog シートが存在しません');

    sheet.appendRow([timestamp, message]);
  } catch (err) {
    console.error(`[FATAL][logWarning] ${err.message || err}`);
  }
}
