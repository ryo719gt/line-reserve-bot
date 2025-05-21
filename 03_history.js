function cleanAllUserHistories() {
  const props = PropertiesService.getUserProperties();
  const allProps = props.getProperties();
  let cleanedCount = 0;

  for (const key in allProps) {
    if (key.startsWith("history_")) {
      try {
        const history = JSON.parse(allProps[key]);
        const cleanedHistory = history.map(entry => ({
          role: entry.role,
          content: String(entry.content)
        }));

        props.setProperty(key, JSON.stringify(cleanedHistory));
        cleanedCount++;
      } catch (e) {
        Logger.log(`❌ エラー in ${key}: ${e}`);
      }
    }
  }

  Logger.log(`✅ クリーンアップ完了: ${cleanedCount} 件の履歴を修正しました。`);
}

function cleanHistorySheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("history");
  const range = sheet.getDataRange();
  const values = range.getValues();

  for (let i = 1; i < values.length; i++) {
    if (typeof values[i][3] === 'number') {
      values[i][3] = `'0${values[i][3]}`; // 先頭0を復元して文字列化
    }
  }

  range.setValues(values);
  Logger.log("✅ historyシートの数値→文字列変換を完了しました。");
}


function saveUserState(userId, data) {
  PropertiesService.getUserProperties().setProperty(userId, JSON.stringify(data));
}

function getUserState(userId) {
  const json = PropertiesService.getUserProperties().getProperty(userId);
  return json ? JSON.parse(json) : null;
}

function clearUserState(userId) {
  PropertiesService.getUserProperties().deleteProperty(userId);
}

function clearUserHistory(userId) {
  PropertiesService.getUserProperties().deleteProperty(`history_${userId}`);
}

function appendUserHistory(userId, role, content) {
  const props = PropertiesService.getUserProperties();
  const key = `history_${userId}`;
  const raw = props.getProperty(key);
  const history = raw ? JSON.parse(raw) : [];

  history.push({ role, content: String(content) }); // ★ ここで数値も文字列化

  if (history.length > 20) history.splice(0, history.length - 20);
  props.setProperty(key, JSON.stringify(history));
}


function getUserHistory(userId) {
  const raw = PropertiesService.getUserProperties().getProperty(`history_${userId}`);
  const parsed = raw ? JSON.parse(raw) : [];

  return parsed.map(entry => ({
    role: entry.role,
    content: String(entry.content) // ★ ここも保険で文字列化
  }));
}


function getUserHistoryFromSheet(userId, limit = 20) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("history");
  const values = sheet.getDataRange().getValues();

  const history = values
    .filter(row => row[1] === userId)
    .sort((a, b) => new Date(a[0]) - new Date(b[0])) // 古い順
    .slice(-limit)
    .map(row => ({ role: row[2], content: row[3] }));

  return history;
}

function appendUserHistoryToSheet(userId, role, content) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("history");
  const safeContent = String(content).startsWith("0") ? "'" + String(content) : String(content);

  sheet.appendRow([
    new Date(), userId, role, safeContent, "active", ""
  ]);
}


// ① 定期クリーンアップ（古い履歴を削除）トリガー推奨
function cleanOldHistoryRows(maxRows = 1000) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("history");
  const lastRow = sheet.getLastRow();
  if (lastRow > maxRows) {
    const numRowsToDelete = lastRow - maxRows;
    sheet.deleteRows(2, numRowsToDelete); // ヘッダーを避けて削除
    Logger.log(`✅ ${numRowsToDelete} 件の古い履歴を削除しました。`);
  }
}

