# 音樂榜單網頁

第一個頁面為 `index.html`：各國排行第一的發燒音樂（影片）。

頂部固定顯示「累計第一 Top 3」一排三張卡片，將所有資料依影片分組，計算不重複的 `(LABEL, counttry)` 組合數；例如兩個時間分別有 5 國、4 國第一，累計為 9 次。相同時間及國家的重複列不重算，缺少時間或國家者不計入；同分依 songid 排序，最多顯示三部影片。此列不隨 snapshot 切換，下方仍保留所選時間的精選與各國冠軍。

採用灰底白色卡片、大型縮圖與國家標籤，不提供搜尋、國家篩選或排序控制。透過榜單時間下拉選單或左右按鈕切換 snapshot，預設顯示最新 LABEL。精選卡片依所選時間內各影片奪冠的不同國家數選出「最多國家第一」，同數時依 JSON 順序選取；保留所有國家的冠軍卡片。桌面版每列 6 欄，精選卡片橫跨 2 欄、與其他卡片等高（第一列為精選加 4 張一般卡片），後續每列 6 張；較窄螢幕依序改為 3 欄、2 欄、1 欄。

網頁透過相對路徑讀取 `data/GenHtml_ByMusicInfo_TrendSongs.json`，更新 JSON 後重新整理頁面即可顯示最新資料，不需編譯。國家欄位沿用資料中的 `counttry`；每筆資料代表一個國家或地區的冠軍，同一影片可能在多國奪冠。LABEL 為榜單 snapshot 的時間；觀看次數仍取最新觀看次數快照，並非當時的歷史觀看次數。

執行 `python3 GenHtml_ByMusicInfo_TrendSongs.py` 可從 BigQuery 重新匯出所有 LABEL 的各國第一（需原有 Google Cloud 憑證與依賴）。

在專案根目錄執行：

```sh
python3 -m http.server 8000 --directory HTML_Github
```

瀏覽 `http://localhost:8000`。請使用 HTTP 伺服器，直接以 `file://` 開啟 HTML 可能無法讀取 JSON。

部署時將 `HTML_Github` 目錄的完整內容發布至靜態網站或 GitHub Pages，保留 `assets` 與 `data` 的相對位置。

各國卡片可收藏國家，Cookie 保留一年並限於網站路徑。收藏跨日期保留，收藏與未收藏各組均依英文國名 A–Z 排序；累計 Top 3 與當期精選不受影響。Cookie 被清除後收藏也會重設。
