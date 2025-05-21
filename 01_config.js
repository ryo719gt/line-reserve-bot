/**
 * configシートから設定値を読み込んでオブジェクトで返す
 * @returns {Object} 設定オブジェクト
 */
function loadSettings() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('config');
  const values = sheet.getDataRange().getValues();

  const settings = {};
  for (let i = 0; i < values.length; i++) {
    const key = values[i][0];
    const value = values[i][1];
    if (key) settings[key] = value;
  }
  return settings;
}

/**
 * 設定から特定のキーを取得するヘルパー関数
 * @param {string} key
 * @returns {*} 対応する設定値（見つからなければ null）
 */
function getSetting(key) {
  const settings = loadSettings();
  return settings[key] || null;
}

/**
 * プロパティ保存用のユーティリティ（初期設定などに使う）
 * @param {string} key
 * @param {string} value
 */
function setProperty(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

/**
 * プロパティ取得用のユーティリティ（グローバル変数的に）
 * @param {string} key
 * @returns {string|null}
 */
function getProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}


function testLoadSettings() {
  const s = loadSettings();
  Logger.log(s["営業時間開始"]); // → 例：17:00
  Logger.log(s["通知方法"]);     // → Slack or Gmail
}

