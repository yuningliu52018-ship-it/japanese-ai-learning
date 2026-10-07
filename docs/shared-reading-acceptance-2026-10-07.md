# 共用閱讀版型本機驗收（現行）

日期：2026-10-07。僅本機，未 commit、push、部署。製作規則以 [lesson-page-spec.md](lesson-page-spec.md) 為準；本文件為結果，不另立資料規格。

## 修改清單

- 共用版面：js/lesson-classroom.js、css/lesson-classroom.css；移除永久152頁分支，讀取readingGroups資料。來源收合，答案狀態仍可見；原題、回應及答案同組，展開／收合保留題目位置。
- 共用基底：css/lesson-base.css；三課 HTML 改載入同一組基底及共用版面／分頁／播放器。舊 lesson-k5-base.css、lesson-k6-pages.js 未刪除，但公開課程不載入。
- 渲染與分頁：js/lesson.js、js/lesson-pages.js；答案例句／情境回應原題內展開、單語明確ID優先、舊item網址只對應課本頁。返回不重複定位；改捲教材起點而非固定導覽位置。
- 共用資料契約：js/lesson-classroom-core.js、scripts/classroom-validation.mjs、scripts/classroom-check.mjs、scripts/course-tools.mjs。課程目錄自動覆蓋所有公開課程；頁碼範圍從資料讀取，增加同頁答案／回應／分組、穩定ID、來源與必要欄位檢查及新課負向案例。
- scripts/normalize-classroom-metadata.mjs 是一次性、可重跑的舊資料機械遷移，不是每課播放器或翻頁器。
- 新課範本：templates/lesson-data.json、templates/lesson-index.html；製作及驗收清單已整合既有規格。新課仍須填寫真實教材及證據，模板文字不可發布。

## 本次各課資料差異（原文及答案未修改）

| 課次 | 資料變更 |
| --- | --- |
| 4 | pageRange86–111；260項補明確頁码／類型與待核對欄位；80單語固定舊編號ID；原有答案例句用examplesRole定位原題下方。 |
| 5 | pageRange112–135；280項補頁碼／類型與待核對欄位；66單語固定ID；保留舊來源與原文；答案例句角色改存資料。 |
| 6 | 沿用136–164；4舊卡補頁碼／待核對資料；78單語固定ID；52區塊補明確ID（保留原穩定網址）；152例題／舊摘句分組改存資料，不改答案。 |

未修改首頁index.html或首頁圖片。各課原有有效page／section／item網址保留，item別名僅到課本頁，不展開答案。完整工作區含前幾輪尚未提交的教材更新，上表僅本輪結構改動。

## 驗收結果

npm run release:check：0錯誤、50提醒。courses:check掃描5份資料（含2未公開片段）；公開目錄3課共79課本頁、1003穩定項目。新課k7模板通過同一契約；缺ID、重複ID、缺頁碼、錯答案、循環回應、虛假已核對、缺來源等負向案例均被攔截。git diff --check通過（僅CRLF提示）。

| 瀏覽器代表頁 | 606px／390px結果 |
| --- | --- |
| K4單語86、對話98、練習100、答案110 | 播放網址不變、已定位按鈕播放後捲動差0；98/100/110原題內答案展開收合，題卡位置差0；無水平溢出。 |
| K5單語112、對話124、練習125、理解題131 | 播放位置差0、網址不變、無水平溢出；125/131答案同題展開收合位置差0。124仍是舊獨立聽力答案，未造假補原題關係。 |
| K6樣本152第2題 | 同題2段課長回應與4段答案；看答案→連點播放→收合→153頁→返回152頁成功；樣本只是資料，不含課次／頁碼程式特例。 |
| 共用播放器 | 原音Space控制開始播放，AI開始後原音paused；原音開始會停止AI會話；共用慢速0.82實測native playbackRate0.82、停止後全部paused，切頁狀態已停止播放。 |
| 定位與相容 | 課次切換／教材頁選擇／上一下一／上次閱讀保留；額外題號／CD／關鍵字介面為0；舊item網址不自動看答案。 |

瀏覽器測試工具會先把目標控制捲到畫面中心，因此播放位移比較是在控制已定位後開始量測，不能把工具的前置捲動當作播放器跳頁。真實手機觸控／Safari／不同設備的聲音輸出尚未實測。瀏覽器viewport設定390時回報innerWidth391，無水平溢出；完成後重設viewport。

## 尚未驗證／具體缺件

- 本輪為程式及閱讀動線驗收，不重新宣稱全部課本與解答已逐字核對。K4 69、K5 76、K6 59筆答案仍待逐題複核。
- K4 67項缺讀音，另42項舊顯示／播放原文有差異（部分涉及空欄朗讀）；保留原字，須逐項对照片／教師確認後再修。
- K5 6、K6 61項獨立答案尚缺明確原題引用，仍保留原內容與來源，不猜配對。頁码與卡片ID詳見下列自動清單。
- K6优先上課頁12項數字／時刻完整讀音待教師確認；152日程延長舊摘句1項仍缺該頁原句依據，與完整課本原文分開。
- CD原音時間軸未逐句核對；互斥及停音驗收使用程式／播放器狀態，未以人工聽音證明所有設備的聲音輸出。
- 79頁資料全檢，瀏覽器只操作上表代表頁；沒有宣稱全部頁面／全部題型逐題人工UI驗收完成。

### 自動缺件清單（本機檢查原樣，50條）

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
- lessons\k6-行かせていただきたいんですが\data.json: 1項舊補充／摘句尚無完整原句依據，已與課本原文分開標示
