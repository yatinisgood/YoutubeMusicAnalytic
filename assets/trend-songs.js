'use strict';
const ui = Object.fromEntries(['all-time', 'top-three', 'status', 'retry', 'featured', 'cards', 'timeline', 'snapshot'].map(id => [id, document.getElementById(id)]));
const snapshots = new Map();
let dateFiles = new Map();
let snapshotRequest = 0;
const number = new Intl.NumberFormat('zh-TW');
const countryCodes = Object.fromEntries(`土耳其:TR 阿根廷:AR 澳洲:AU 奧地利:AT 比利時:BE 玻利維亞:BO 巴西:BR 加拿大:CA 智利:CL 哥倫比亞:CO 哥斯大黎加:CR 捷克:CZ 丹麥:DK 多明尼加共和國:DO 厄瓜多:EC 埃及:EG 薩爾瓦多:SV 愛沙尼亞:EE 芬蘭:FI 法國:FR 德國:DE 瓜地馬拉:GT 宏都拉斯:HN 香港:HK 匈牙利:HU 冰島:IS 印度:IN 印尼:ID 愛爾蘭:IE 以色列:IL 義大利:IT 日本:JP 肯亞:KE 南韓:KR 盧森堡:LU 馬來西亞:MY 墨西哥:MX 荷蘭:NL 紐西蘭:NZ 尼加拉瓜:NI 奈及利亞:NG 挪威:NO 巴拿馬:PA 巴拉圭:PY 祕魯:PE 菲律賓:PH 波蘭:PL 葡萄牙:PT 羅馬尼亞:RO 俄羅斯:RU 沙烏地阿拉伯:SA 塞爾維亞:RS 新加坡:SG 南非:ZA 西班牙:ES 瑞典:SE 瑞士:CH 台灣:TW 坦尚尼亞:TZ 泰國:TH 烏干達:UG 烏克蘭:UA 阿拉伯聯合大公國:AE 英國:GB 美國:US 烏拉圭:UY 越南:VN 辛巴威:ZW`.split(' ').map(pair => pair.split(':')));
const englishCountries = new Intl.DisplayNames(['en'], { type: 'region' });
const countryOrder = new Intl.Collator('en', { sensitivity: 'base' });
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
function englishCountry(name) {
  return countryCodes[name] ? englishCountries.of(countryCodes[name]) : name || '';
}
function compareCountries(a, b) {
  return Number(bookmarks.has(countryKey(b.counttry))) - Number(bookmarks.has(countryKey(a.counttry)))
    || countryOrder.compare(englishCountry(a.counttry), englishCountry(b.counttry))
    || countryOrder.compare(a.songid, b.songid);
}
function bookmarkButton(song) {
  const country = song.counttry;
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
    renderSnapshot();
    document.getElementById('bookmark-status').textContent = saved
      ? `${country}${bookmarks.has(key) ? '已加入' : '已移除'}書籤。`
      : '瀏覽器無法儲存 Cookie；本次開啟期間仍會保留書籤。';
    [...ui.cards.querySelectorAll('.bookmark-button')].find(item => item.dataset.country === key)?.focus({ preventScroll: true });
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
  link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(song.songid)}`;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `在 YouTube 觀看：${song.title || '未命名影片'}（開啟新分頁）`);
  return link;
}
function card(song, countries, ranking) {
  const article = element('article', 'card');
  const cover = videoLink(song, 'cover');
  const img = element('img');
  img.alt = '';
  img.loading = countries || ranking ? 'eager' : 'lazy';
  img.decoding = 'async';
  const fallback = `https://i.ytimg.com/vi/${encodeURIComponent(song.songid)}/hqdefault.jpg`;
  let thumbnail;
  try { thumbnail = new URL(song.thumbnailImage); } catch { /* Use YouTube fallback. */ }
  img.src = thumbnail?.protocol === 'https:' ? thumbnail.href : fallback;
  img.addEventListener('error', () => {
    if (img.src !== fallback) img.src = fallback;
    else img.remove();
  });
  cover.append(img);
  const isCountryLink = !ranking && !countries && Boolean(song.counttry);
  const badge = element(isCountryLink ? 'a' : 'div', 'badge', ranking ? `霸榜 TOP ${ranking.rank}` : countries ? '最多國家第一' : (song.counttry || '未提供國家'));
  if (isCountryLink) {
    const label = ui.snapshot.value;
    const date = label.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
    const params = new URLSearchParams({ date, country: song.counttry });
    badge.href = `trending-music-videos_by-country.html?${params}`;
    badge.setAttribute('aria-label', `查看${song.counttry} ${date} 的完整排行榜`);
  }
  const title = element('h2', 'song-title');
  const link = videoLink(song);
  link.textContent = song.title || '未命名影片';
  link.dir = 'auto';
  title.append(link);
  title.title = link.textContent;
  const details = element('div', 'details');
  const seconds = Number(song.videoduration);
  const duration = song.videoduration != null && String(song.videoduration).trim() !== '' && Number.isFinite(seconds) && seconds >= 0
    ? `${Math.floor(seconds / 60)}分${Math.floor(seconds % 60)}秒`
    : '片長未提供';
  details.append(element('p', 'release-duration', `發行日：${song.releasedate || '未提供'} · ${duration}`));
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
  if (!countries && !ranking && song.counttry) {
    actions.append(bookmarkButton(song));
    article.classList.toggle('bookmarked', bookmarks.has(countryKey(song.counttry)));
  }
  actions.append(button);
  article.append(cover, badge, title, details);
  if (countries) {
    const summary = element('p', 'countries', `${countries.length} 個國家與地區第一：${countries.join('、')}`);
    summary.title = summary.textContent;
    article.append(summary);
  }
  if (ranking) {
    const total = element('p', 'ranking-total', `累計 ${number.format(ranking.count)} 次第一`);
    total.append(element('span', 'dominance-breakdown', `${number.format(ranking.countryCount)} 個國家 · ${number.format(ranking.days)} 個榜單日`));
    article.append(total);
  }
  article.append(plays, actions);
  return article;
}
async function loadDominanceTop3() {
  const section = ui['all-time'];
  const status = document.getElementById('dominance-status');
  section.hidden = false;
  status.textContent = '正在載入霸榜 Top 3…';
  try {
    const response = await fetch('./data/GenJSON_ByMusicInfo_TrendSongs_DominanceTop3.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const top = await response.json();
    if (!Array.isArray(top) || top.length > 3 || top.some(row => !row || typeof row.songid !== 'string'
      || !['total_first_place_times', 'country_covered', 'active_days'].every(field => Number.isInteger(row[field]) && row[field] >= 0))) {
      throw new Error('Invalid dominance data');
    }
    ui['top-three'].replaceChildren(...top.map((song, index) => card(song, null, {
      rank: index + 1, count: song.total_first_place_times,
      countryCount: song.country_covered, days: song.active_days,
    })));
    status.textContent = top.length ? '' : '目前沒有霸榜資料。';
  } catch (error) {
    status.textContent = '霸榜資料尚未提供或載入失敗。';
    console.error('Unable to load dominance top 3:', error);
  }
}
function renderSnapshot() {
  const label = ui.snapshot.value;
  const songs = snapshots.get(label) || [];
  const groups = new Map();
  for (const song of songs) {
    if (!groups.has(song.songid)) groups.set(song.songid, { song, countries: new Set() });
    if (song.counttry) groups.get(song.songid).countries.add(song.counttry);
  }
  // Count countries only within the selected snapshot. Ties keep JSON order.
  const winner = [...groups.values()].sort((a, b) => b.countries.size - a.countries.size)[0];
  ui.featured.replaceChildren(...(winner ? [card(winner.song, [...winner.countries])] : []));
  ui.cards.replaceChildren(...[...songs].sort(compareCountries).map(song => card(song)));
  ui.status.hidden = songs.length > 0;
  ui.status.textContent = '目前沒有榜單資料。';
}
async function loadSnapshot() {
  const request = ++snapshotRequest;
  const label = ui.snapshot.value;
  ui.retry.hidden = true;
  ui.status.hidden = false;
  ui.status.textContent = '正在載入所選日期…';
  ui.cards.replaceChildren();
  ui.featured.replaceChildren();
  if (!label) { renderSnapshot(); return; }
  try {
    if (!snapshots.has(label)) {
      const filename = dateFiles.get(label);
      if (!filename) throw new Error('Unknown snapshot');
      const response = await fetch(`./data/GenJSON_ByMusicInfo_TrendSongs_ByCountry/${filename}`, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.some(row => !row || typeof row.songid !== 'string'
        || String(row.LABEL) !== label || !Number.isFinite(Number(row.rank)))) throw new Error('Invalid daily chart');
      if (request !== snapshotRequest) return;
      // Daily files include all ranks; this page shows only country champions.
      const unique = new Map();
      for (const row of rows) {
        if (Number(row.rank) === 1) unique.set(JSON.stringify([row.counttry, row.songid]), row);
      }
      snapshots.set(label, [...unique.values()]);
      // Keep only five days of champion rows, never all historical chart rows.
      if (snapshots.size > 5) snapshots.delete(snapshots.keys().next().value);
    }
    if (request === snapshotRequest) renderSnapshot();
  } catch (error) {
    if (request !== snapshotRequest) return;
    ui.status.textContent = '這個日期的榜單載入失敗，請重試或選擇其他日期。';
    ui.retry.hidden = false;
    console.error('Unable to load daily chart:', error);
  }
}
async function load() {
  ++snapshotRequest;
  ui.retry.hidden = true;
  ui.status.hidden = false;
  ui.status.textContent = '正在載入日期清單…';
  ui.timeline.hidden = true;
  ui.cards.replaceChildren();
  ui.featured.replaceChildren();
  try {
    const response = await fetch('./data/GenJSON_ByMusicInfo_TrendSongs_ByCountry/GenJSON_ByMusicInfo_TrendSongs_ByCountry_index.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const entries = await response.json();
    if (!Array.isArray(entries) || entries.some(entry => !entry || !/^\d{8}$/.test(entry.label)
      || entry.file !== `GenJSON_ByMusicInfo_TrendSongs_ByCountry_${entry.label}.json`)) throw new Error('Invalid date index');
    dateFiles = new Map(entries.map(entry => [entry.label, entry.file]));
    const dates = [...dateFiles.keys()].sort();
    const previous = ui.snapshot.value;
    ui.snapshot.replaceChildren(...dates.map(label => new Option(`${label.slice(0, 4)}-${label.slice(4, 6)}-${label.slice(6, 8)}`, label)));
    ui.snapshot.value = dateFiles.has(previous) ? previous : dates.at(-1) ?? '';
    ui.timeline.hidden = dates.length === 0;
    await loadSnapshot();
  } catch (error) {
    ui.status.textContent = location.protocol === 'file:' ? '請透過本機 HTTP 伺服器或 GitHub Pages 開啟此頁面，以讀取 JSON 資料。' : '日期清單載入失敗，請稍後重試。';
    ui.retry.hidden = false;
    console.error('Unable to load date index:', error);
  }
}
ui.snapshot.addEventListener('change', loadSnapshot);
ui.retry.addEventListener('click', () => { load(); loadDominanceTop3(); });
loadDominanceTop3();
load();
