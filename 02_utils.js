// 02_utils.gs に追記

/**
 * "18時" → "18:00" に変換
 */
function normalizeTime(rawTime) {
  if (!rawTime) return null;
  const match = rawTime.match(/(\d{1,2})時/);
  if (match) {
    const hour = match[1].padStart(2, "0");
    return `${hour}:00`;
  }
  if (/^\d{1,2}:\d{2}$/.test(rawTime)) {
    return rawTime;
  }
  return null;
}

/**
 * "明日" → "2024/06/21" などに変換（簡易対応）
 */
function resolveRelativeDate(rawDate) {
  const today = new Date();
  let targetDate = new Date(today);

  if (/今日/.test(rawDate)) {
    // そのまま
  } else if (/明日/.test(rawDate)) {
    targetDate.setDate(today.getDate() + 1);
  } else if (/明後日/.test(rawDate)) {
    targetDate.setDate(today.getDate() + 2);
  } else if (/来週の?(月|火|水|木|金|土|日)/.test(rawDate)) {
    const weekdayMap = { "日": 0, "月": 1, "火": 2, "水": 3, "木": 4, "金": 5, "土": 6 };
    const match = rawDate.match(/来週の?(月|火|水|木|金|土|日)/);
    if (match) {
      const targetWeekday = weekdayMap[match[1]];
      const currentWeekday = today.getDay();
      const diff = 7 + targetWeekday - currentWeekday;
      targetDate.setDate(today.getDate() + diff);
    }
  } else {
    return null;
  }

  return Utilities.formatDate(targetDate, "Asia/Tokyo", "yyyy/MM/dd");
}

/**
 * GPTの返却結果を補正（time/dateなど）
 */
function sanitizeExtractedInfo(extracted) {
  const fixed = { ...extracted };

  // 時間整形
  if (fixed.time) {
    fixed.time = normalizeTime(fixed.time);
  }

  // 日付整形（短い文字列なら相対日付とみなす）
  if (fixed.date && fixed.date.length < 10) {
    const resolved = resolveRelativeDate(fixed.date);
    if (resolved) fixed.date = resolved;
  }

  return fixed;
}


function formatDate(d) {
  if (typeof d === "string") return d.split(" ")[0];
  return Utilities.formatDate(new Date(d), "Asia/Tokyo", "yyyy/MM/dd");
}

function formatTime(t) {
  if (typeof t === "string") return t.trim();
  return Utilities.formatDate(new Date(t), "Asia/Tokyo", "HH:mm");
}



/**
 * LINEにテキストメッセージを返信する
 * @param {string} replyToken
 * @param {string} message
 */
function sendLineReply(replyToken, message) {
    if (!message || message.trim() === "") {
    debugLog("⚠️ 応答テキストが空のため返信をスキップ");
    return;
  }
  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + getProperty("LINE_CHANNEL_ACCESS_TOKEN")
  };

  const payload = JSON.stringify({
    replyToken: replyToken,
    messages: [{ type: "text", text: message }]
  });

  const url = "https://api.line.me/v2/bot/message/reply";

  const options = {
    method: "post",
    headers: headers,
    payload: payload,
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  debugLog("📤 LINE返信レスポンス: " + response.getContentText());
}

function formatWithWeekday(dateInput, timeInput) {
  const days = ['日', '月', '火', '水', '木', '金', '土'];

  // ✅ 日付部分を Date に変換
  let yyyy, mm, dd;
  if (typeof dateInput === 'string') {
    [yyyy, mm, dd] = dateInput.split('/').map(n => parseInt(n, 10));
  } else if (dateInput instanceof Date) {
    yyyy = dateInput.getFullYear();
    mm = dateInput.getMonth() + 1;
    dd = dateInput.getDate();
  } else {
    return '⚠️ 日付形式エラー';
  }

  // ✅ 時間部分を補正
  let hour = 0, minute = 0;
  if (typeof timeInput === 'string') {
    const parts = timeInput.split(':');
    hour = parseInt(parts[0], 10);
    minute = parseInt(parts[1], 10);
  } else if (timeInput instanceof Date) {
    hour = timeInput.getHours();
    minute = timeInput.getMinutes();
  }

  const date = new Date(yyyy, mm - 1, dd, hour, minute);
  const dateStr = Utilities.formatDate(date, "Asia/Tokyo", "yyyy/MM/dd");
  const timeStr = Utilities.formatDate(date, "Asia/Tokyo", "HH:mm");
  const weekday = days[date.getDay()];

  return `${dateStr}（${weekday}）${timeStr}`;
}



/**
 * configシートから指定項目の値を取得
 * @param {string} key
 * @returns {string}
 */
function getConfigValue(key) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("config");
  const values = sheet.getRange("A:B").getValues();

  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === key) {
      return values[i][1];
    }
  }
  return "";
}

/**
 * コース一覧を配列で取得
 * @returns {string[]}
 */
function getCourseOptions() {
  const raw = getConfigValue("コース一覧");
  return raw ? raw.split(",").map(s => s.trim()) : [];
}

/**
 * コース一覧と価格を組み合わせて表示文を作成
 * @returns {string}
 */
function generateCourseTextList() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("courses");
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues(); // A2:D

  let text = "コース一覧：\n";
  values.forEach(row => {
    const [id, name, price, desc] = row;
    if (name && price && desc) {
      text += `・${name}（${price}円）… ${desc}\n`;
    }
  });

  return text.trim();
}

function getCourseList() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("courses");
  const values = sheet.getDataRange().getValues();
  return values.slice(1).map(row => ({
    id: row[0],
    name: row[1],
    price: row[2],
    description: row[3]
  }));
}




