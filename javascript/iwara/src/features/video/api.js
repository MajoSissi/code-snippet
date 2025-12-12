import pako from 'pako';

function compress(str) {
  return btoa(String.fromCharCode(...pako.gzip(str)));
}

async function hashStringSHA1(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {{
 *  getCurrentProxyPrefix: () => string,
 *  getProxiedUrl: (url: string) => string,
 *  getExternalPlayer: () => string,
 *  getPlayers: () => Array<any>,
 *  getVideoQuality: () => string,
 *  notify: (msg: string, type?: 'info'|'success'|'error') => void,
 *  svgIcons: Record<string,string>
 * }} deps
 */
export function createVideoApi(deps) {
  const {
    getCurrentProxyPrefix,
    getProxiedUrl,
    getExternalPlayer,
    getPlayers,
    getVideoQuality,
    notify,
    svgIcons
  } = deps;

  const createSVGIcon = (iconName) => {
    const pathData = svgIcons?.[iconName];
    if (!pathData) return '';
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${pathData}</svg>`;
  };

  const createButton = (className, title, content, onClick) => {
    const button = document.createElement('button');
    button.className = className;
    button.title = title;
    button.innerHTML = typeof content === 'string' && svgIcons?.[content] ? createSVGIcon(content) : content;
    if (onClick) button.addEventListener('click', onClick);
    return button;
  };

  async function getVideoLinkById(videoId, quality = null) {
    const proxyPrefix = getCurrentProxyPrefix();

    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const apiUrl = `${proxyPrefix}https://api.iwara.tv/video/${videoId}`;
    const infoResponse = await fetch(apiUrl, { headers });
    if (!infoResponse.ok) throw new Error('获取视频信息失败');
    const info = await infoResponse.json();

    if (!info.file) throw new Error('视频文件不存在');

    const fileUrl = new URL(info.fileUrl);
    const fileId = info.file.id;
    const expires = fileUrl.searchParams.get('expires');
    const hash = fileUrl.searchParams.get('hash');

    const xVersion = await hashStringSHA1(`${fileId}_${expires}_5nFp9kmbNnHdAFhaqMvt`);

    const resourceUrl = `${proxyPrefix}https://files.iwara.tv${fileUrl.pathname}?expires=${expires}&hash=${hash}`;
    const resourceHeaders = { 'X-Version': xVersion };
    if (token) resourceHeaders['Authorization'] = `Bearer ${token}`;

    const resourceResponse = await fetch(resourceUrl, { headers: resourceHeaders });
    if (!resourceResponse.ok) throw new Error('获取视频资源失败');
    const resources = await resourceResponse.json();

    const targetQuality = quality || getVideoQuality();

    let video = resources.find((v) => v.name === targetQuality);
    if (!video && targetQuality) {
      video = resources.find((v) => v.name.includes(targetQuality) || targetQuality.includes(v.name));
    }
    if (!video) video = resources.find((v) => v.name === 'Source') || resources[0];

    const finalUrl = 'https:' + video.src.view;
    return { url: finalUrl, title: info.title, quality: video.name };
  }

  function getVideoUrl() {
    const videoElement = document.querySelector(
      '#vjs_video_3_html5_api, [id^="vjs_video_"][id$="_html5_api"], video.vjs-tech, video[src]'
    );
    if (videoElement && videoElement.src) return videoElement.src;
    console.warn('%c[Iwara Player] 未找到视频源', 'color: #ff6b6b; font-weight: bold;');
    return null;
  }

  function getVideoTitle() {
    const titleElement = document.querySelector('h1.text-xl, h1[class*="title"], .page-video__details h1, h1');
    return titleElement ? titleElement.innerText.trim() : document.title;
  }

  function getVideoIdFromUrl() {
    const match = window.location.pathname.match(/\/video\/([^\/]+)/);
    return match ? match[1] : null;
  }

  function getPlayerProtocolUrl(playerName, videoUrl, videoTitle) {
    const player = (getPlayers() || []).find((p) => p.name === playerName);

    const replaceParams = (text) =>
      String(text)
        .replace(/\$\{title\}/g, videoTitle)
        .replace(/\$\{url\}/g, videoUrl)
        .replace(/\$\{url:base64\}/g, btoa(videoUrl))
        .replace(/\$\{url:encode\}/g, encodeURIComponent(videoUrl));

    if (!player) {
      const defaultArgs = [`\"${videoUrl}\"`, `--force-media-title=\"${videoTitle}\"`, '--ontop'];
      return `ush://MPV?${compress(defaultArgs.join(' '))}`;
    }

    if (player.type === 'protocol') {
      return replaceParams(player.protocol || '');
    }

    if (player.type === 'ush') {
      let args = player.args || [`\"${videoUrl}\"`];
      args = args.map((a) => replaceParams(a));
      return `ush://${player.appName}?${compress(args.join(' '))}`;
    }

    const defaultArgs = [`\"${videoUrl}\"`, `--force-media-title=\"${videoTitle}\"`, '--ontop'];
    return `ush://MPV?${compress(defaultArgs.join(' '))}`;
  }

  function playWithExternalPlayer() {
    const videoUrl = getVideoUrl();
    if (!videoUrl) {
      notify('❌ 未找到视频源\n请确保视频已加载', 'error');
      return;
    }

    const finalUrl = getProxiedUrl(videoUrl);
    const videoTitle = getVideoTitle();
    const externalPlayer = getExternalPlayer();
    const protocolUrl = getPlayerProtocolUrl(externalPlayer, finalUrl, videoTitle);

    try {
      console.log(
        '%c[Iwara Player] 播放信息',
        'color: #667eea; font-weight: bold;',
        '\n标题:',
        videoTitle,
        '\n播放器:',
        externalPlayer,
        '\n画质: 当前网页画质',
        '\nURL:',
        finalUrl
      );

      notify(`🎬 调用 ${externalPlayer} 播放器\n📸 画质: 当前网页画质`, 'info');
      window.open(protocolUrl, '_self');
    } catch (error) {
      console.error('[Iwara Player] 调用失败:', error);
      notify(`❌ 启动 ${externalPlayer} 失败\n请确保已安装并正确配置协议`, 'error');
    }
  }

  async function playVideoById(videoId, videoTitle, quality = null) {
    try {
      notify('🔄 正在获取视频链接...', 'info');
      const { url, title, quality: actualQuality } = await getVideoLinkById(videoId, quality);
      const finalUrl = getProxiedUrl(url);
      const finalTitle = videoTitle || title;
      const externalPlayer = getExternalPlayer();

      console.log(
        '%c[Iwara Player] 播放信息',
        'color: #667eea; font-weight: bold;',
        '\n视频ID:',
        videoId,
        '\n标题:',
        finalTitle,
        '\n播放器:',
        externalPlayer,
        '\n画质:',
        actualQuality,
        '\nURL:',
        finalUrl
      );

      notify(`🎬 调用 ${externalPlayer} 播放器\n📸 画质: ${actualQuality}`, 'info');
      const protocolUrl = getPlayerProtocolUrl(externalPlayer, finalUrl, finalTitle);
      window.open(protocolUrl, '_self');
    } catch (error) {
      console.error('[Iwara Player] 播放失败:', error);
      notify(`❌ 获取视频链接失败\n${error?.message || error}`, 'error');
    }
  }

  return {
    createButton,
    getVideoLinkById,
    getVideoUrl,
    getVideoTitle,
    getVideoIdFromUrl,
    getPlayerProtocolUrl,
    playWithExternalPlayer,
    playVideoById
  };
}
