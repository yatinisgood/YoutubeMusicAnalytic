'use strict';
const ui = Object.fromEntries(['all-time', 'top-three', 'status', 'retry', 'featured', 'cards', 'timeline', 'snapshot', 'previous', 'next'].map(id => [id, document.getElementById(id)]));
let snapshots = new Map();
const number = new Intl.NumberFormat('zh-TW');
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
  const badge = element('div', 'badge', ranking ? `累計第一 TOP ${ranking.rank}` : countries ? '最多國家第一' : (song.counttry || '未提供國家'));
  const title = element('h2', 'song-title');
  const link = videoLink(song);
  link.textContent = song.title || '未命名影片';
  link.dir = 'auto';
  title.append(link);
  title.title = link.textContent;
  const details = element('div', 'details');
  const seconds = song.videoduration;
  details.append(element('p', '', `發行日：${song.releasedate || '未提供'}`), element('p', '', `秒數：${seconds != null && seconds !== '' ? seconds : '未提供'}`));
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
  if (countries) {
    const summary = element('p', 'countries', `${countries.length} 個國家與地區第一：${countries.join('、')}`);
    summary.title = summary.textContent;
    article.append(summary);
  }
  if (ranking) article.append(element('p', 'ranking-total', `累計 ${number.format(ranking.count)} 次第一`));
  article.append(plays, actions);
  return article;
}
function rankAllSnapshots(songs) {
  const groups = new Map();
  for (const song of songs) {
    const label = String(song.LABEL ?? '').trim();
    const country = String(song.counttry ?? '').trim();
    if (!label || !country || !song.songid) continue;
    if (!groups.has(song.songid)) groups.set(song.songid, { song, wins: new Set() });
    const group = groups.get(song.songid);
    group.wins.add(JSON.stringify([label, country]));
    // Use the most recent snapshot's metadata for the fixed summary cards.
    if (label > String(group.song.LABEL).trim()) group.song = song;
  }
  return [...groups.values()]
    .map(group => ({ song: group.song, count: group.wins.size }))
    .sort((a, b) => b.count - a.count || a.song.songid.localeCompare(b.song.songid))
    .slice(0, 3);
}
function renderAllTime(songs) {
  const top = rankAllSnapshots(songs);
  ui['top-three'].replaceChildren(...top.map((entry, index) => card(entry.song, null, { rank: index + 1, count: entry.count })));
  ui['all-time'].hidden = top.length === 0;
}
function renderSnapshot() {
  const label = ui.snapshot.value;
  const songs = snapshots.get(label) || [];
  ui.previous.disabled = ui.snapshot.selectedIndex <= 0;
  ui.next.disabled = ui.snapshot.selectedIndex >= ui.snapshot.options.length - 1;
  const groups = new Map();
  for (const song of songs) {
    if (!groups.has(song.songid)) groups.set(song.songid, { song, countries: new Set() });
    if (song.counttry) groups.get(song.songid).countries.add(song.counttry);
  }
  // Count countries only within the selected snapshot. Ties keep JSON order.
  const winner = [...groups.values()].sort((a, b) => b.countries.size - a.countries.size)[0];
  ui.featured.replaceChildren(...(winner ? [card(winner.song, [...winner.countries])] : []));
  ui.cards.replaceChildren(...songs.map(song => card(song)));
  ui.status.hidden = songs.length > 0;
  ui.status.textContent = '目前沒有榜單資料。';
}
async function load() {
  ui.retry.hidden = true;
  ui.status.hidden = false;
  ui.status.textContent = '正在載入榜單…';
  try {
    const response = await fetch('./data/GenHtml_ByMusicInfo_TrendSongs.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const songs = await response.json();
    if (!Array.isArray(songs) || songs.some(row => !row || typeof row !== 'object' || typeof row.songid !== 'string')) throw new Error('Invalid chart data');
    renderAllTime(songs);
    snapshots = new Map();
    for (const song of songs) {
      const label = String(song.LABEL ?? '').trim();
      if (!snapshots.has(label)) snapshots.set(label, []);
      snapshots.get(label).push(song);
    }
    const dates = [...snapshots.keys()].sort();
    ui.snapshot.replaceChildren(...dates.map(label => {
      const displayDate = /^\d{8}$/.test(label)
        ? `${label.slice(0, 4)}-${label.slice(4, 6)}-${label.slice(6, 8)}`
        : label;
      return new Option(displayDate || '未提供時間', label);
    }));
    ui.snapshot.value = dates.at(-1) ?? '';
    ui.timeline.hidden = dates.length === 0;
    renderSnapshot();
  } catch (error) {
    ui.status.textContent = location.protocol === 'file:' ? '請透過本機 HTTP 伺服器或 GitHub Pages 開啟此頁面，以讀取 JSON 資料。' : '榜單載入失敗，請稍後重試。';
    ui.retry.hidden = false;
    console.error('Unable to load trend songs:', error);
  }
}
ui.snapshot.addEventListener('change', renderSnapshot);
for (const [button, step] of [[ui.previous, -1], [ui.next, 1]]) {
  button.addEventListener('click', () => {
    const index = ui.snapshot.selectedIndex + step;
    if (index >= 0 && index < ui.snapshot.options.length) {
      ui.snapshot.selectedIndex = index;
      renderSnapshot();
    }
  });
}
ui.retry.addEventListener('click', load);
load();
