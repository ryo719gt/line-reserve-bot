function handleUserInputGPT(userId, userMessage) {
  const userProps = PropertiesService.getUserProperties();
  const pending = userProps.getProperty(`pending_${userId}`);
  const confirmWords = ["はい", "お願いします", "確定", "よろしく", "よろしくお願いします"];
  const isConfirmation = confirmWords.some(w => userMessage.includes(w));

  debugLog("ユーザーのメッセージ: " + userMessage);  // 受け取ったメッセージをログ

  // ✅ 予約確認リクエスト
  if (/予約.*(確認|一覧|見たい|教えて)/.test(userMessage)) {
    debugLog("予約確認のリクエストを受けました");  // 確認リクエストをログ
    const showCanceled = /キャンセル/.test(userMessage);
    const showPast = /過去|履歴/.test(userMessage);
    return confirmCurrentReservations(userId, {
      includeCanceled: showCanceled,
      includePast: showPast
    });
  }

  // ✅ 満席チェック
  if (/空き|空き状況|空いてる|満席|席の確認|予約できますか|席ありますか|確認したい/.test(userMessage)) {
    debugLog("空き状況の確認リクエストを受けました");  // 満席チェックリクエストをログ
    return handleSeatAvailabilityCheck(userId, userMessage);
  }

  // ✅ 予約変更
  if (/予約.*変更/.test(userMessage)) {
    debugLog("予約変更のリクエストを受けました");  // 予約変更リクエストをログ
    return handleChangeRequest(userId, userMessage);
  }

  // ✅ キャンセル処理
  if (/キャンセル/.test(userMessage)) {
    debugLog("キャンセルのリクエストを受けました");  // キャンセルリクエストをログ
    return handleCancelRequest(userId);
  }

  // 新規予約処理（必要な情報が揃っていない場合の確認）
  const fullText = userProps.getProperty(`pending_detail_${userId}`) || "";
  debugLog("新規予約詳細: " + fullText);  // 新規予約詳細情報をログ

  const info = extractReservationFromText(fullText);
  debugLog("抽出された予約情報: " + JSON.stringify(info));  // 抽出された予約情報をログ

  const success = registerReservation(info);
  if (success) {
    userProps.deleteProperty(`pending_${userId}`);
    userProps.deleteProperty(`pending_detail_${userId}`);
    return `ご予約を承りました。ありがとうございます！${info.date} ${info.time} にお待ちしております。`;
  } else {
    debugLog("予約の保存に失敗しました");  // 予約保存失敗ログ
    return "申し訳ありません。予約の保存に失敗しました。";
  }
}


function confirmCurrentReservations(userId, options = { includeCanceled: false, includePast: false }) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("reservation");

  // シートの列名からインデックスを取得
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const dateIndex = headers.indexOf("日付");
  const timeIndex = headers.indexOf("時間");
  const peopleIndex = headers.indexOf("人数");
  const nameIndex = headers.indexOf("名前");
  const statusIndex = headers.indexOf("ステータス");

  if (dateIndex === -1 || timeIndex === -1 || peopleIndex === -1 || nameIndex === -1 || statusIndex === -1) {
    return "必要な列がシートに存在しません。";
  }

  let response = "現在のご予約内容は以下の通りです：\n";
  let reservationsFound = false;

  const values = sheet.getDataRange().getValues(); // シート内のすべてのデータを取得

  // シート内からユーザーの予約情報を探す
  for (let i = values.length - 1; i >= 1; i--) {  // 逆順で検索し、最新の予約から順番に処理
    const row = values[i];
    if (row[6] === userId && row[statusIndex] === "確定") {  // LINE IDが一致し、ステータスが「確定」

      reservationsFound = true;

      // 各予約情報を取得
      const formattedDate = Utilities.formatDate(new Date(row[dateIndex]), "Asia/Tokyo", "yyyy/MM/dd");
      const formattedTime = Utilities.formatDate(new Date(row[timeIndex]), "Asia/Tokyo", "HH:mm");

      // 予約情報をレスポンスに追加
      response += `
- 日付：${formattedDate}
- 時間：${formattedTime}
- 人数：${row[peopleIndex]}名
- コース：${row[3]}
- お名前：${row[nameIndex]}様
- 電話番号：${row[5]}\n`;

      // キャンセル済みや過去の予約情報を追加する場合
      if (options.includeCanceled) {
        response += "\nキャンセルされた予約も含めます。";
      }
      if (options.includePast) {
        response += "\n過去の予約履歴も表示します。";
      }
    }
  }

  if (!reservationsFound) {
    return "直近のご予約が見つかりませんでした。";
  }

  return response;
}



function registerReservation(state) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("reservation");
  if (!sheet) {
    debugLog("❌ reservationシートが見つかりません");
    return false;
  }

  // バリデーション
  if (!state.date || !state.time || !state.people || !state.name || !state.tel) {
    debugLog("❌ 必要な予約情報が不足しているため、保存をスキップしました");
    debugLog("不足している情報: " + JSON.stringify(state));  // 不足情報のログ
    return false;
  }

  const row = [
    state.date,
    state.time,
    state.people,
    state.course,
    state.name,
    "'" + String(state.tel), // ← 電話番号を文字列で
    state.userId || "",
    "確定",
    new Date(),
    ""
  ];

  debugLog("📝 登録行の内容: " + JSON.stringify(row));  // 保存する内容をログ

  try {
    sheet.appendRow(row);
    debugLog("✅ 予約情報をreservationシートに保存しました");
  } catch (e) {
    debugLog("❌ sheet.appendRow でエラー: " + e);
    return false;
  }

  // 座席数更新
  const ok = incrementSeatUsage(state.date, state.time, state.people);
  if (!ok) {
    debugLog("⚠️ 使用人数の加算に失敗しました（seatが未設定か）");
  }

  return true;
}


function extractReservationFromText(text) {
  const now = new Date();
  const cleanedText = text.replace(/\n/g, " "); // 改行をスペースに置き換え

  // GPTを使ってユーザーのメッセージを解析
  const prompt = `以下のメッセージから予約情報を抽出してください：\n\n${cleanedText}\n\n抽出する情報：日付、時間、人数、コース、名前、電話番号`;

  // GPTを呼び出して、抽出されたデータを受け取る
  const extractedData = callGPT(prompt);

  // GPTの応答データを処理する（仮の構造として）
  let date = extractedData.date || null;
  let time = extractedData.time || null;
  let people = extractedData.people || null;
  let course = extractedData.course || null;
  let name = extractedData.name || "テスト太朗";  // 仮の名前を「テスト太朗」に変更
  let tel = extractedData.tel || null;
  let weekday = extractedData.weekday || null;

  // ログ出力して確認
  debugLog("抽出された日付: " + date);
  debugLog("抽出された時間: " + time);
  debugLog("抽出された人数: " + people);
  debugLog("抽出されたコース: " + course);
  debugLog("抽出された名前: " + name);
  debugLog("抽出された電話番号: " + tel);
  debugLog("抽出された曜日: " + weekday);

  // 抽出された情報をオブジェクトとして返す
  return { date, time, people, course, name, tel, weekday };
}

function callGPT(prompt) {
  // GPT API呼び出しを行い、ユーザーの入力メッセージから予約情報を抽出
  // 実際のAPI呼び出しのコードはここに書かれます
  // ここでは仮のレスポンスを返します（実際はAPIレスポンスを取得して使います）

  const response = {
    date: "2025/05/26",  // 仮の日付
    time: "18:00",  // 仮の時間
    people: "4",  // 仮の人数
    course: "席のみ予約",  // 仮のコース
    name: "テスト太朗",  // 仮の名前（変更）
    tel: "08012345678",  // 仮の電話番号
    weekday: "月曜日"  // 仮の曜日
  };

  return response;
}





function handleChangeRequest(userId, userMessage) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("reservation");
  const values = sheet.getDataRange().getValues(); // シート内のすべてのデータを取得
  
  let current = null;
  // 既存の予約を探す
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row[6] === userId && row[7] === "確定") {  // LINE IDが一致し、ステータスが「確定」
      current = {
        date: row[0],  // 日付
        time: row[1],  // 時間
        people: row[2],  // 人数
        course: row[3],  // コース
        name: row[4],  // 名前
        tel: row[5],  // 電話番号
        userId: row[6]  // ユーザーID
      };
      break;
    }
  }

  if (!current) {
    return "変更する予約情報が見つかりません。まずは新規予約をお願いします。";
  }

  // ユーザーから抽出された新しい情報
  const newInfo = extractReservationFromText(userMessage);  // 例えば、ユーザーが「5/26に変更したい」と言った場合

  // 変更された項目だけを更新
  const updated = {
    ...current,
    date: newInfo.date || current.date,  // 変更された日付
    time: newInfo.time || current.time,  // 変更された時間
    people: newInfo.people || current.people,  // 変更された人数
    course: newInfo.course || current.course,  // 変更されたコース
    name: newInfo.name || current.name,  // 変更された名前
    tel: newInfo.tel || current.tel,  // 変更された電話番号
    userId
  };

  // 変更後の予約が満席でないか確認
  const isAvailable = isSeatAvailable(updated.date, updated.time, updated.people);
  if (!isAvailable) {
    return `申し訳ありませんが、${updated.date} ${updated.time} の時間帯は満席です。他の日時をご検討いただけますか？`;
  }

  // スプレッドシート内で該当する行を更新
  let updatedRow = false;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    // 既存の予約を更新（既存の行を見つけて更新）
    if (row[0] === updated.date && row[1] === updated.time && row[4] === updated.name) {
      sheet.getRange(i + 1, 1).setValue(updated.date);  // 日付
      sheet.getRange(i + 1, 2).setValue(updated.time);  // 時間
      sheet.getRange(i + 1, 3).setValue(updated.people);  // 人数
      sheet.getRange(i + 1, 4).setValue(updated.course);  // コース
      sheet.getRange(i + 1, 5).setValue(updated.name);  // 名前
      sheet.getRange(i + 1, 6).setValue(updated.tel);  // 電話番号
      updatedRow = true;
      break;  // 見つかったら更新して終了
    }
  }

  if (updatedRow) {
    return `ご予約の変更内容が反映されました：
- 日時：${updated.date}
- 時間：${updated.time}
- 人数：${updated.people}
- コース：${updated.course}
- お名前：${updated.name}
- 電話番号：${updated.tel}`;
  } else {
    return "予約の変更に失敗しました。再度お試しください。";
  }
}






function handleCancelRequest(userId) {
  const userProps = PropertiesService.getUserProperties();
  const last = userProps.getProperty(`last_reservation_${userId}`);
  if (!last) return "直近のご予約が見つかりませんでした。";

  const info = JSON.parse(last);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("reservation");
  const values = sheet.getDataRange().getValues();

  const COL_DATE = 0;
  const COL_TIME = 1;
  const COL_PEOPLE = 2;
  const COL_COURSE = 3;
  const COL_NAME = 4;
  const COL_TEL = 5;
  const COL_USERID = 6;
  const COL_STATUS = 7;
  const COL_UPDATED_AT = 9;

  let found = false;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (
      row[COL_DATE] === info.date &&
      row[COL_TIME] === info.time &&
      row[COL_NAME] === info.name &&
      row[COL_TEL] === info.tel &&
      row[COL_USERID] === userId &&
      row[COL_STATUS] === "確定"
    ) {
      sheet.getRange(i + 1, COL_STATUS + 1).setValue("キャンセル済");
      sheet.getRange(i + 1, COL_UPDATED_AT + 1).setValue(new Date());
      found = true;
      break;
    }
  }

  if (found) {
    incrementSeatUsage(info.date, info.time, -parseInt(info.people || 1));
    // userProps.deleteProperty(`last_reservation_${userId}`); ←必要なら有効化
    return `ご予約をキャンセルいたしました。`;
  } else {
    return "該当のご予約が見つかりませんでした。";
  }
}



function cancelReservation(userId, date, time, people) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("reservation");
  if (!sheet) return false;

  const values = sheet.getDataRange().getValues();
  let updated = false;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row[0] === date && row[1] === time && row[6] === userId && row[7] === "確定") {
      sheet.getRange(i + 1, 7).setValue("キャンセル");
      sheet.getRange(i + 1, 10).setValue("キャンセル済み");

      // 座席数を戻す
      updateSeatAfterCancel(date, time, people);
      updated = true;
      break;
    }
  }

  return updated;
}




function testExtractReservation() {
  const testText = `
ありがとうございます。以下の内容で予約を確定してもよろしいですか？

- 日時：5月22日 19:00
- 人数：3名
- コース：季節の食材を使ったシェフのおすすめコース<8品>（15,000円（税込））
- お名前：中村凌
- 電話番号：08012345678

ご確認をお願いいたします。
`;

  const result = extractReservationFromText(testText);
  Logger.log(result);
}

function testRegisterReservation() {
  const mockData = {
    date: "2025/05/22",
    time: "19:00",
    people: "2",
    course: "季節の食材を使ったシェフのおすすめコース<8品>（15,000円（税込））",
    name: "テスト太郎",
    tel: "08099998888",
    userId: "test_user_id"
  };

  const result = registerReservation(mockData);
  Logger.log("登録結果: " + result);
}

