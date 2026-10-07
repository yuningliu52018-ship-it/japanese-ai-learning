# 每課逐頁規格

`pagePresentation` 是課程資料與逐頁導覽之間的固定契約。所有公開課程（`catalog.listed: true`）都必須提供；只有被其他課程引用的教材片段可以省略。`npm run courses:check` 會檢查這項規則。

## 固定結構

```json
{
  "pagePresentation": {
    "status": "partial",
    "rememberPage": true,
    "verifiedPages": ["86"],
    "pages": [
      {
        "key": "86",
        "chapterId": "vocabulary",
        "label": "86 頁｜單語 1–41",
        "assignments": [
          {
            "sectionId": "vocabulary-sentence-cards",
            "itemIds": ["01", "02"]
          }
        ]
      }
    ],
    "pendingRanges": [
      { "chapterId": "grammar", "pages": "90–95" }
    ]
  }
}
```

- `status`：整課核對與分頁完成用 `complete`；仍有待補頁面用 `partial`。`complete` 會要求所有 section／item 都已指派，且不得留下 `pendingRanges`。
- `rememberPage`：可省略；預設為 `true`，會在同一裝置記住這一課最後閱讀的頁面。設為 `false` 可停用。
- `verifiedPages`：已核對的導覽項目 key，必須與 `pages[].key` 完全一致。它只代表分頁定位核對，不代表原文或答案已逐題核對。公開課程僅使用連續課本頁碼：第4課86–111、第5課112–135、第6課136–164。解答本與補充內容不可新增獨立翻頁項目。
- `pageRange: [start, end]`：各課必填的課本起訖頁。所有公開課程的頁碼檢查從此資料讀取，不維護程式內的課次白名單。上列三課範圍是現有資料，不是新課限制。
- `pages`：依章節與課本頁序排列；共用翻頁器會保留同一章內的資料順序，每個 `key` 不可重複。
- `chapterId`：必須對應 `chapters[].id`。
- `assignments`：指定該頁顯示的內容區塊。省略 `itemIds` 代表整個區塊；有 `itemIds` 則只顯示指定卡片。
- `pendingRanges`：尚未逐頁核對的範圍，僅供 `partial` 課程標示；同一章只能有一筆，多段範圍請合併寫在同一個 `pages` 字串。

## sectionId 規則

內容區塊在畫面上的穩定 ID 為「章節 ID + 區塊 ID」。例如資料中的區塊 `id: "page109-audio"` 位於 `questions` 章時，引用值是 `questions-page109-audio`。自動產生的單語區塊固定使用 `vocabulary-sentence-cards`。

每個需要分頁的卡片都應有穩定且唯一的 `id`。不要依標題或陣列位置引用卡片。

## 維護順序

1. 先把教材內容放入正確的 `chapter` 與 section。
2. 為 section 和需要拆頁的 item 設定穩定 `id`。
3. 依頁碼更新 `pages`、`verifiedPages` 與 `pendingRanges`。
4. 執行 `npm run release:check`（包括 `courses:check`、播放回歸與上課規格檢查）。
5. 在桌面與手機寬度逐頁檢查上一頁／下一頁及導覽位置。

驗證會攔截重複頁碼、錯誤章節、找不到的 section/item，以及同一內容被重複或以整段與部分兩種方式混合指派。完成狀態也會攔截未分頁內容與缺少穩定 `id` 的卡片。

## 上課用有聲教材規格 v1

公開課程設定 `classroomSpecVersion: 1`。共用 `lesson-classroom-core.js` 負責定位及狀態，`lesson-classroom.js` 在既有渲染器和翻頁器完成後加上介面，不改首頁圖片、不建立第二套網站。

呈現順序：共用課次／課本頁導覽 → 課本原順序的題號與原文（ruby讀音，播放鍵在句旁）→ 中文 → 印刷對話回應 → 原題下方「看答案」→ 收合的逐題來源。待核對／示範／教師確認／提供解答已核對標籤保持可見。填空保留空格，完成句和譯文放入答案內，不提前洩漏答案。第6課152頁只是回歸驗收案例，所有頁碼使用相同版型，禁止永久頁码或課次特例。

每個 item 保留穩定 `id` 供資料檢查。上課定位僅提供課次、課本頁碼、上一頁／下一頁及上次閱讀頁，進頁後按課本順序閱讀。原有 `#page-N` 與 section 網址保留；舊 `#item-課次-sectionId-itemId` 改為對應課本頁的相容別名，不跳至題目／答案，不自動展開答案。題號、CD、關鍵字搜尋不再作為課堂介面。

`classroom` 包含 `kind`（text/question）、`textbookPage`、`lineNumber` 或 `questionNumber`、`cd`、`textSource`；題目可用 `answerIds` 指向同區塊答案。`originalRuby` 用於保留填空原題。既有教材尚缺讀音或中文者列為檢查警告，不以自動生成文字假冒課本。

跨區塊的逐題答案使用 `answerRefs: [{ sectionId, itemId }]`，必須指向同一課本頁的答案項目。畫面將原答案卡移入該題下方的「看答案」展開區，不複製內容，不由網址自動展開。印刷的教師回應仍逐句列在原題之後，不當成學生答案。播放及展開不改頁碼網址或觸發教材重新定位。

`responseIds` 指向同區塊、同課本頁的印刷回應。`readingGroups` 是可選例句資料分組（不是新版型）：`{ id, kind: "example", itemIds }`；所有 item 必須存在且位於同一課本頁。每個答案／回應／分組成員只歸屬一題／一組，禁止循環或自我引用。不建立舊摘句分組或巢狀補充版型。

原文與讀音另設 `classroom.textReview`、`classroom.readingReview`，不得用答案狀態代替全文核對。`photo-verified` 需逐項來源與核對紀錄；`pending` 表示尚未複核。不再使用舊摘句的 `excerpt-verified` 狀態。讀音 `partial` 明示未獲照片完整注音支持的數字／時刻等，保留教學讀音但不聲稱全句已核對。

### 冗餘清理規則（所有課程及新課模板）

- 本頁已核對完整原句涵蓋舊摘句時，刪除舊 item 及其分組、引用，不以隱藏代替清理。不要把課本原有的重複對話回應、題目和答案當成冗餘。
- 只有來源證明不屬於本頁才移除無關內容；沒有證據或只有文字相似時，保留待核對並列出具體缺件，不猜測移頁或刪除。
- 保留完整原文的讀音、中文、播放、原題及答案来源。清理前後比較所有非補充記錄及題答引用，避免缺題；課本頁序不變。
- 舊摘句專用呈現／建立資料分支移除；共享來源收合、播放程式、樣式、照片、音檔只要仍有使用就保留。舊含課本頁碼的 item 網址仍退回該課本頁，不開答案。
- 新課依 templates/lesson-data.json 填入完整教材與來源，不複製舊摘句；共用檢查依目錄涵蓋新增課程，拒絕舊摘句標籤及被本頁已核對完整原句涵蓋的補充記錄。未核對內容不能為通過檢查冒稱已核對。

可選 `classroomTeaching.completedPages` 記錄已上課頁，`nextRange: null` 表示下次範圍尚未公布，不增加定位介面。課本頁序與核對進度表沿用 `pagePresentation` 和 `pageRange`；來源照片存在不等於原文核對完成，答案待核對0筆也不等於全頁完成。

`answerEvidence` 包含 `status`、`sources`、`review`。sources 各自包含 `kind`（textbook/answer-book/teacher-record）、`page`、`href`、`locator`；課本頁和解答本頁分開儲存。review 記錄 `by`、`date`、`method`。

- `provided-verified`：提供解答已核對，必須有逐題解答本來源及核對記錄。
- `teacher-confirmed`：教師確認，必須有教師確認紀錄，AI核對不能算教師確認。
- `suggested`：示範答案，不是官方標準答案。
- `pending`：待核對；缺來源、只有整頁推定或尚未逐題重查者使用此狀態。

答案入口集中於各題，不把解答本頁加入翻頁。來源照片可單獨開啟查看。既有 `answerType: verified` 不足以顯示「已核對」。

原音標示 CD 原音（整段）；單句播放標示 AI 合成朗讀。共用慢速、重播、停止；開始任一來源前停止其他來源，切頁及離開頁面停音。未核對原音時間軸時，不宣稱精確逐題原音播放。

電話等需明確逐位發音時，可用資料欄位 `speechReading` 提供日文讀法，共用播放器優先使用；不得改動 `jpPlain/jpRuby` 的教材原文。使用者試聽確認記在 `readingReview.status: user-confirmed` 與 userConfirmation，顯示「使用者試聽已確認（非教師確認）」；不得冒充教師確認或照片完整注音。改過讀法的卡片需重新試聽。

中文說明不得進入日文 AI 朗讀。混排資料分開顯示日文與中文；文法例句用 `fromLang/toLang`、題幹與選項用 `questionLanguage/optionsLanguage` 標明中文邊界，共用渲染／播放程式排除中文。只有中文定位說明而缺日文原題時，不提供該說明的日文播放、不用機器翻譯補成課本原句；維持待核對。隱藏的歷史筆記若仍含混排內容，不得直接重新啟用，先拆分語言並核對来源。答案來源已存在不等於已找到對應原題；未配對者明示原題未配對，禁止按句意自動建立題答引用。

發布工作流程先執行 `release:check`。錯誤阻止發布；待核對／讀音缺漏警告仍須人工列入驗收與補件清單。新課無須修改檢查課次名單：`courses:check` 掃描 lessons 資料目錄並核對課程目錄，`classroom:check` 讀取 data/lessons.json 檢查每課。已核對文字的 ruby／播放原文不符為錯誤，尚待核對的舊內容逐筆警告，不為通過檢查竄改原文。解答來源檔案存在及引用結構通過，不等於人工核對內容已完成。

## 課文逐句收錄規則

- 依課本照片的原文順序列出課文與對話，標示說話者，不將選句或摘要當成完整課文。
- 每句獨立提供日文、讀音、播放及中文翻譯；同一段中的多句不可合併成一張卡片。
- 題目指示與圖中可讀的文字資訊也須保留，與對話分別標示。
- 原課本聽力填空保留編號及空格；未核對的答案不得補進原文。
- 完成分頁不代表已完成逐句核對，必須另行對照照片確認文字完整性。

## 共用程式載入

公開課程頁面統一載入 `js/lesson.js` 與 `js/lesson-pages.js`。頁序、拆頁與補充教材位置只改各課 `data.json` 的 `pagePresentation`；不要再建立 `lesson-k4-pages.js` 這類每課專屬翻頁程式。

所有公開課程另載入相同 `js/lesson-classroom-core.js`、`js/lesson-classroom.js` 與 `css/lesson-classroom.css`。不得在共用程式加入特定課次／頁碼的顯示分支；不得複製播放器。`lesson.js` 管理 AI 朗讀，原音與 AI 互斥及切頁停音由共用生命週期處理。

基底樣式統一為 `css/lesson-base.css`（搭配共用 lesson-watercolor／lesson-book／lesson-pages／lesson-classroom 樣式），各課 HTML 使用 `lesson-shared`。舊課次專用 CSS／JS 可留作未載入的歷史檔，但公開頁不得引用。單語資料須有明確穩定 `id`；渲染器仍相容舊編號，不再覆寫已有 ID。`classroom.examplesRole: "answer"` 指定原有 examples 陣列是該題答案，直接以「看答案」展開，不混入來源／補充。

## 新課製作模板與验收清單

資料模板：`templates/lesson-data.json`，預設未公開且待核對，示例文字不是教材，發布前逐項替換。將 `templates/lesson-index.html` 存入新 lessons/課程目錄/index.html，資料存為同目錄 data.json，只替換課名／資料內容，不複製 lesson.js／分頁／播放器。新課頁加入 `data/lessons.json` 由 `npm run courses:index` 產生；先確認圖片沿用既有首頁圖片系統。

1. 填寫唯一課次 ID、課名、`pageRange`、chapters；所有課本頁依序列入 `pagePresentation`，解答本不得成為課本頁。
2. 原題、指示、對話與圖中文字依照片順序錄入，逐句補讀音／中文／播放原文；設定穩定 section/item ID。不得以陣列位置當永久 ID，不刪改既有有效網址。
3. 每卡提供 `classroom.kind/textbookPage`。來源未齊用 pending；逐句核對填 `textSource` 與 review；未獲完整讀音依據用 partial。旧內容的缺件與文本差異列入報告。
4. 答案填 `answerEvidence`（來源本別、頁碼、檔案、逐題 locator、by/date/method），以 `answerIds/answerRefs` 對應原題，回應用 `responseIds`；不得讓多題搶同一卡或循環引用。
5. 音檔填教材資料，標明 CD 原音／AI。無時間軸證據只提供整段原音，不標成逐題原音。
6. 新題型先擴充共用元件及資料契約，新增回歸案例，再測所有既有課；不得以新課專屬 JS 解決。
7. 執行 `npm run courses:index`、`npm run release:check`、`git diff --check`。檢查課次／頁序、穩定 ID、題答／回應／分組同頁關係、來源存在、必要欄位、核對紀錄、讀音與播放文本，誠實保留待核對警告。
8. 在側邊預覽寬度及390px驗收：頁碼直達一次、課次切換、上一／下一、上次閱讀、返回；依原順序讀題→看答案→播放→收合→下一題。答案不跳區、播放不重新定位、無水平溢出；鍵盤也可展開收合。
9. 回歸第4／5課的單語、對話、練習、答案及第6課152頁；連點播放、慢速／停止、原音互斥、切頁停音。驗收報告區分程式狀態與實際聽音，未聽音或缺教師證據明列，人工審核警告後才可發布。

本規格為現行製作依據；docs 中帶日期的驗收及樣板報告是歷史紀錄，不可覆蓋本規格。
