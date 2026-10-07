# 教材冗餘清理驗收（2026-10-07）

後續補件：第5課131頁原圖已收到，中文題幹／日文播放問題已修正，7題原文與解答本113頁逐題核對。下方為清理當時紀錄，131頁缺件不再適用；其餘未核對項目不因此宣稱完成。見 k5-p131-source-review-2026-10-07.md。

僅本機修改；未 commit、push 或部署。延續既有共用教材程式及 lesson-page-spec.md。

## 實際刪除

| 課本頁／原項目 | 刪除理由／保留原句 |
| --- | --- |
| 第6課140／sentence-cards-page-140/item-001 | 摘句「わたしは同じ会社で一生働くつもりはありません。」已包含於保留 item-007 完整回答 |
| 第6課141／sentence-cards-page-141/item-001 | 摘句「行くつもりでしたが、ちょっと用事ができて……。」已包含於保留 item-004 完整回答 |
| 第6課152／sentence-cards-page-152/item-002 | 夏休日期請求摘句已包含於保留 item-007 完整原句，原句含機票原因 |
| 第6課152／sentence-cards-page-152/item-001 | 「日程１週間延長」未見於152.jpeg；重新看照片，原題為出張予定１週間延期，原題及解答未修改 |

另刪除152頁 old-excerpts 分組、4頁提示中的舊補充說明；非隱藏，JSON原資料已移除。可從原版本及清理清單追溯，不另存網站可載入的摘句備份。

## 共用程式／資料

- js/lesson-classroom.js：移除舊摘句核對顯示、supplement 分組及父分組分支；例句分組、逐題來源收合繼續共用。
- js/lesson-pages.js 及 lesson-classroom.js：原含課本頁碼的 item 網址仍導向該頁，刪除卡片後不會回到錯页／自動開答案。
- scripts/review-k6-priority.mjs：移除建立舊摘句標籤及核對狀態的分支、排序引用，避免重建舊資料。
- scripts/classroom-validation.mjs、classroom-check.mjs：目錄發現所有課程；拒絕舊摘句區塊與本頁完整核對原句涵蓋的補充資料。新課模板亦有負向測試。
- templates/lesson-data.json、docs/lesson-page-spec.md：整合相同清理規則；沒有另建版型。
- scripts/clean-reviewed-excerpts.mjs：一次性有證據清理工具，不由網頁引用；刪除前檢查完整原句包含摘句，逐筆比對999筆非補充資料完全不變，可重跑不重複刪除。
- 第4、5課教材JSON本次未更改；第6課僅刪除上述4筆及分組／提示。課本頁序79頁不變，首頁圖片不動。
- 沒有刪除共用CSS、照片或音檔：reading-metadata仍用於原題來源，reading-example仍用於完整例句；沒有僅服務舊摘句的獨立樣式資產。

## 驗收

- release:check：0錯誤／49提醒；5份資料，3公開課程、79課本頁、999穩定項目；來源與音檔路徑、題答映射、頁碼／穩定ID與範本負向檢查通過。
- 清理前後保護比對：第4課260、第5課280、第6課459非補充記錄逐筆相同（原文、讀音、中文、音訊、答案來源及題答引用均未修改）。「無缺題」指未因清理減少任何原題，非宣稱所有原始收錄已完整核對。
- 第6課140、141：無舊摘句；每頁兩題仍存在；已刪140 item網址導回140頁。
- 第6課152：606px及390px，原題／回應／答案仍在一起，開合與連點播放保持頁碼，連點播放在控制已可見時捲動位置不變；切153頁狀態為已停止播放，音訊停止。自動化點擊首次會把離屏控制帶入視野，未將其誤當成教材自動定位。
- 第4課86／98／100／110、第5課112／124／125／131：390px回歸單語／對話／練習／答案；播放控制可啟動、答案可開合、無橫向溢出或舊摘句標籤。瀏覽器未記錄JS錯誤。
- 播放器自動測試涵蓋分段、重複點擊／session concurrency、停止與頁面離開清理；未逐一真人聽完所有音檔。第5課131中文題幹問題另列，不宣稱所有日文播放內容正確。
- 本機預覽停留第6課140頁；窄版截圖 cleanup-k6-140-390.png。

## 有疑義／缺件，保留不猜刪

- 第5課原始 sections 中仍有7組12筆未顯示文法筆記（指示詞、んじゃない、たところ、ようとする、のだろうか、助詞＋の、だろう）。它們無逐筆完整來源／穩定映射，包含例句及說明；需對照114–121及135頁原文和現有補充的逐項涵蓋關係才能決定刪除或保留，不能只因 hideLegacySections 判定全部冗餘。本次沒有新增隱藏行為，也沒有刪除共用 hideLegacySections 支援。
- 第5課131／reading-p131-reading-questions/item-001至006：僅中文題幹，AI播放亦讀中文但按鈕標成播放日文。需依131頁原圖逐題補原日文與讀音；不是這次清理新增的錯誤，未猜補。
- 第5課6、第6課61筆獨立答案尚缺原題映射，不刪、不猜配對。
- 第4課42筆ruby／播放原文差異與67筆缺讀音需逐題查來源；第6課12筆數字／時刻完整讀音待教師確認。
- 實體手機、Safari、所有頁面真人音訊品質及全部教材逐句真實性未重新驗證。

## 當前自動檢查提醒

- lessons\k4-伝言お願いできますか\data.json: grammar-unit1/u1-2 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: grammar-unit1/u1-6 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: grammar-unit2/u2-1 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: grammar-unit2/u2-2 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: grammar-unit2/u2-3 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: grammar-unit3/u3-1 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: grammar-unit3/u3-2 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: grammar-unit3/u3-3 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: speaking-page100-practice-1/p100-example ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: speaking-page100-practice-1/p100-q1 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: speaking-page100-practice-1/p100-q2 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: speaking-page101-practice-2/p101-example ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: speaking-page101-practice-2/p101-q1 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: speaking-page101-practice-2/p101-q2 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: speaking-page102-reference-dialogue/business-7 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: speaking-page103-challenge/p103-q1 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: speaking-page103-challenge/p103-q2 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: reading-page104-think/p104-reading-focus ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: reading-page104-think/p104-q1 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: reading-page104-think/p104-q2 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: reading-page107-questions/p107-q1 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: reading-page107-questions/p107-q2 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: reading-page107-questions/p107-q3 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: reading-page107-questions/p107-q4 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: reading-page108-challenge/p108-q1 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: reading-page108-challenge/p108-q2 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page109-exercises/p109-cd17-memo1 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page109-exercises/p109-cd17-memo2 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page109-exercises/p109-q3-example ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page109-exercises/p109-q3-1 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page109-exercises/p109-q3-2 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page109-exercises/p109-q3-3 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page110-exercises/p110-q3-4 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page110-exercises/p110-q3-5 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page110-exercises/p110-q4 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page110-exercises/p110-q5 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page110-exercises/p110-q6-example ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page110-exercises/p110-q6-1 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page110-exercises/p110-q6-2 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page111-exercises/p111-q7 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page111-exercises/p111-q8 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: questions-page111-exercises/p111-q9 ruby與播放原文不一致（待核對舊內容，未更改文字）
- lessons\k4-伝言お願いできますか\data.json: 69筆答案待逐題复核（不得標示已核對）
- lessons\k4-伝言お願いできますか\data.json: 既有內容缺讀音 67筆、缺中文 0筆；樣板之外尚待補齊
- lessons\k5-どう行ったらいいでしょうか\data.json: 6項獨立答案尚缺原題引用：122/speaking-p122-expression-matching/item-001, 124/speaking-p124-listening-blanks/item-001, 124/speaking-p124-listening-blanks/item-002, 124/speaking-p124-listening-blanks/item-003, 124/speaking-p124-listening-blanks/item-004, 124/speaking-p124-listening-blanks/item-005；保留但不宣稱逐題閱讀已完成
- lessons\k5-どう行ったらいいでしょうか\data.json: 76筆答案待逐題复核（不得標示已核對）
- lessons\k6-行かせていただきたいんですが\data.json: 61項獨立答案尚缺原題引用：138/grammar-answer-key-page-138/item-001, 138/grammar-answer-key-page-138/item-002, 138/grammar-answer-key-page-138/item-003, 138/grammar-answer-key-page-138/item-004, 138/grammar-answer-key-page-138/item-005, 138/grammar-answer-key-page-138/item-006, 138/grammar-answer-key-page-138/item-007, 138/grammar-answer-key-page-138/item-008, 142/grammar-answer-key-page-142/item-001, 142/grammar-answer-key-page-142/item-002, 142/grammar-answer-key-page-142/item-003, 143/grammar-answer-key-page-143/item-001, 143/grammar-answer-key-page-143/item-002, 143/grammar-answer-key-page-143/item-003, 143/grammar-answer-key-page-143/item-004, 144/grammar-answer-key-page-144/item-001, 144/grammar-answer-key-page-144/item-002, 145/grammar-answer-key-page-145/item-001, 145/grammar-answer-key-page-145/item-002, 145/grammar-answer-key-page-145/item-003, 146/grammar-answer-key-page-146/item-001, 146/grammar-answer-key-page-146/item-002, 146/grammar-answer-key-page-146/item-003, 147/grammar-answer-key-page-147/item-001, 147/grammar-answer-key-page-147/item-002, 147/grammar-answer-key-page-147/item-003, 147/grammar-answer-key-page-147/item-004, 148/speaking-answer-key-page-148/item-001, 148/speaking-answer-key-page-148/item-002, 154/speaking-answer-key-page-154/item-001, 155/speaking-answer-key-page-155/item-001, 157/reading-answer-key-page-157/item-001, 159/reading-answer-key-page-159/item-001, 159/reading-answer-key-page-159/item-002, 159/reading-answer-key-page-159/item-003, 159/reading-answer-key-page-159/item-004, 159/reading-answer-key-page-159/item-005, 159/reading-answer-key-page-159/item-006, 159/reading-answer-key-page-159/item-007, 159/reading-answer-key-page-159/item-008, 159/reading-answer-key-page-159/item-009, 159/reading-answer-key-page-159/item-010, 159/reading-answer-key-page-159/item-011, 160/reading-answer-key-page-160/item-001, 160/reading-answer-key-page-160/item-002, 162/questions-answer-key-page-162/item-001, 162/questions-answer-key-page-162/item-002, 162/questions-answer-key-page-162/item-003, 162/questions-answer-key-page-162/item-004, 163/questions-answer-key-page-163/item-001, 163/questions-answer-key-page-163/item-002, 163/questions-answer-key-page-163/item-003, 163/questions-answer-key-page-163/item-004, 163/questions-answer-key-page-163/item-005, 163/questions-answer-key-page-163/item-006, 164/questions-answer-key-page-164/item-001, 164/questions-answer-key-page-164/item-002, 164/questions-answer-key-page-164/item-003, 164/questions-answer-key-page-164/item-004, 164/questions-answer-key-page-164/item-005, 164/questions-answer-key-page-164/item-006；保留但不宣稱逐題閱讀已完成
- lessons\k6-行かせていただきたいんですが\data.json: 59筆答案待逐題复核（不得標示已核對）
- lessons\k6-行かせていただきたいんですが\data.json: 優先上課範圍 12項數字／時刻完整讀音待教師確認（不冒充照片注音）
