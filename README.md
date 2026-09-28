# 音樂榜單網頁

首頁 `index.html` 提供「全球冠軍總覽」與「各國完整排行榜」兩個入口；榜單頁面的導覽列可返回首頁或切換榜單。

第一個頁面為 `trending-music-videos.html`：各國排行第一的發燒音樂（影片）。

頂部固定顯示「霸榜 Top 3」，直接讀取 `data/GenJSON_ByMusicInfo_TrendSongs_DominanceTop3.json`，不再由 JavaScript 統計歷史資料。Python 程式 `GenJSON_ByMusicInfo_TrendSongs_DominanceTop3.py` 使用 BigQuery SQL 計算不同 `(LABEL, country)` 的第一次數，同分依 songid 排序，取前三名。欄位 `total_first_place_times` 為累計第一次數、`country_covered` 為國家數、`active_days` 為不同 LABEL 數（榜單日）。影片資訊採最新榜單資料，觀看次數採最新觀看次數快照；排名先計算再關聯，避免關聯放大次數。此列不隨 snapshot 切換。

採用灰底白色卡片、大型縮圖與國家標籤，不提供搜尋、國家篩選或排序控制。透過榜單時間下拉選單或左右按鈕切換 snapshot，預設顯示最新 LABEL。精選卡片依所選時間內各影片奪冠的不同國家數選出「最多國家第一」，同數時依 JSON 順序選取；保留所有國家的冠軍卡片。桌面版每列 6 欄，精選卡片橫跨 2 欄、與其他卡片等高（第一列為精選加 4 張一般卡片），後續每列 6 張；較窄螢幕依序改為 3 欄、2 欄、1 欄。

網頁先讀取 `data/GenJSON_ByMusicInfo_TrendSongs_ByCountry_index.json` 日期清單，再按需讀取 `data/GenJSON_ByMusicInfo_TrendSongs_ByCountry_YYYYMMDD.json`，僅顯示 `rank = 1` 的各國冠軍（每日檔包含其他排名），更新 JSON 後重新整理頁面即可顯示最新資料，不需編譯。國家欄位沿用資料中的 `counttry`；每筆資料代表一個國家或地區的冠軍，同一影片可能在多國奪冠。LABEL 為榜單 snapshot 的時間；觀看次數仍取最新觀看次數快照，並非當時的歷史觀看次數。

執行 `python3 GenJSON_ByMusicInfo_TrendSongs_ByCountry.py` 可從 BigQuery 重新匯出每日榜單並更新日期清單（需原有 Google Cloud 憑證與依賴）。

在專案根目錄執行：

```sh
python3 -m http.server 8000 --directory HTML_Github
```

瀏覽 `http://localhost:8000`。請使用 HTTP 伺服器，直接以 `file://` 開啟 HTML 可能無法讀取 JSON。

部署時將 `HTML_Github` 目錄的完整內容發布至靜態網站或 GitHub Pages，保留 `assets` 與 `data` 的相對位置。

各國卡片可收藏國家，Cookie 保留一年並限於網站路徑。收藏跨日期保留，收藏與未收藏各組均依英文國名 A–Z 排序；累計 Top 3 與當期精選不受影響。Cookie 被清除後收藏也會重設。

第二個頁面為 `trending-music-videos_by-country.html`：各國完整發燒音樂排行榜。使用國家、日期兩個下拉選單，日期顯示為 `YYYY-MM-DD`，預設最新日期與台灣（當日沒有台灣時選第一個國家）。按日期清單載入對應每日 JSON，顯示所選國家的所有排名，依名次遞增排列。切換日期保留所選國家，當日無資料時顯示提示；國家選項依當日資料更新。頁面沿用深淺色模式、影片卡片與 YouTube 連結，並與首頁互相連結。

### 各國長尾霸榜 Top 3

`trending-music-videos_by-country.html` 在國家與日期選單上方顯示三張長尾霸榜卡片；桌面每張佔六欄網格中的兩欄，窄螢幕改為單欄。卡片隨國家切換，不受日期影響，直接讀取獨立的 `data/GenJSON_ByMusicInfo_TrendSongs_LongevityTop3.json`。

在專案根目錄執行 `.conda/bin/python GenJSON_ByMusicInfo_TrendSongs_LongevityTop3.py`，會從 BigQuery 產生所有國家的 Top 3，已加入 `MainProcess_YTMusic.py` 的更新清單。可使用 `--country 台灣` 查詢單一國家；此模式另存 `GenJSON_ByMusicInfo_TrendSongs_LongevityTop3_SelectedCountry.json`，不覆蓋網站使用的完整資料。

計分只採第 1–30 名，每次入榜得 `31 - rank` 分。以國家、歌曲 ID、LABEL 去重；同一快照若存在衝突名次，取最高名次。按國家與歌曲累計積分、入榜快照次數、最高及平均名次，影片名稱等欄位取最新有效榜單資訊，避免名稱或縮圖變更造成分組拆散。排名使用 `DENSE_RANK`，同分同名次；每國最多三張卡片，同分依 songid 選取。歌手及最新總觀看次數先彙整為每首一筆再關聯，避免放大積分。統計範圍為 BigQuery 現有歷史資料，入榜次數不是觀看次數，也不是連續在榜天數。
