function doPost(e) {
  const response = ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  doPostHandler(e);
  return response;
}

function doPostHandler(e) {
  try {
    debugLog("▶️ doPostHandler START");

    const json = JSON.parse(e.postData.contents);
    debugLog("✅ JSON解析完了");

    const event = json.events?.[0];
    const userMessage = event?.message?.text;
    const userId = event?.source?.userId;
    const replyToken = event?.replyToken;

    debugLog(`📩 受信メッセージ: ${userMessage}`);
    debugLog(`👤 ユーザーID: ${userId}`);
    debugLog(`🪙 リプライトークン: ${replyToken}`);



    const reply = handleUserInputGPT(userId, userMessage);
    debugLog(`💬 返信メッセージ生成: ${reply}`);

    sendLineReply(replyToken, reply);
    debugLog("📤 LINE返信送信完了");

    debugLog("✅ doPostHandler 終了");
  } catch (err) {
    debugLog('❌ doPostHandler エラー: ' + err.stack);
  }
}
