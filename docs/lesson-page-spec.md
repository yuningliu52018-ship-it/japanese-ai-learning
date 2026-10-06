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
- `verifiedPages`：已核對的導覽項目 key，必須與 `pages[].key` 完全一致；未指定課本頁碼的補充項目也使用自己的穩定 key。
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
4. 執行 `npm run courses:check`。
5. 在桌面與手機寬度逐頁檢查上一頁／下一頁及導覽位置。

驗證會攔截重複頁碼、錯誤章節、找不到的 section/item，以及同一內容被重複或以整段與部分兩種方式混合指派。完成狀態也會攔截未分頁內容與缺少穩定 `id` 的卡片。

## 共用程式規則

公開課程頁面統一載入 `js/lesson.js` 與 `js/lesson-pages.js`。頁序、拆頁與補充教材位置只改各課 `data.json` 的 `pagePresentation`；不要再建立 `lesson-k4-pages.js` 這類每課專屬翻頁程式。
