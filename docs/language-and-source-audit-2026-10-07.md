# 朗讀語言／來源清單與发布風險（2026-10-07）

範圍：目錄中第4–6課，沿用共用程式；只做本機修改。未 commit、push、部署。此文件為當日驗收紀錄，製作規格以 lesson-page-spec.md 為準。

## 本次修正

- 第5課131頁沿用已對照照片的完整日文題目、讀音、中文及答案：日文按鈕只取 jpPlain／answerPlain，中文独立顯示。課本131頁與解答本113頁分開；沒有把中文翻成日文充當原題。
- 同類實際問題：115頁補充中4組中文情境、116頁7組中文翻譯、117頁1組中文教學提示，以及指示詞講義2組中文情境，以 fromLang/toLang 分語言顯示／播放。117頁純中文說明不設日文播放鍵。
- 133頁兩個中文聽力定位題幹不再送日文播放，缺教材原題照片仍明示待核對；134頁前三題只拆開既有日文例句與中文教學問句／選項，沒有翻譯補造，來源仍待核對。
- 分かれる的讀音是「わかれる」。124頁④原有「分：ぷん」改為「わ」，這是讀音錯字修正，不代表題答已配對或來源已逐題核對。
- 共用 js/lesson.js 排除文法 examples 中文及中文題幹／選項的整段日文播放；沒有增設每課播放器或查找功能。
- 沒有刪題、答案、照片或音檔。12筆舊筆記整筆重複尚不足證，沒有任意刪除。67筆獨立答案保留原文與來源，標示「原題未配對」，不自動建立 answerRefs。

## 第5課12筆舊文法筆記

都位於 data.json 的舊 sections，hideLegacySections=true，**目前不渲染，也不作日文播放來源**。下表「候選頁」依主題與現有頁序定位，除明列115頁的標題外，**不是經課本照片核對的頁碼歸屬**。12筆均無逐筆 textSource／照片／教師核對來源；儲存位置不是教材出處。不可直接重新啟用含中日混排的舊筆記。

| #／舊位置（0起算） | 標題／候選課本頁 | 重複狀態 | 實際用途／處置 |
| --- | --- | --- | --- |
| 1 sections[0].items[0] | あ～：雙方都知道或提過的對象／114 | 主題與114講義重疊，不是整筆完全相同 | 歷史速記；無現行UI用途，保留待核對 |
| 2 [0].[1] | 115頁｜そ～：承接對方剛說的內容／115 | 六組例句與現行そ～內容相關，混有中文；未證整筆重複 | 歷史雙語摘要，不可當完整教材；保留 |
| 3 [0].[2] | 115頁練習｜答案與選用理由／115 | そこで／その人／それ短答與練習重疊，理由另有內容 | 歷史教學理由；原題及理由來源未核對，保留 |
| 4 [1].[0] | 推測原因／116 | 與現行推測例句局部相似，未證全同 | 歷史短例，非現行題目；保留 |
| 5 [1].[1] | 較口語的建議／116 | 図書館／インターネット建議與現行會話局部重疊 | 歷史公式，未證整筆可刪；保留 |
| 6 [2].[0] | 位置說明／117 | コンビニ角→曲がったところに病院例句與現行講義重複；公式不同 | 確認局部重複，非整筆；沒有把唯一公式一起刪除 |
| 7 [2].[1] | 約定或動作地點／117 | 改札→出たところで待つ例句與現行講義重複；公式不同 | 確認局部重複，非整筆；保留待整筆來源核對 |
| 8 [3].[0] | 正要做某事時／118 | 主題重疊；兩個短例未證完整重複 | 歷史公式／短例；保留 |
| 9 [3].[1] | 嘗試或意願／118 | 主題重疊；未證整筆完全重複 | 歷史對比；保留 |
| 10 [4].[0] | 對事情提出疑問／119 | 地球／戦争主題相關，未證原頁／全同 | 歷史短例；保留 |
| 11 [5].[0] | 避免重複相同名詞／120 | 五組改寫，含前後完全相同的「日本での生活」；未證與現行資料全同 | 公式解釋「省略名詞」也待確認，不能當已核對教材；保留 |
| 12 [6].[0] | 說話者的推測／121 | 三個短例相關，未證全同或不屬本頁 | 歷史推測短例；保留 |

缺件：上述筆記的講義出處或教師說明；課本114–121頁原頁對照。不能僅依主題推定每一筆是課本印刷內容。若沒有要保留歷史筆記，可另行明確決定；這次沒有以猜測刪除。

## 第5課未配對答案：已找原題候選

六筆來源都是解答本112頁 pages/answers-112.jpg，狀態 pending，不是「已核對」。
- 122頁 a–h：現有122頁道順1–8文字，但沒有a–h原圖及完整配對題，不能用八句文字替代圖題。需要122頁含a–h圖示的完整照片。
- 124頁①②：可找到CD18對話中的相同短語，但没有完整帶空格①②原題；相同短語不足以建立穩定題號引用。
- 124頁③⑤：對應確認回應不在現存節選中；需要完整原對話與空格。
- 124頁④：現存節選是「道が二つに分かれますから」，解答是「分かれていますから」，不是相同句；不能硬配。
- 需要124頁含①–⑤空格的完整照片。解答本112已存在，不必重傳。

全課檢索結果：第4課未配對獨立答案0筆；第5課6筆；第6課61筆。第6課教材與解答照片多已存在，這次只檢索同頁既有結構／文字候選，**未逐張照片完成61筆配對**，不把未做人工核對說成缺照片。下表保留每筆頁碼／ID／答案及來源；來源存在不等於答案引用已完成。

| 課次 | 課本頁 | 穩定ID | 保留答案／內容（長文節錄） | 解答來源 |
| --- | --- | --- | --- | --- |
| k5 | 122 | `speaking-p122-expression-matching/item-001` | a：7 b：1 c：4 d：8 e：5 f：3 g：6 h：2 | answer-book 112：pages/answers-112.jpg（原有來源；尚待逐題复核） |
| k5 | 124 | `speaking-p124-listening-blanks/item-001` | どうやって 行 けばいい | answer-book 112：pages/answers-112.jpg（原有來源；尚待逐題复核） |
| k5 | 124 | `speaking-p124-listening-blanks/item-002` | どう 行 ったらいい | answer-book 112：pages/answers-112.jpg（原有來源；尚待逐題复核） |
| k5 | 124 | `speaking-p124-listening-blanks/item-003` | 川 に 沿 って 行 くんですね | answer-book 112：pages/answers-112.jpg（原有來源；尚待逐題复核） |
| k5 | 124 | `speaking-p124-listening-blanks/item-004` | 分 かれていますから | answer-book 112：pages/answers-112.jpg（原有來源；尚待逐題复核） |
| k5 | 124 | `speaking-p124-listening-blanks/item-005` | 突 き 当 たりに 公園 ですね | answer-book 112：pages/answers-112.jpg（原有來源；尚待逐題复核） |
| k6 | 138 | `grammar-answer-key-page-138/item-001` | 「ちょうちょ」って 歌 、 知 ってる？ | answer-book 116：pages/answers-116.jpg（原有來源；尚待逐題复核） |
| k6 | 138 | `grammar-answer-key-page-138/item-002` | うん。 知 ってるよ。 | answer-book 116：pages/answers-116.jpg（原有來源；尚待逐題复核） |
| k6 | 138 | `grammar-answer-key-page-138/item-003` | スペインで 生 まれたってことも 知 ってた？ | answer-book 116：pages/answers-116.jpg（原有來源；尚待逐題复核） |
| k6 | 138 | `grammar-answer-key-page-138/item-004` | へえ、そう。 知 らなかった。 | answer-book 116：pages/answers-116.jpg（原有來源；尚待逐題复核） |
| k6 | 138 | `grammar-answer-key-page-138/item-005` | スバルって 星 、 知 ってる？ | answer-book 116：pages/answers-116.jpg（原有來源；尚待逐題复核） |
| k6 | 138 | `grammar-answer-key-page-138/item-006` | うん。 知 ってるよ。 | answer-book 116：pages/answers-116.jpg（原有來源；尚待逐題复核） |
| k6 | 138 | `grammar-answer-key-page-138/item-007` | 日本人 がいちばん 好 きな 星 だってことも 知 ってた？ | answer-book 116：pages/answers-116.jpg（原有來源；尚待逐題复核） |
| k6 | 138 | `grammar-answer-key-page-138/item-008` | へえ、そう。 知 らなかった。 | answer-book 116：pages/answers-116.jpg（原有來源；尚待逐題复核） |
| k6 | 142 | `grammar-answer-key-page-142/item-001` | 自分 では 体操 している／ 踊 っているつもりなんですけど。 | answer-book 116：pages/answers-116.jpg（原有來源；尚待逐題复核） |
| k6 | 142 | `grammar-answer-key-page-142/item-002` | すみません。 自分 では 掃除 したつもりなんですけど。 | answer-book 116：pages/answers-116.jpg（原有來源；尚待逐題复核） |
| k6 | 142 | `grammar-answer-key-page-142/item-003` | ええ。 自分 では 優 しく 注意 したつもりなんですけど。 | answer-book 116：pages/answers-116.jpg（原有來源；尚待逐題复核） |
| k6 | 143 | `grammar-answer-key-page-143/item-001` | 肉 ばかり 食 べているけど、もっといろいろな 物 を 食 べたほうがいいよ。 | answer-book 116：pages/answers-116.jpg（原有來源；尚待逐題复核） |
| k6 | 143 | `grammar-answer-key-page-143/item-002` | ほかの 人 のことばかり 心配 しているけど、 自分 のことも 考 えたほうがいいよ。 | answer-book 116：pages/answers-116.jpg（原有來源；尚待逐題复核） |
| k6 | 143 | `grammar-answer-key-page-143/item-003` | 子 どもをしかってばかりいるけど、 少 しは 褒 めてあげたほうがいいよ。 | answer-book 116：pages/answers-116.jpg（原有來源；尚待逐題复核） |
| k6 | 143 | `grammar-answer-key-page-143/item-004` | 遊 んでばかりいるけど、たまには 勉強 したほうがいいよ。 | answer-book 116：pages/answers-116.jpg（原有來源；尚待逐題复核） |
| k6 | 144 | `grammar-answer-key-page-144/item-001` | 日本語 の 本 を 読 むとか、 日記 を 書 いて 少 しずつ 漢字 を 使 うとかすればいいですよ。 | answer-book 117：pages/answers-117.jpg（原有來源；尚待逐題复核） |
| k6 | 144 | `grammar-answer-key-page-144/item-002` | つもり 貯金 をするとか、50 円玉 は 全部 貯金箱 に 入 れるとかすればいいですよ。 | answer-book 117：pages/answers-117.jpg（原有來源；尚待逐題复核） |
| k6 | 145 | `grammar-answer-key-page-145/item-001` | 雨 が 降 ってきた。 | answer-book 117：pages/answers-117.jpg（原有來源；尚待逐題复核） |
| k6 | 145 | `grammar-answer-key-page-145/item-002` | いいにおいがしてきた。 | answer-book 117：pages/answers-117.jpg（原有來源；尚待逐題复核） |
| k6 | 145 | `grammar-answer-key-page-145/item-003` | 眠 くなってきた。 | answer-book 117：pages/answers-117.jpg（原有來源；尚待逐題复核） |
| k6 | 146 | `grammar-answer-key-page-146/item-001` | 犯人 はあっちへ 走 っていった。 | answer-book 117：pages/answers-117.jpg（原有來源；尚待逐題复核） |
| k6 | 146 | `grammar-answer-key-page-146/item-002` | 帽子 が 飛 んできた。 | answer-book 117：pages/answers-117.jpg（原有來源；尚待逐題复核） |
| k6 | 146 | `grammar-answer-key-page-146/item-003` | かわいい 女 の 子 が 引 っ 越 してきた。 | answer-book 117：pages/answers-117.jpg（原有來源；尚待逐題复核） |
| k6 | 147 | `grammar-answer-key-page-147/item-001` | いきます／いきました | answer-book 117：pages/answers-117.jpg（原有來源；尚待逐題复核） |
| k6 | 147 | `grammar-answer-key-page-147/item-002` | きました | answer-book 117：pages/answers-117.jpg（原有來源；尚待逐題复核） |
| k6 | 147 | `grammar-answer-key-page-147/item-003` | きます／きました | answer-book 117：pages/answers-117.jpg（原有來源；尚待逐題复核） |
| k6 | 147 | `grammar-answer-key-page-147/item-004` | いきます／いきました | answer-book 117：pages/answers-117.jpg（原有來源；尚待逐題复核） |
| k6 | 148 | `speaking-answer-key-page-148/item-001` | 課長 、 今 ちょっとよろしいでしょうか。ビジネスマナーのセミナーに 参加 したいんです。 仕事 に 必要 なので、 会社 の 費用 で 行 かせていただけないでしょうか。 | 缺來源 |
| k6 | 148 | `speaking-answer-key-page-148/item-002` | 全額 が 難 しければ、 半分 は 自分 で 払 います。 参加 させていただけないでしょうか。 | 缺來源 |
| k6 | 154 | `speaking-answer-key-page-154/item-001` | ミラー： 日本語能力試験 に 合 格 できませんでした。もう 一度 勉強 したいんです。 課長 ：そうですか。ミラー：この 学校 へ 行 かせていただきたいんですが。 課長 ： 費用 が 高 いですね。ミラー： | 缺來源 |
| k6 | 155 | `speaking-answer-key-page-155/item-001` | 課長 、 仕事 に 役 立 ちそうな 講演会 を 見 つけました。ビジネスチャンスについて 学 べるので、 参加 させていただきたいんですが、よろしいでしょうか。 | 缺來源 |
| k6 | 157 | `reading-answer-key-page-157/item-001` | エ、イ、ア、キ、カ、ク、オ、ウ | answer-book 118：pages/answers-118.jpg（原有來源；尚待逐題复核） |
| k6 | 159 | `reading-answer-key-page-159/item-001` | ○、×、○、○ | answer-book 118：pages/answers-118.jpg（原有來源；尚待逐題复核） |
| k6 | 159 | `reading-answer-key-page-159/item-002` | 小説 が 売 れないころ | answer-book 118：pages/answers-118.jpg（原有來源；尚待逐題复核） |
| k6 | 159 | `reading-answer-key-page-159/item-003` | 小説 が 売 れないころはどのように 過 ごしていたのですか | answer-book 118：pages/answers-118.jpg（原有來源；尚待逐題复核） |
| k6 | 159 | `reading-answer-key-page-159/item-004` | そのころ、 何 を 考 えていましたか | answer-book 119：pages/answers-119.jpg（原有來源；尚待逐題复核） |
| k6 | 159 | `reading-answer-key-page-159/item-005` | 今 、どんな 気持 ちですか | answer-book 119：pages/answers-119.jpg（原有來源；尚待逐題复核） |
| k6 | 159 | `reading-answer-key-page-159/item-006` | 記者会見 ごっこ | answer-book 119：pages/answers-119.jpg（原有來源；尚待逐題复核） |
| k6 | 159 | `reading-answer-key-page-159/item-007` | 将来 なりたいと 思 う 自分 | answer-book 119：pages/answers-119.jpg（原有來源；尚待逐題复核） |
| k6 | 159 | `reading-answer-key-page-159/item-008` | 将来 なりたいと 思 う 自分 になったところ | answer-book 119：pages/answers-119.jpg（原有來源；尚待逐題复核） |
| k6 | 159 | `reading-answer-key-page-159/item-009` | イメージの 中 で 過去 の 自分 と 向 き 合 う | answer-book 119：pages/answers-119.jpg（原有來源；尚待逐題复核） |
| k6 | 159 | `reading-answer-key-page-159/item-010` | 将来 の 理想 の 自分 から 見 て、 現在 の 自分 に 何 が 足 りないか、 何 をしなければならないかがわかること | answer-book 119：pages/answers-119.jpg（原有來源；尚待逐題复核） |
| k6 | 159 | `reading-answer-key-page-159/item-011` | プランを 立 ててチャレンジしてみて、 失敗 したらもう 一度 チャレンジする | answer-book 119：pages/answers-119.jpg（原有來源；尚待逐題复核） |
| k6 | 160 | `reading-answer-key-page-160/item-001` | 5、1、2、4、3 | answer-book 119：pages/answers-119.jpg（原有來源；尚待逐題复核） |
| k6 | 160 | `reading-answer-key-page-160/item-002` | 10 年 後 、 私 は 日本語 を 使 う 仕事 をしているつもりです。 今 は 話 す 練習 が 足 りないので、 毎日 少 しずつ 会 話 の 練習 をして、 来 年 日本語能力試験 にチャレンジしたいで | 缺來源 |
| k6 | 162 | `questions-answer-key-page-162/item-001` | a、c、a、b | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |
| k6 | 162 | `questions-answer-key-page-162/item-002` | つもりはない | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |
| k6 | 162 | `questions-answer-key-page-162/item-003` | つもりだ | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |
| k6 | 162 | `questions-answer-key-page-162/item-004` | つもりだった | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |
| k6 | 163 | `questions-answer-key-page-163/item-001` | 乗 っている | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |
| k6 | 163 | `questions-answer-key-page-163/item-002` | なった | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |
| k6 | 163 | `questions-answer-key-page-163/item-003` | 謝 っている | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |
| k6 | 163 | `questions-answer-key-page-163/item-004` | 入 った／ 失敗 して | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |
| k6 | 163 | `questions-answer-key-page-163/item-005` | 買 った | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |
| k6 | 163 | `questions-answer-key-page-163/item-006` | 言 って | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |
| k6 | 164 | `questions-answer-key-page-164/item-001` | くる | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |
| k6 | 164 | `questions-answer-key-page-164/item-002` | きた／いった | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |
| k6 | 164 | `questions-answer-key-page-164/item-003` | きた | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |
| k6 | 164 | `questions-answer-key-page-164/item-004` | b、a、b | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |
| k6 | 164 | `questions-answer-key-page-164/item-005` | つまり | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |
| k6 | 164 | `questions-answer-key-page-164/item-006` | 同 じような | answer-book 120：pages/answers-120.jpg（原有來源；尚待逐題复核） |

## 49項與前次6項：口徑差異

兩次都涵蓋課程資料，不是「原本只查第6課、現在查三課」。前次6項是**六條彙總警告**：三課答案待核對、K4缺讀音、K6數字讀音、1筆舊摘句。現在增加逐筆文字一致性與原題引用檢查；舊摘句已移除。

| 當前警告類型 | 警告條數 | 真正內容量／影響 |
| --- | --- | --- |
| K4 ruby顯示／播放文本不同 | 42 | 42筆；抽查包含省略說話者、「…」及引號等格式差異，不可全稱42個朗讀錯誤；仍需逐筆分辨實質漏句 |
| 三課答案待核對 | 3 | K4 69、K5 69、K6 59；共197筆，不能標成已核對 |
| K4缺結構讀音 | 1 | 67筆，不等於67題全部不能播放 |
| K6數字／時刻讀音待教師確認 | 1 | 12筆；不是照片完整注音 |
| K5／K6原題引用未完成 | 2 | 6＋61＝67筆；可能與197筆待核對重疊，不能相加當總缺陷數 |
| 合計 | 49 | 是警告行数，不是49個新增錯誤 |

### 影響上課使用／答案可靠性

- 中文混入日文播放：本次已修；131原題／答案分語言，115–117、133–134同類邊界修正。124④讀音錯字已修。
- 67筆未配對答案：明示未配對，不猜配，原題下方逐題答案完整性未達成。
- 197筆答案待核對：來源檔案存在不代表逐題已核對。
- K4的42筆顯示／播放差異、67筆缺讀音，K6的12筆數字讀音：仍待人工核對，沒有一概修改原文來消除提醒。
- 133頁中文定位題的日文原題缺件：錯誤播放已停，完整日文教材仍未補齊。

### 可後續整理

- 12筆未顯示的歷史文法筆記；需有來源才能刪整筆，局部相似不等於整筆重複。
- 說話者／引號／省略號的格式統一；要先從42筆中分出真正漏句，不能把所有格式差異當發布錯誤。
- 已有來源但尚未建立引用的資料整理，可以分批做；不能因此升級來源狀態。

### 真正阻擋發布的項目

技術閘門：本次 release:check **0錯誤、49警告，通過**；沒有失效本機來源引用、穩定ID或程式測試阻擋。中文誤送／已知124④錯讀資料已修，沒有保留這兩個已知錯誤。

**「全課逐题答案可靠、完整核對」正式驗收仍不能通過**：67筆原題未配對、197筆答案待核對、133原題缺件，以及未裁定的K4文字差異／讀音與K6數字讀音。這些是教學完整性與可靠性缺口；不是全部49行都硬性技術阻擋。12筆隱藏歷史筆記本身不阻擋現行頁面使用。若發布待核對版本，必須維持真實狀態並由使用者決定，這次未发布。

## 測試與界限

- npm run release:check：0錯誤49提醒；語音互斥／停止／多段／資源清理等回歸通過。79課本頁、1001穩定項目檢查通過。
- 共用語言契約：文法中日混排不把中文送段落TTS；純中文題幹／選項不生成日文段落朗讀，新增回歸測試通過。
- 瀏覽器重新載入新版，掃描三課實際渲染播放標籤：K4 537、K5 509、K6 587個按鈕；已知中文說明關鍵詞未再出現。這是特徵檢查，不是所有漢字語言的自動判定。
- 116頁日中分開顯示、中文没有日文按鈕；切頁後播放器顯示停止、沒有仍播放的audio。
- 播放請求文字／介面已檢查；沒有逐句實際聽音確認所有發音，也沒有完成所有缺來源原題人工核對。瀏覽器音訊狀態不等同人耳聽音驗收。
