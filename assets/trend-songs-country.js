'use strict';
const number = new Intl.NumberFormat('zh-TW');
function formatDate(value) { return String(value ?? '').replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'); }
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
function card(song) {
  const article = element('article', 'card');
  const cover = videoLink(song, 'cover');
  const img = element('img');
  img.alt = '';
  img.loading = 'lazy';
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
  const badge = element('div', 'badge', `第 ${song.rank} 名`);
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
  details.append(element('p', 'release-duration', `發行日：${formatDate(song.releasedate) || '未提供'} · ${duration}`));
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
  const songs = rows.filter(row => row.counttry === country.value).sort((a, b) => Number(a.rank) - Number(b.rank));
  cards.replaceChildren(...songs.map(card));
  status.textContent = songs.length
    ? `${country.value} · ${formatDate(date.value)} · 共 ${number.format(songs.length)} 部影片`
    : `${country.value || '此日期'} · ${formatDate(date.value)} 沒有榜單資料。`;
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
  status.textContent = '正在載入所選日期…';
  try {
    let data = cache.get(label);
    if (!data) {
      data = await fetchJSON(files.get(label));
      if (!Array.isArray(data) || data.some(row => !row || typeof row.songid !== 'string'
        || typeof row.counttry !== 'string' || String(row.LABEL) !== label
        || !Number.isInteger(Number(row.rank)) || Number(row.rank) < 1)) throw new Error('Invalid daily chart');
    }
    if (request !== requestId) return;
    cache.set(label, data);
    if (cache.size > 3) cache.delete(cache.keys().next().value);
    rows = data;
    const previous = country.value;
    const countries = [...new Set([...rows.map(row => row.counttry), ...(previous ? [previous] : [])])]
      .sort(new Intl.Collator('zh-Hant').compare);
    country.replaceChildren(...countries.map(name => new Option(name, name)));
    country.value = previous || (countries.includes('台灣') ? '台灣' : countries[0] || '');
    country.disabled = countries.length === 0;
    ready = true;
    render();
  } catch (error) {
    if (request !== requestId) return;
    status.textContent = '這個日期的榜單載入失敗，請重試或選擇其他日期。';
    retry.hidden = false;
    console.error('Unable to load country chart:', error);
  } finally {
    if (request === requestId) cards.setAttribute('aria-busy', 'false');
  }
}
async function load() {
  retry.hidden = true;
  date.disabled = true;
  status.textContent = '正在載入日期清單…';
  try {
    const entries = await fetchJSON('GenJSON_ByMusicInfo_TrendSongs_ByCountry_index.json');
    if (!Array.isArray(entries) || entries.some(entry => !entry || !/^\d{8}$/.test(entry.label)
      || entry.file !== `GenJSON_ByMusicInfo_TrendSongs_ByCountry_${entry.label}.json`)) throw new Error('Invalid date index');
    files = new Map(entries.map(entry => [entry.label, entry.file]));
    const dates = [...files.keys()].sort().reverse();
    date.replaceChildren(...dates.map(label => new Option(formatDate(label), label)));
    if (!dates.length) {
      status.textContent = '目前沒有榜單資料。';
      cards.setAttribute('aria-busy', 'false');
      return;
    }
    date.disabled = false;
    await loadDate();
  } catch (error) {
    status.textContent = location.protocol === 'file:'
      ? '請透過本機 HTTP 伺服器或 GitHub Pages 開啟此頁面，以讀取 JSON 資料。'
      : '日期清單載入失敗，請稍後重試。';
    cards.setAttribute('aria-busy', 'false');
    retry.hidden = false;
    console.error('Unable to load date index:', error);
  }
}
country.addEventListener('change', () => { if (ready) render(); });
date.addEventListener('change', loadDate);
retry.addEventListener('click', () => { if (files.size) loadDate(); else load(); });
load();
