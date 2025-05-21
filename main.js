// // 共通ユーティリティ
// function getProperty(key) {
//   return PropertiesService.getScriptProperties().getProperty(key);
// }




// // 状態保存・取得・削除ユーティリティ




// function testDebugLog() {
//   debugLog('🧪 テストログ：ここに出れば機能OK');
// }

// function testDoPost() {
//   const mockData = {
//     events: [
//       {
//         replyToken: "dummy-token",
//         message: {
//           text: "5月20日の20時に2人で予約できますか？"
//         },
//         source: {
//           userId: "Uxxxxxxxxxxxxxx"
//         }
//       }
//     ]
//   };

//   const e = {
//     postData: {
//       contents: JSON.stringify(mockData)
//     }
//   };

//   doPost(e);
// }

// // フォーマット関数
// function formatDate(input) {
//   if (input instanceof Date) {
//     return Utilities.formatDate(input, 'Asia/Tokyo', 'yyyy/MM/dd');
//   }
//   return String(input).replace(/-/g, '/').trim();
// }

// function formatTime(input) {
//   const raw = String(input).trim();
//   if (raw.match(/^\d{1,2}:\d{2}/)) return raw.slice(0, 5); // "20:00:00" → "20:00"
//   if (raw.match(/^\d{1,2}時/)) return raw.replace('時', ':00'); // "20時" → "20:00"
//   return raw;
// }

// // 整形関数
// function normalizeDateTime(extracted) {
// if (!extracted.date || extracted.date === 'なし') extracted.date = '';
// if (!extracted.time || extracted.time === 'なし') extracted.time = '';
// if (!extracted.people || extracted.people === 'なし') extracted.people = '';

//   const today = new Date();
//   const year = today.getFullYear();

//   // ex: 5/20 → 2025/05/20 に統一
//   if (extracted.date.includes('/')) {
//     const [month, day] = extracted.date.split('/');
//     extracted.date = `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
//   }

//   // 時間（18時 → 18:00）
//   const timeRaw = extracted.time;
//   if (timeRaw.includes('時')) {
//     const hour = timeRaw.match(/(\d{1,2})時/)?.[1] || '00';
//     const minute = timeRaw.includes('半') ? '30' : '00';
//     extracted.time = `${hour.padStart(2, '0')}:${minute}`;
//   } else if (timeRaw.includes(':')) {
//     const [h, m] = timeRaw.split(':');
//     extracted.time = `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
//   }

//   // 人数（"2人" → 2）
//   extracted.people = parseInt(String(extracted.people).replace(/[^0-9]/g, ''));

//   return extracted;
// }

// // ＝＝＝＝ シート操作系 ＝＝＝＝＝
// function checkSeatAvailability(date, time, people) {
//   debugLog(`🔍 チェック対象: date=${date}, time=${time}, people=${people}`);

//   const ss = SpreadsheetApp.openById(getProperty('SHEET_ID'));
//   const sheet = ss.getSheetByName('座席ステータス');
//   const data = sheet.getDataRange().getValues();

//   let foundMatch = false;
//   let hasAvailableSeat = false;

//   for (let i = 1; i < data.length; i++) {
//     const rowDate = formatDate(data[i][0]);
//     const rowTime = formatTime(data[i][1]);

//     debugLog(`🧾 行チェック: rowDate=${rowDate}, rowTime=${rowTime}`);

//     if (rowDate === date && rowTime === time) {
//       foundMatch = true;

//       const seat2 = (data[i][2] || '').toString().trim();
//       const seat4L = (data[i][3] || '').toString().trim();
//       const seat4R = (data[i][4] || '').toString().trim();

//       debugLog(`🪑 空席状況: seat2="${seat2}", seat4L="${seat4L}", seat4R="${seat4R}"`);

//       const isSeat2Available = seat2 === '';
//       const isSeat4LAvailable = seat4L === '';
//       const isSeat4RAvailable = seat4R === '';

//       debugLog(`✅ 判定: 2人席=${isSeat2Available}, 4人席L=${isSeat4LAvailable}, 4人席R=${isSeat4RAvailable}`);

//       if (people <= 2 && (isSeat2Available || isSeat4LAvailable || isSeat4RAvailable)) {
//         hasAvailableSeat = true;
//       } else if (people >= 3 && people <= 4 && (isSeat4LAvailable || isSeat4RAvailable)) {
//         hasAvailableSeat = true;
//       }
//     }
//   }

//   if (!foundMatch) {
//     debugLog(`📭 一致する行が見つからなかった（整形不一致の可能性）`);
//   }

//   return foundMatch ? hasAvailableSeat : true;  // ← 未登録の場合は空席扱い
// }

// function ensureSeatRow(date, time) {
//   const ss = SpreadsheetApp.openById(getProperty('SHEET_ID'));
//   const sheet = ss.getSheetByName('座席ステータス');
//   const data = sheet.getDataRange().getValues();

//   const targetDate = formatDate(date); // ex: "2025/05/20"
//   const targetTime = formatTime(time); // ex: "18:00"

//   let matchedRow = null;

//   for (let i = 1; i < data.length; i++) {
//     const rowDateRaw = data[i][0];
//     const rowTimeRaw = data[i][1];

//     const rowDate = formatDate(rowDateRaw);
//     const rowTime = formatTime(rowTimeRaw);

//     debugLog(`🔍 ensure比較: rowDate=${rowDate}, rowTime=${rowTime} vs target=${targetDate}, ${targetTime}`);

//     if (rowDate === targetDate && rowTime === targetTime) {
//       matchedRow = i + 1; // スプレッドシート行番号
//       break;
//     }
//   }

//   if (matchedRow) {
//     debugLog(`✅ 行はすでに存在しています（${matchedRow}行目）: ${targetDate} ${targetTime}`);
//   } else {
//     sheet.appendRow([targetDate, targetTime, '', '', '']);
//     debugLog(`🆕 新しい行を追加しました: ${targetDate} ${targetTime}`);
//   }
// }


// // 予約管理シートへの記入
// function recordReservationToLogSheet(date, time, people, seatLabel, name, tel, userId) {
//   const ss = SpreadsheetApp.openById(getProperty('SHEET_ID'));
//   const sheet = ss.getSheetByName('予約管理');
//   if (!sheet) {
//     debugLog('❌ 予約管理シートが見つかりません');
//     return;
//   }

//   sheet.appendRow([
//     date,
//     time,
//     people,
//     seatLabel,
//     name,
//     tel,
//     userId,
//     '確定',
//     ''
//   ]);

//   debugLog(`📝 予約記録: ${date} ${time} ${people}名 ${seatLabel} 名前=${name} 電話=${tel}`);
// }



// // 予約処理
// function reserveSeat(date, time, people) {
//   const ss = SpreadsheetApp.openById(getProperty('SHEET_ID'));
//   const sheet = ss.getSheetByName('座席ステータス');
//   const data = sheet.getDataRange().getValues();

//   for (let i = 1; i < data.length; i++) {
//     const rowDate = formatDate(data[i][0]);
//     const rowTime = formatTime(data[i][1]);

//     if (rowDate === date && rowTime === time) {
//       if (people <= 2 && data[i][2] === '') {
//         sheet.getRange(i + 1, 3).setValue('🈺');
//         return { success: true, seat: '2名席' };
//       } else if (people <= 4) {
//         if (data[i][3] === '') {
//           sheet.getRange(i + 1, 4).setValue('🈺');
//           return { success: true, seat: '4名席L' };
//         } else if (data[i][4] === '') {
//           sheet.getRange(i + 1, 5).setValue('🈺');
//           return { success: true, seat: '4名席R' };
//         }
//       }
//     }
//   }

//   return { success: false };
// }


// //  名前を取得
// function savePendingNameRequest(userId, date, time, people, seatLabel) {
//   const prop = PropertiesService.getUserProperties();
//   const key = `pending_${userId}`;
//   const value = JSON.stringify({ date, time, people, seatLabel });
//   prop.setProperty(key, value);
// }

// function getPendingNameRequest(userId) {
//   const prop = PropertiesService.getUserProperties();
//   const value = prop.getProperty(`pending_${userId}`);
//   if (value) {
//     prop.deleteProperty(`pending_${userId}`); // 一度で消す
//     return JSON.parse(value);
//   }
//   return null;
// }



// // キャンセル処理
// function cancelReservation(date, time, people) {
//   const ss = SpreadsheetApp.openById(getProperty('SHEET_ID'));
//   const sheet = ss.getSheetByName('座席ステータス');
//   const data = sheet.getDataRange().getValues();

//   for (let i = 1; i < data.length; i++) {
//     const rowDate = formatDate(data[i][0]);
//     const rowTime = formatTime(data[i][1]);

//     if (rowDate === date && rowTime === time) {
//       if (people <= 2 && data[i][2] === '🈺') {
//         sheet.getRange(i + 1, 3).setValue('');
//         return true;
//       } else if (people <= 4) {
//         if (data[i][3] === '🈺') {
//           sheet.getRange(i + 1, 4).setValue('');
//           return true;
//         } else if (data[i][4] === '🈺') {
//           sheet.getRange(i + 1, 5).setValue('');
//           return true;
//         }
//       }
//     }
//   }
//   return false;
// }

// // LINE送信関数
// function sendLineReply(replyToken, message) {
//   const url = 'https://api.line.me/v2/bot/message/reply';
//   const headers = {
//     'Content-Type': 'application/json',
//     'Authorization': 'Bearer ' + getProperty('LINE_TOKEN')
//   };

//   const payload = {
//     replyToken: replyToken,
//     messages: [{ type: 'text', text: message }]
//   };

//   const options = {
//     method: 'post',
//     headers: headers,
//     payload: JSON.stringify(payload),
//     muteHttpExceptions: true // ← これ追加！
//   };

//   try {
//     const response = UrlFetchApp.fetch(url, options);
//     debugLog('LINE送信成功: ' + response.getContentText());
//   } catch (err) {
//     debugLog('LINE送信エラー: ' + err);
//   }
// }




// // ＝＝＝＝＝ GPT通信 ＝＝＝＝＝

// // 往復会話の補助関数
// function getUserChatHistory(userId) {
//   const raw = PropertiesService.getUserProperties().getProperty(`HISTORY_${userId}`);
//   return raw ? JSON.parse(raw) : [];
// }

// function updateUserChatHistory(userId, role, content) {
//   const key = `HISTORY_${userId}`;
//   const prop = PropertiesService.getUserProperties();
//   const raw = prop.getProperty(key);
//   let history = raw ? JSON.parse(raw) : [];

//   history.push({ role, content });

//   // 最大10件（5往復）に制限
//   if (history.length > 10) {
//     history = history.slice(history.length - 10);
//   }

//   prop.setProperty(key, JSON.stringify(history));
// }

// function clearUserChatHistory(userId) {
//   PropertiesService.getUserProperties().deleteProperty(`HISTORY_${userId}`);
// }

// // GPT関数
// function callChatGPT(promptText, userId) {
//   debugLog('🛠 callChatGPT に入りました');

//   const apiKey = getProperty('GPT_KEY');
//   const url = 'https://api.openai.com/v1/chat/completions';

//   const now = new Date();
//   const currentDate = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy/MM/dd');
//   const currentWeekday = ['日','月','火','水','木','金','土'][now.getDay()];

//   const systemPrompt = {
//   role: 'system',
//   content: `
// あなたはLINE上で動作する予約Botです。
// 今日は ${currentDate}（${currentWeekday}）です。
// ユーザーとの会話から意図（intent）を推測し、不足している情報があれば自然に尋ねる形で返信を作成してください。

// 【目的】
// - 予約希望や確定、キャンセル、変更などをスムーズに聞き取り、必要な情報（日付・時間・人数）を揃えること。
// - 1回の発言で全ての情報が揃っていなければ、足りない情報を自然な質問形式で返してください。
// - 一度聞いた内容が明らかなら繰り返さないでください。

// 【出力形式】
// 以下の形式で必ずJSONとして出力してください：

// \`\`\`json
// {
//   "intent": "予約希望",
//   "date": "2025/05/20",
//   "time": "",
//   "people": "",
//   "reply": "ありがとうございます！ご希望の時間と人数を教えていただけますか？"
// }
// \`\`\`

// 【intent 一覧（必ずどれか1つ）】
// - 予約希望
// - 予約確定
// - 予約変更
// - キャンセル依頼
// - その他

// ※replyはLINEで返信する自然なメッセージを記述してください。
// ※日付・時間・人数がユーザー発言に含まれていなければ、replyで自然に聞いてください。
//   `.trim()
// };
// debugLog('🧠 送信メッセージ: ' + JSON.stringify(messages));


//   // ==== 会話履歴を取得・更新 ====
//   const history = getUserChatHistory(userId);
//   debugLog('👣 現在の履歴: ' + JSON.stringify(history));
//   updateUserChatHistory(userId, 'user', promptText);

//   const messages = [systemPrompt, ...history];

//   const payload = {
//     model: 'gpt-4o',
//     messages,
//     temperature: 0.2
//   };

//   const options = {
//     method: 'post',
//     contentType: 'application/json',
//     headers: { Authorization: 'Bearer ' + apiKey },
//     payload: JSON.stringify(payload)
//   };

//   try {
//     const response = UrlFetchApp.fetch(url, options);
//     const result = JSON.parse(response.getContentText());

//     debugLog('GPT応答: ' + JSON.stringify(result));

//     const replyText = result.choices[0].message.content;
//     debugLog('GPT抽出文: ' + replyText);

//     // Assistantの応答を履歴に追加
//     updateUserChatHistory(userId, 'assistant', replyText);

//     let extracted;
//     try {
//       extracted = JSON.parse(replyText);
//     } catch (e) {
//       debugLog('❌ JSONパース失敗。フォールバック開始');
//       extracted = { intent: 'その他', date: '', time: '', people: '', reply: 'すみません、うまく理解できませんでした。もう一度お願いします。' };
//     }

//     debugLog("✅ 抽出結果: " + JSON.stringify(extracted));
//     if (['予約希望', '予約変更', '予約確定', 'キャンセル依頼'].includes(extracted.intent)) {
//       extracted = normalizeDateTime(extracted);
//     }

//     return extracted;

//   } catch (err) {
//     debugLog('❌ callChatGPT エラー: ' + err);
//     return {
//       intent: 'その他',
//       date: '',
//       time: '',
//       people: '',
//       reply: 'エラーが発生しました。もう一度お試しください。'
//     };
//   }
// }



// // ＝＝＝＝＝ 名前入力補助関数 ＝＝＝＝＝
// function getPendingNameRequest(userId) {
//   const raw = PropertiesService.getUserProperties().getProperty(`PENDING_${userId}`);
//   return raw ? JSON.parse(raw) : null;
// }

// function savePendingNameRequest(userId, data) {
//   PropertiesService.getUserProperties().setProperty(`PENDING_${userId}`, JSON.stringify(data));
// }

// function clearUserChatHistory(userId) {
//   const prop = PropertiesService.getUserProperties();
//   prop.deleteProperty(`CHAT_HISTORY_${userId}`);
// }



// // ＝＝＝＝ 本体 ＝＝＝＝＝
// function doPost(e) {
//   // すぐに200 OK を返す（これが一番重要）
//   const response = ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);

//   // 処理は非同期的に進める（GASでは実際は非同期じゃないが擬似的に分離）
//   // メイン処理は後ろに書く（async関数ではないので擬似的にやる）
//   doPostHandler(e); // メイン処理を別関数にすることでreturnの影響を避ける

//   return response;
// }


// // // ＝＝＝＝ 本体エントリーポイント ＝＝＝＝
// // function doPost(e) {
// //   // すぐにHTTP 200を返してLINEの再送信を防ぐ（これが最重要）
// //   const response = ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);

// //   // 処理本体を擬似的に非同期的に実行（実際には同期）
// //   doPostHandler(e);

// //   return response;
// // }


// // // ＝＝＝＝ メイン処理本体 ＝＝＝＝
// // function doPostHandler(e) {
// //   try {
// //     const json = JSON.parse(e.postData.contents);
// //     debugLog('受信データ: ' + JSON.stringify(json));

// //     // ✅ Redeliveryはスキップしつつ、必ずOKを返す
// //     if (json.events?.[0]?.deliveryContext?.isRedelivery) {
// //       debugLog('🚫 Redeliveryイベントのためスキップ');
// //       return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
// //     }

// //     debugLog('🚀 doPost START');

// //     const replyToken = json.events?.[0]?.replyToken;
// //     const userMessage = json.events?.[0]?.message?.text;
// //     const userId = json.events?.[0]?.source?.userId;

// //     if (!replyToken || !userMessage || !userId) {
// //       debugLog('❌ Invalid event structure');
// //       return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
// //     }

// //     // 🧠 名前入力中のユーザーか確認
// //     const pending = getPendingNameRequest(userId);

// //     // ① 名前入力フェーズ
// //     if (pending && !pending.name && /^[ぁ-んァ-ン一-龥a-zA-Z\s]{1,20}$/.test(userMessage.trim())) {
// //       pending.name = userMessage.trim();
// //       savePendingNameRequest(userId, pending);
// //       sendLineReply(replyToken, `ありがとうございます！\n続けてお電話番号を教えていただけますか？（ハイフンなし）`);
// //       return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
// //     }

// //     // ② 電話番号入力フェーズ
// //     if (pending && pending.name && !pending.tel && /^\d{10,11}$/.test(userMessage.trim())) {
// //       pending.tel = userMessage.trim();
// //       recordReservationToLogSheet(
// //         pending.date,
// //         pending.time,
// //         pending.people,
// //         pending.seatLabel,
// //         pending.name,
// //         pending.tel,
// //         userId
// //       );
// //       clearPendingNameRequest(userId);
// //       clearUserChatHistory(userId); 
// //       sendLineReply(replyToken, `ありがとうございます！\n${pending.date} ${pending.time} に ${pending.people}名様でご予約を承りました。`);
// //       return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
// //     }


// //     const extracted = callChatGPT(userMessage, userId);
// //     sendLineReply(replyToken, extracted.reply); // ← これでreplyが自然に送られる

// //     debugLog(`🧠 意図と内容抽出: ${JSON.stringify(extracted)}`);
// //     const { intent, date, time, people } = extracted;
// //     if (intent === '予約希望' && (!date || !time || !people)) {
// //     sendLineReply(replyToken, reply); // ← ここで自然な質問を返信
// //     return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
// // }
    

// //     // ==== intentに応じた処理分岐 ====
// //     if (intent === '予約確定') {
// //       const pending = getPendingNameRequest(userId);
// //       if (pending) {
// //         recordReservationToLogSheet(
// //           pending.date,
// //           pending.time,
// //           pending.people,
// //           pending.seatLabel,
// //           pending.name || '', // 名前が未入力の場合の保険
// //           pending.tel || '',
// //           userId
// //         );
// //         clearPendingNameRequest(userId);
// //         clearUserChatHistory(userId); 
// //         sendLineReply(replyToken, `ありがとうございます！\n${pending.date} ${pending.time} に ${pending.people}名様でご予約を承りました。`);
// //         return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
// //       }

// //       if (!date || !time || !people || isNaN(people)) {
// //         sendLineReply(replyToken, "予約内容が不明瞭です。日付・時間・人数を再度ご連絡ください。");
// //         return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
// //       }

// //       const result = reserveSeat(date, time, people);
// //       if (result.success) {
// //         savePendingNameRequest(userId, { date, time, people, seatLabel: result.seat,name:'',tel:'' });
// //         sendLineReply(replyToken, `✅ 仮予約が完了しました！\n最後にお名前を教えていただけますか？（10文字以内でOKです）`);
// //       } else {
// //         sendLineReply(replyToken, `申し訳ありません、その時間はすでに満席です。\n別の日時をご希望ですか？`);
// //       }
// //       return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
// //     }

// //     if (intent === '予約希望') {
// //       if (!date || !time || !people || isNaN(people)) {
// //         sendLineReply(replyToken, "ありがとうございます！ご希望の【日付・時間・人数】を教えてください。");
// //         return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
// //       }

// //       const available = checkSeatAvailability(date, time, people);
// //       const msg = available
// //         ? `${date} ${time} に ${people}名様でご予約可能です。\nご予約を確定しますか？（例：「OK」「お願い」など）`
// //         : `申し訳ありません。\n${date} ${time} は満席です。\n別の時間をご希望ですか？`;

// //       sendLineReply(replyToken, msg);
// //       return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
// //     }

// //     if (intent === '予約変更') {
// //       sendLineReply(replyToken, "ご予約の変更ですね。変更前の内容か、新しい日時をご連絡ください。");
// //       return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
// //     }

// //     if (intent === 'キャンセル依頼') {
// //       if (!date || !time || !people || isNaN(people)) {
// //         sendLineReply(replyToken, "キャンセルしたい予約の【日付・時間・人数】を教えてください。");
// //         return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
// //       }

// //       const cancelled = cancelReservation(date, time, people);
// //       const msg = cancelled
// //         ? `キャンセルを承りました。\n${date} ${time} のご予約は取り消されました。`
// //         : `ご指定の予約は見つかりませんでした。\n内容をご確認のうえ、再度お知らせください。`;
// //       if (cancelled) {
// //         clearUserChatHistory(userId); // ← ここに追加！
// //       }
// //       sendLineReply(replyToken, msg);
// //       return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
// //     }

// //     // その他のメッセージ
// //     const replyText = extracted.reply || "ありがとうございます！メッセージを受け取りました。";
// //     sendLineReply(replyToken, replyText);
// //     return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);

// //   } catch (err) {
// //     debugLog('❌ doPostHandler エラー: ' + err);
// //     return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
// //   }
// // }
