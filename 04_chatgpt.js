/**
 * promptsシートからすべてのプロンプトを読み込む
 * @returns {Object} プロンプト名をキー、プロンプト内容を値とするオブジェクト
 */
function loadAllPrompts() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("prompts");
  const values = sheet.getDataRange().getValues();
  const prompts = {};

  for (let i = 0; i < values.length; i++) {
    const name = values[i][0];
    const content = values[i][1];
    if (name && content) {
      prompts[name] = content;
    }
  }

  return prompts;
}
function getDocTextFromGoogleDocument(docId) {
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  return body.getText();
}


/**
 * Googleドキュメントとスプレッドシートのプロンプトを合成し、{{course_list}}も差し込む
 * @param {string} promptName - promptsシートのプロンプト名（例："reservation_prompt"）
 * @param {string|null} mealType - "ランチ" or "ディナー" or null（コースフィルタ用）
 * @returns {string} 差し込み済みの完全なプロンプト
 */
function loadPromptMergedWithDocAndCourses(promptName = "reservation_prompt", mealType = null) {
  const prompts = loadAllPrompts();
  const rawPrompt = prompts[promptName];
  if (!rawPrompt) throw new Error(`プロンプト "${promptName}" が見つかりません。`);

  const courseSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("courses");
  if (!courseSheet) throw new Error('「courses」シートが見つかりません');

  const rows = courseSheet.getDataRange().getValues();

  const filtered = mealType
    ? rows.slice(1).filter(r => r[2] === mealType || r[1] === "席のみ予約")
    : rows.slice(1);

  const courseLines = filtered
    .filter(r => r[1])
    .map(r => {
      const name = r[1];
      const price = r[3] || "無料";
      const shortDesc = r[4] || "詳細は当日ご案内";
      const detail = r[5] || "";
      return `- ${name}（${price}）: ${shortDesc}\n  詳細：${detail}`;
    })
    .join("\n");

  let docText = "";
  try {
    const docId = PropertiesService.getScriptProperties().getProperty('DOC_ID');
    if (!docId) throw new Error('スクリプトプロパティ「DOC_ID」が未設定です。');
    docText = getDocTextFromGoogleDocument(docId);
  } catch (e) {
    debugLog("⚠️ Googleドキュメント読み込みエラー: " + e);
    docText = ""; // fallback
  }


  const promptWithCourses = (rawPrompt || "").replace("{{course_list}}", courseLines || "現在ご案内できるコースは準備中です。");

  return `${docText}\n\n${promptWithCourses}`;
}


/**
 * ChatGPTへ予約文脈で問い合わせを行う
 * @param {string} userId - ユーザーID（履歴管理用）
 * @param {string} userMessage - ユーザーのメッセージ
 * @param {string} promptName - 使用するプロンプト名（デフォルト："reservation_prompt"）
 * @returns {string} ChatGPTからの応答テキスト
 */
function callChatGPTWithHistory(userId, userMessage, promptName = "reservation_prompt") {
  appendUserHistoryToSheet(userId, "user", userMessage); // 先に保存

  const history = getUserHistoryFromSheet(userId); // 直近履歴取得

  const state = getUserState(userId) || {};
  const timeCategory = state.timeCategory || null;
  const systemPrompt = loadPromptMergedWithDocAndCourses(promptName, timeCategory);

  const messages = [
    { role: "system", content: systemPrompt },
    ...history
  ];

  const payload = {
    model: "gpt-4o",
    messages: messages,
    temperature: 0
  };

  const apiKey = getProperty("OPENAI_API_KEY");


  try {
    const response = UrlFetchApp.fetch("https://api.openai.com/v1/chat/completions", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: `Bearer ${apiKey}` },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const responseText = response.getContentText();
    debugLog("📥 GPTレスポンス:\n" + responseText);

    let json = {};
    try {
      json = JSON.parse(responseText);
    } catch (e) {
      debugLog("❌ JSONパース失敗：" + e.message);
      return "申し訳ありません、システムエラーが発生しました。";
    }

    const replyText = json.choices?.[0]?.message?.content?.trim();
    debugLog("🗣 GPT replyText: " + String(replyText));

    if (!replyText) {
      debugLog("⚠️ GPTからの応答が空でした。レスポンス: " + responseText);
      return "申し訳ありません。もう一度お試しください。";
    }

    appendUserHistoryToSheet(userId, "assistant", replyText); // 応答も保存
    return replyText;

  } catch (err) {
    debugLog("❌ GPT API呼び出し例外: " + (err.message || err));
    return "申し訳ありません。通信エラーが発生しました。";
  }
}




/**
 * テスト用：ChatGPT応答をログに出力
 */
function testChatGPTDebug() {
  const userMessage = "明日の18時に2人で15000円のコースで予約したい。名前は山田太郎、電話は08012345678。";
  const result = callChatGPTWithHistory("debug-user", userMessage);
  debugLog(result);
}

function testCallChatGPTWithPrompt() {
  const userId = "test_user";
  const userMessage = "コースは何がありますか？";

  const reply = callChatGPTWithHistory(userId, userMessage);
  debugLog("✅ テスト応答: " + reply);
}
