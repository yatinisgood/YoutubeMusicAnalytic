'use strict';
const number = new Intl.NumberFormat('zh-TW');
const initialParams = new URLSearchParams(location.search);
const requestedDate = initialParams.get('date') || '';
const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
  ? requestedDate.replaceAll('-', '') : requestedDate;
let initialCountry = (initialParams.get('country') || '').trim();
function formatDate(value) { return String(value ?? '').replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'); }
function formatNumber(value) { return value != null && value !== '' && Number.isFinite(Number(value)) ? number.format(Number(value)) : '未提供'; }
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
function card(song, index) {
  const article = element('article', 'card');
  const cover = videoLink(song, 'cover');
  const img = element('img');
  img.alt = '';
  img.loading = 'lazy';
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
  const badge = element('div', 'badge', `#${index + 1}`);
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
  actions.append(button);
  article.append(cover, badge, title, details);
  const lastRank = song.lastweekrank;
  const previous = String(lastRank) === '0' ? '新進榜' : lastRank == null || lastRank === '' ? '未提供' : `第 ${lastRank} 名`;
  article.append(element('p', 'details', `當週播放次數：${formatNumber(song.viewcounts)}`));
  article.append(element('p', 'countries', `在榜 ${formatNumber(song.onboardweeks)} 週 · 上週：${previous}`));
  article.append(plays, actions);
  return article;
}
const country = document.getElementById('country');
const date = document.getElementById('date');
const status = document.getElementById('status');
const retry = document.getElementById('retry');
const cards = document.getElementById('country-cards');
let files = new Map();
let rows = [];
let requestId = 0;
let ready = false;
const cache = new Map();
function render() {
  const unique = new Map(rows.filter(row => row.country === country.value).map(row => [row.encryptedVideoId, row]));
  const songs = [...unique.values()].sort((a, b) => Number(b.viewcounts || 0) - Number(a.viewcounts || 0)
    || a.encryptedVideoId.localeCompare(b.encryptedVideoId)).slice(0, 100);
  cards.replaceChildren(...songs.map((song, index) => card(song, index)));
  status.textContent = songs.length
    ? `${country.value} · ${formatDate(date.value)} · 共 ${number.format(songs.length)} 首歌曲`
    : `${country.value || '此週別'} · ${formatDate(date.value)} 沒有榜單資料。`;
}
async function fetchJSON(file) {
  const response = await fetch(`./data/${file}`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
async function loadDate() {
  const request = ++requestId;
  const label = date.value;
  ready = false;
  retry.hidden = true;
  country.disabled = true;
  cards.replaceChildren();
  cards.setAttribute('aria-busy', 'true');
  status.textContent = '正在載入所選週別…';
  try {
    let data = cache.get(label);
    if (!data) {
      data = await fetchJSON(`GenJSON_ByMusicInfo_Top100SongsWeekly/${files.get(label)}`);
      if (!Array.isArray(data) || data.some(row => !row || typeof row.encryptedVideoId !== 'string'
        || typeof row.country !== 'string' || String(row.LABEL) !== label)) throw new Error('Invalid daily chart');
    }
    if (request !== requestId) return;
    cache.set(label, data);
    if (cache.size > 3) cache.delete(cache.keys().next().value);
    rows = data;
    const previous = country.value || initialCountry;
    const countries = [...new Set([...rows.map(row => row.country), ...(previous ? [previous] : [])])]
      .sort((a, b) => (a === '全球' ? -1 : b === '全球' ? 1 : new Intl.Collator('zh-Hant').compare(a, b)));
    country.replaceChildren(...countries.map(name => new Option(name, name)));
    country.value = previous || (countries.includes('全球') ? '全球' : countries[0] || '');
    initialCountry = '';
    country.disabled = countries.length === 0;
    ready = true;
    render();
  } catch (error) {
    if (request !== requestId) return;
    status.textContent = '這個週別的榜單載入失敗，請重試或選擇其他週別。';
    retry.hidden = false;
    console.error('Unable to load country chart:', error);
  } finally {
    if (request === requestId) cards.setAttribute('aria-busy', 'false');
  }
}
async function load() {
  retry.hidden = true;
  date.disabled = true;
  status.textContent = '正在載入週別清單…';
  try {
    const entries = await fetchJSON('GenJSON_ByMusicInfo_Top100SongsWeekly/GenJSON_ByMusicInfo_Top100SongsWeekly_index.json');
    if (!Array.isArray(entries) || entries.some(entry => !entry || !/^\d{8}$/.test(entry.label)
      || entry.file !== `GenJSON_ByMusicInfo_Top100SongsWeekly_${entry.label}.json`)) throw new Error('Invalid date index');
    files = new Map(entries.map(entry => [entry.label, entry.file]));
    const dates = [...files.keys()].sort().reverse();
    date.replaceChildren(...dates.map(label => new Option(formatDate(label), label)));
    if (!dates.length) {
      status.textContent = '目前沒有榜單資料。';
      cards.setAttribute('aria-busy', 'false');
      return;
    }
    if (files.has(initialDate)) date.value = initialDate;
    const notice = document.getElementById('parameter-notice');
    notice.hidden = !requestedDate || files.has(initialDate);
    notice.textContent = notice.hidden ? '' : '網址指定的週別沒有榜單，已改為最新週別。';
    date.disabled = false;
    await loadDate();
  } catch (error) {
    status.textContent = location.protocol === 'file:'
      ? '請透過本機 HTTP 伺服器或 GitHub Pages 開啟此頁面，以讀取 JSON 資料。'
      : '週別清單載入失敗，請稍後重試。';
    cards.setAttribute('aria-busy', 'false');
    retry.hidden = false;
    console.error('Unable to load date index:', error);
  }
}
country.addEventListener('change', () => { if (ready) render(); });
date.addEventListener('change', loadDate);
retry.addEventListener('click', () => { if (files.size) loadDate(); else load(); });
load();
