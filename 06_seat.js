function checkSeatAvailability(date, time) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("seat");
  if (!sheet) {
    debugLog("❌ seatシートが見つかりません");
    return { status: "error", message: "内部エラー：seatシートがありません。" };
  }

  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowDate = row[0];
    const rowTime = row[1];
    const remain = parseInt(row[3], 10) || 0;

    if (rowDate === date && rowTime === time) {
      if (remain <= 0) {
        return { status: "full", message: "申し訳ありません、その時間は満席です。" };
      } else {
        return { status: "available", message: `その時間はご予約可能です（残り${remain}席）` };
      }
    }
  }

  return { status: "unknown", message: "その日時の予約枠が見つかりませんでした。" };
}

function handleSeatAvailabilityCheck(userId, userMessage) {
  const info = extractReservationFromText(userMessage);

  if (!info.date || !info.time) {
    return "確認したい日付と時間を教えてください。例：5月23日18時など";
  }

  const result = checkSeatAvailability(info.date, info.time);
  return result.message;
}




function isSeatAvailable(date, time, people) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("seat");
  if (!sheet) {
    debugLog("❌ seatシートが見つかりません");
    return false;
  }

  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowDate = formatDate(row[0]);
    const rowTime = formatTime(row[1]);

    if (rowDate === formatDate(date) && rowTime === formatTime(time)) {
      const max = Number(row[2]); // 最大人数
      const current = Number(row[3]); // 現在の使用人数
      return (max - current) >= Number(people);
    }
  }

  debugLog("⚠️ 指定の日時がseatシートに存在しません");
  return false;
}

function getMaxSeatFromConfig() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("config");
  if (!sheet) {
    debugLog("❌ configシートが見つかりません");
    return 8; // デフォルト
  }

  const values = sheet.getDataRange().getValues();
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === "最大予約人数") {
      return parseInt(values[i][1], 10) || 8;
    }
  }

  debugLog("⚠️ configに最大予約人数が見つかりません");
  return 8;
}

function incrementSeatUsage(date, time, people) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("seat");
  if (!sheet) {
    debugLog("❌ seatシートが見つかりません");
    return false;
  }

  const maxSeat = getMaxSeatFromConfig();
  const values = sheet.getDataRange().getValues();
  const delta = parseInt(people, 10);

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowDate = row[0];
    const rowTime = row[1];

    if (rowDate === date && rowTime === time) {
      const currentAvailable = parseInt(row[3], 10) || 0;
      let newAvailable = currentAvailable - delta; // deltaが負なら増える

      // 最大数は maxSeat、最小は0
      newAvailable = Math.min(maxSeat, Math.max(0, newAvailable));
      const used = maxSeat - newAvailable;

      sheet.getRange(i + 1, 4).setValue(newAvailable);       // D列：空き
      sheet.getRange(i + 1, 5).setValue(`${used}人利用中`);  // E列：使用状況
      return true;
    }
  }

  // 行がなければ新規追加（通常はキャンセル時にここ来ないが念のため）
  const remain = Math.max(0, maxSeat - delta);
  const status = `${Math.max(0, delta)}人利用中`;
  sheet.appendRow([date, time, maxSeat, remain, status]);
  debugLog("🆕 使用人数を新規追加しました");
  return true;
}


function updateSeatAfterCancel(date, time, people) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("seat");
  if (!sheet) return false;

  const values = sheet.getDataRange().getValues();
  const maxSeat = getMaxSeatFromConfig();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row[0] === date && row[1] === time) {
      const current = parseInt(row[3], 10) || 0;
      const updatedRemain = current + parseInt(people);

      sheet.getRange(i + 1, 4).setValue(updatedRemain); // 残席数
      sheet.getRange(i + 1, 5).setValue(`${maxSeat - updatedRemain}人利用中`);
      return true;
    }
  }
  return false;
}

