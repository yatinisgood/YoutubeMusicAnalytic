# 音樂榜單網頁


第一個頁面為 `trending-music-videos.html`：各國排行第一的發燒音樂（影片）。

在專案根目錄執行：
```sh
python3 -m http.server 8000 --directory HTML_Github
```
部署時將 `HTML_Github` 目錄的完整內容發布至靜態網站或 GitHub Pages，保留 `assets` 與 `data` 的相對位置。

第二個頁面為 `trending-music-videos_by-country.html`：各國完整發燒音樂排行榜。使用國家、日期兩個下拉選單，日期顯示為 `YYYY-MM-DD`，預設最新日期與台灣（當日沒有台灣時選第一個國家）。按日期清單載入對應每日 JSON，顯示所選國家的所有排名，依名次遞增排列。切換日期保留所選國家，當日無資料時顯示提示；國家選項依當日資料更新。頁面沿用深淺色模式、影片卡片與 YouTube 連結，並與首頁互相連結。

### 各國長尾霸榜 Top 3

`trending-music-videos_by-country.html` 在國家與日期選單上方顯示三張長尾霸榜卡片；桌面每張佔六欄網格中的兩欄，窄螢幕改為單欄。卡片隨國家切換，不受日期影響，直接讀取獨立的 `data/GenJSON_ByMusicInfo_TrendSongs_LongevityTop3.json`。


全球冠軍卡片的國家標籤可直接開啟各國榜單，帶入目前榜單日期與國家。例如：`trending-music-videos_by-country.html?date=2026-09-28&country=日本`。目標頁面接受 `date=YYYY-MM-DD` 或 `YYYYMMDD`，以及 `country` 中文國名；網址中的國名會自動編碼。缺少參數時沿用預設值，指定日期不存在時提示並改用最新日期，指定國家當日無資料時保留該國家並顯示無資料提示。長尾 Top 3 同步顯示指定國家的統計。

### 每週熱播歌曲

`top-songs-weekly.html` 讀取 `data/GenJSON_ByMusicInfo_TopSongsWeekly/` 內的周別索引與 `GenJSON_ByMusicInfo_TopSongsWeekly_YYYYMMDD.json`，預設最新一週。周別下拉選單以 `YYYY-MM-DD` 顯示 LABEL。現有匯出 SQL 僅包含各地區當週第一名，全球卡片置頂並佔六欄網格中的兩欄，其餘依英文國名 A–Z 排序；小螢幕自動縮減欄數。顯示歌手、發行日、當週播放次數、在榜週數、上週名次及最新總播放次數；上週名次為 0 時顯示「新進榜」。來源無片長欄位，因此不顯示片長。


### 全球週榜累計奪冠 Top 3

`GenJSON_ByMusicInfo_GlobalTopSongsWeekly.py` 使用 BigQuery 計算全球「每週熱播歌曲」第一名的累計週數，輸出獨立的 `data/GenJSON_ByMusicInfo_GlobalTopSongsWeekly.json`，並已加入主程式更新清單。統計依 `songid`、`encryptedVideoId`、`title` 分組，以不同 `dataweek` 計次，保留 `DENSE_RANK` 同分同名次規則，固定最多取三筆，同分依歌曲 ID、影片 ID 與標題排序。歌手去重，最新觀看次數按影片彙整，避免關聯產生重複卡片。

`top-songs-weekly.html` 在榜單時間選擇器上方呈現三張卡片，顯示累計奪冠週數、首次及最近奪冠日期、歌曲資訊與最新總播放次數。此區塊不受所選週榜或國家關注影響，載入失敗可獨立重試。

### 全球累計入榜 Top 6

`GenJSON_ByMusicInfo_GlobalTopSongsOnBoard.py` 匯出 `data/GenJSON_ByMusicInfo_GlobalTopSongsOnBoard.json`，已加入主程式更新清單。依提供的 SQL 計算全球每週熱播歌曲所有名次的不同 `dataweek` 次數，最多取六筆。JSON 沿用 `top1_weeks_count`、`first_top1_week`、`latest_top1_week` 欄位名稱，但在此檔案代表累計入榜週數、首次及最近入榜週次，並非奪冠週數。

頁面在「全球累計奪冠 Top 3」下方、榜單時間選擇器上方顯示「全球累計入榜 Top 6」，桌面六張同列，較窄螢幕沿用三欄、兩欄、單欄配置。此區塊不受榜單時間與國家關注影響，並提供獨立載入失敗重試。
