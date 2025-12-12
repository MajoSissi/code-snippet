import { defaultPlayers } from './defaultPlayers.js';

const KEY_CUSTOM_PLAYERS = 'customPlayers';
const KEY_EXTERNAL_PLAYER = 'externalPlayer';
const KEY_HAS_INITIALIZED_DEFAULTS = 'hasInitializedDefaults';

export function ensureDefaultPlayersInitialized() {
  const hasInitialized = GM_getValue(KEY_HAS_INITIALIZED_DEFAULTS, false);
  let players = GM_getValue(KEY_CUSTOM_PLAYERS, []);

  if (!hasInitialized && (!Array.isArray(players) || players.length === 0)) {
    players = [...defaultPlayers];
    GM_setValue(KEY_CUSTOM_PLAYERS, players);
    GM_setValue(KEY_HAS_INITIALIZED_DEFAULTS, true);
  }

  return Array.isArray(players) ? players : [];
}

export function loadPlayers() {
  const players = GM_getValue(KEY_CUSTOM_PLAYERS, []);
  return Array.isArray(players) ? players : [];
}

export function savePlayers(players) {
  GM_setValue(KEY_CUSTOM_PLAYERS, Array.isArray(players) ? players : []);
}

export function getExternalPlayer() {
  return GM_getValue(KEY_EXTERNAL_PLAYER, 'MPV');
}

export function setExternalPlayer(name) {
  GM_setValue(KEY_EXTERNAL_PLAYER, name || 'MPV');
}

export function isDefaultPlayerName(name) {
  return defaultPlayers.some((p) => p.name === name);
}

export function resetToDefaultPlayers({
  confirmFn = (msg) => confirm(msg),
  notify = () => {},
  reloadFn = () => location.reload()
} = {}) {
  const ok = confirmFn(
    '确定要恢复默认播放器列表吗？\n这将清除所有自定义播放器并恢复为 MPV、PotPlayer、VLC。'
  );
  if (!ok) return false;

  savePlayers([...defaultPlayers]);
  setExternalPlayer('MPV');
  notify('✅ 已恢复默认播放器列表', 'success');

  setTimeout(() => reloadFn(), 1500);
  return true;
}

export { defaultPlayers };
