'use strict';
const number = new Intl.NumberFormat('zh-TW');
function formatDate(value) { return String(value ?? '').replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'); }
function formatNumber(value) { return value != null && value !== '' && Number.isFinite(Number(value)) ? number.format(Number(value)) : '未提供'; }
const countryCodes = Object.fromEntries(`土耳其:TR 阿根廷:AR 澳洲:AU 奧地利:AT 比利時:BE 玻利維亞:BO 巴西:BR 加拿大:CA 智利:CL 哥倫比亞:CO 哥斯大黎加:CR 捷克:CZ 丹麥:DK 多明尼加共和國:DO 厄瓜多:EC 埃及:EG 薩爾瓦多:SV 愛沙尼亞:EE 芬蘭:FI 法國:FR 德國:DE 瓜地馬拉:GT 宏都拉斯:HN 香港:HK 匈牙利:HU 冰島:IS 印度:IN 印尼:ID 愛爾蘭:IE 以色列:IL 義大利:IT 日本:JP 肯亞:KE 南韓:KR 盧森堡:LU 馬來西亞:MY 墨西哥:MX 荷蘭:NL 紐西蘭:NZ 尼加拉瓜:NI 奈及利亞:NG 挪威:NO 巴拿馬:PA 巴拉圭:PY 祕魯:PE 菲律賓:PH 波蘭:PL 葡萄牙:PT 羅馬尼亞:RO 俄羅斯:RU 沙烏地阿拉伯:SA 塞爾維亞:RS 新加坡:SG 南非:ZA 西班牙:ES 瑞典:SE 瑞士:CH 台灣:TW 坦尚尼亞:TZ 泰國:TH 烏干達:UG 烏克蘭:UA 阿拉伯聯合大公國:AE 英國:GB 美國:US 烏拉圭:UY 越南:VN 辛巴威:ZW`.split(' ').map(pair => pair.split(':')));
const bookmarkCookie = 'music_atlas_countries';
// Scope to this site's directory so other GitHub Pages projects stay separate.
const bookmarkPath = new URL('.', location.href).pathname;
function countryKey(name) { return countryCodes[name] || name || ''; }
function readBookmarks() {
  try {
    const cookie = document.cookie.split('; ').find(value => value.startsWith(`${bookmarkCookie}=`));
    const values = cookie ? JSON.parse(decodeURIComponent(cookie.slice(bookmarkCookie.length + 1))) : [];
    return new Set(Array.isArray(values) ? values.filter(value => typeof value === 'string') : []);
  } catch { return new Set(); }
}
let bookmarks = readBookmarks();
function saveBookmarks() {
  try {
    document.cookie = `${bookmarkCookie}=${encodeURIComponent(JSON.stringify([...bookmarks]))}; Path=${bookmarkPath}; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    const saved = readBookmarks();
    return saved.size === bookmarks.size && [...bookmarks].every(value => saved.has(value));
  } catch { return false; }
}
function bookmarkButton(song) {
  const country = song.country;
  const key = countryKey(country);
  const selected = bookmarks.has(key);
  const button = element('button', 'bookmark-button', selected ? '★ 已關注' : '☆ 關注');
  button.type = 'button';
  button.dataset.country = key;
  button.setAttribute('aria-pressed', String(selected));
  button.setAttribute('aria-label', `${selected ? '取消關注' : '關注'}${country}`);
  button.addEventListener('click', () => {
    if (bookmarks.has(key)) bookmarks.delete(key); else bookmarks.add(key);
    const saved = saveBookmarks();
    renderWeek();
    document.getElementById('bookmark-status').textContent = saved
      ? `${country}${bookmarks.has(key) ? '已加入' : '已移除'}書籤。`
      : '瀏覽器無法儲存 Cookie；本次開啟期間仍會保留書籤。';
    [...cards.querySelectorAll('.bookmark-button')].find(item => item.dataset.country === key)?.focus({ preventScroll: true });
  });
  return button;
}
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}
function videoLink(song, className) {
  const link = element('a', className);
  link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(song.encryptedVideoId)}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `在 YouTube 觀看：${song.title || '未命名影片'}（開啟新分頁）`);
  return link;
}
function card(song, allTime = false) {
  const article = element('article', 'card');
  const cover = videoLink(song, 'cover');
  const img = element('img');
  img.alt = '';
  img.loading = allTime || song.country === '全球' ? 'eager' : 'lazy';
  img.decoding = 'async';
  const fallback = `https://i.ytimg.com/vi/${encodeURIComponent(song.encryptedVideoId)}/hqdefault.jpg`;
  let thumbnail;
  try { thumbnail = new URL(song.thumbnailImage); } catch { /* Use YouTube fallback. */ }
  img.src = thumbnail?.protocol === 'https:' ? thumbnail.href : fallback;
  img.addEventListener('error', () => {
    if (img.src !== fallback) img.src = fallback;
    else img.remove();
  });
  cover.append(img);
  const badge = element('div', 'badge', allTime ? `全球 TOP ${song.rank}` : song.country);
  const title = element('h2', 'song-title');
  const link = videoLink(song);
  link.textContent = song.title || '未命名影片';
  link.dir = 'auto';
  title.append(link);
  title.title = link.textContent;
  const details = element('div', 'details');
  details.append(element('p', 'release-duration', `發行日：${formatDate(song.releasedate) || '未提供'}`));
  const artist = element('p', 'artist', `歌手：${song.artists || '未提供'}`);
  artist.title = artist.textContent;
  details.append(artist);
  const views = song.newwatchtimes;
  const plays = element('p', 'views', `總播放次數：${views != null && views !== '' && Number.isFinite(Number(views)) ? number.format(Number(views)) : '未提供'}`);
  const actions = element('div', 'actions');
  const button = videoLink(song, 'video-button');
  button.title = '前往 YouTube 觀看';
  // Static icon; JSON values are always inserted as text.
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.7 4.6 12 4.6 12 4.6s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1A31 31 0 0 0 2 12a31 31 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22 12a31 31 0 0 0-.4-4.8ZM10 15.5v-7l6 3.5-6 3.5Z"/></svg>';
  if (!allTime && song.country && song.country !== '全球') {
    actions.append(bookmarkButton(song));
    article.classList.toggle('bookmarked', bookmarks.has(countryKey(song.country)));
  }
  actions.append(button);
  article.append(cover, badge, title, details);
  if (allTime) {
    article.append(element('p', 'ranking-total', `累計奪冠 ${formatNumber(song.top1_weeks_count)} 週`));
    article.append(element('p', 'details', `首次奪冠：${formatDate(song.first_top1_week)}`));
    article.append(element('p', 'details', `最近奪冠：${formatDate(song.latest_top1_week)}`));
  } else {
  const lastRank = song.lastweekrank;
  const previous = String(lastRank) === '0' ? '新進榜' : lastRank == null || lastRank === '' ? '未提供' : `第 ${lastRank} 名`;
  article.append(element('p', 'details', `當週播放次數：${formatNumber(song.viewcounts)}`));
  article.append(element('p', 'countries', `在榜 ${formatNumber(song.onboardweeks)} 週 · 上週：${previous}`));
  }
  article.append(plays, actions);
  return article;
}
const week = document.getElementById('week');
const previous = document.getElementById('previous');
const next = document.getElementById('next');
const featured = document.getElementById('featured');
const cards = document.getElementById('cards');
const status = document.getElementById('status');
const retry = document.getElementById('retry');
const layout = document.getElementById('weekly-layout');
const prefix = 'GenJSON_ByMusicInfo_TopSongsWeekly';
const englishNames = new Intl.DisplayNames(['en'], { type: 'region' });
const collator = new Intl.Collator('en', { sensitivity: 'base' });
const englishCountry = name => countryCodes[name] ? englishNames.of(countryCodes[name]) : name;
let files = new Map();
const cache = new Map();
let requestId = 0;
async function fetchJSON(filename) {
  const response = await fetch(`./data/${prefix}/${filename}`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
function updateWeekButtons() {
  previous.disabled = week.disabled || week.selectedIndex <= 0;
  next.disabled = week.disabled || week.selectedIndex >= week.options.length - 1;
}
function renderWeek() {
  const rows = cache.get(week.value) || [];
    // Keep one card per country/video even when joins repeat an identical entry.
    const songs = [...new Map(rows.map(row => [JSON.stringify([row.country, row.encryptedVideoId]), row])).values()];
    const global = songs.filter(song => song.country === '全球');
    const countries = songs.filter(song => song.country !== '全球').sort((a, b) =>
      Number(bookmarks.has(countryKey(b.country))) - Number(bookmarks.has(countryKey(a.country)))
      || collator.compare(englishCountry(a.country), englishCountry(b.country))
      || collator.compare(a.encryptedVideoId, b.encryptedVideoId));
    featured.replaceChildren(...global.map(song => card(song)));
    cards.replaceChildren(...countries.map(song => card(song)));
    status.hidden = songs.length > 0 && global.length > 0;
    status.textContent = songs.length ? '此週未提供全球榜單，以下為各國冠軍。' : '此週沒有榜單資料。';
}
async function loadWeek() {
  updateWeekButtons();
  const request = ++requestId;
  const label = week.value;
  retry.hidden = true;
  status.hidden = false;
  status.textContent = '正在載入所選週榜…';
  featured.replaceChildren();
  cards.replaceChildren();
  layout.setAttribute('aria-busy', 'true');
  try {
    let rows = cache.get(label);
    if (!rows) {
      rows = await fetchJSON(files.get(label));
      if (!Array.isArray(rows) || rows.some(row => !row || String(row.LABEL) !== label
        || typeof row.country !== 'string' || typeof row.encryptedVideoId !== 'string')) throw new Error('Invalid weekly chart');
    }
    if (request !== requestId) return;
    cache.set(label, rows);
    if (cache.size > 5) cache.delete(cache.keys().next().value);
    renderWeek();
  } catch (error) {
    if (request !== requestId) return;
    status.textContent = '這個週榜載入失敗，請重試或選擇其他周別。';
    retry.hidden = false;
    console.error('Unable to load weekly chart:', error);
  } finally {
    if (request === requestId) layout.setAttribute('aria-busy', 'false');
  }
}
async function load() {
  retry.hidden = true;
  week.disabled = true;
  updateWeekButtons();
  try {
    const entries = await fetchJSON(`${prefix}_index.json`);
    if (!Array.isArray(entries) || entries.some(entry => !entry || !/^\d{8}$/.test(entry.label)
      || entry.file !== `${prefix}_${entry.label}.json`)) throw new Error('Invalid weekly index');
    files = new Map(entries.map(entry => [entry.label, entry.file]));
    const labels = [...files.keys()].sort();
    const selected = week.value;
    week.replaceChildren(...labels.map(label => new Option(formatDate(label), label)));
    if (!labels.length) {
      status.textContent = '目前沒有週榜資料。';
      layout.setAttribute('aria-busy', 'false');
      return;
    }
    week.value = files.has(selected) ? selected : labels.at(-1);
    week.disabled = false;
    await loadWeek();
  } catch (error) {
    status.textContent = location.protocol === 'file:' ? '請透過本機 HTTP 伺服器或 GitHub Pages 開啟此頁面，以讀取 JSON 資料。' : '周別清單載入失敗，請稍後重試。';
    layout.setAttribute('aria-busy', 'false');
    retry.hidden = false;
    console.error('Unable to load weekly index:', error);
  }
}
week.addEventListener('change', loadWeek);
for (const [button, step] of [[previous, -1], [next, 1]]) {
  button.addEventListener('click', () => {
    const index = week.selectedIndex + step;
    if (!week.disabled && index >= 0 && index < week.options.length) {
      week.selectedIndex = index;
      loadWeek();
    }
  });
}
retry.addEventListener('click', () => files.size ? loadWeek() : load());
load();

async function loadGlobalTop3() {
  const container = document.getElementById('global-top-cards');
  const message = document.getElementById('global-top-status');
  const retryButton = document.getElementById('global-top-retry');
  retryButton.hidden = true;
  container.setAttribute('aria-busy', 'true');
  message.textContent = '正在載入全球累計奪冠 Top 3…';
  try {
    const response = await fetch('./data/GenJSON_ByMusicInfo_GlobalTopSongsWeekly.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length > 3 || rows.some(row => !row
      || typeof row.encryptedVideoId !== 'string'
      || !Number.isInteger(row.rank) || row.rank < 1
      || !Number.isInteger(row.top1_weeks_count) || row.top1_weeks_count < 1
      || !/^\d{8}$/.test(String(row.first_top1_week))
      || !/^\d{8}$/.test(String(row.latest_top1_week)))) throw new Error('Invalid global Top 3');
    container.replaceChildren(...rows.map(song => card(song, true)));
    message.textContent = rows.length ? '' : '目前沒有全球累計奪冠資料。';
  } catch (error) {
    message.textContent = '全球累計奪冠資料尚未提供或載入失敗，請重試。';
    retryButton.hidden = false;
    console.error('Unable to load global Top 3:', error);
  } finally {
    container.setAttribute('aria-busy', 'false');
  }
}
document.getElementById('global-top-retry').addEventListener('click', loadGlobalTop3);
loadGlobalTop3();
