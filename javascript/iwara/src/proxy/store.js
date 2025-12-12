const KEY_PROXY_LIST = 'proxyList';
const KEY_PROXY_TIMEOUT = 'proxyTimeout';

export function loadProxyList() {
  const list = GM_getValue(KEY_PROXY_LIST, []);
  return Array.isArray(list) ? list : [];
}

export function saveProxyList(list) {
  GM_setValue(KEY_PROXY_LIST, Array.isArray(list) ? list : []);
}

export function loadProxyTimeout() {
  const timeout = GM_getValue(KEY_PROXY_TIMEOUT, 10000);
  return typeof timeout === 'number' && Number.isFinite(timeout) ? timeout : 10000;
}

export function saveProxyTimeout(timeoutMs) {
  const n = Number(timeoutMs);
  GM_setValue(KEY_PROXY_TIMEOUT, Number.isFinite(n) ? n : 10000);
}
