/**
 * @param {{
 *  logInit: () => void,
 *  createSettingsButton: () => void,
 *  isVideoPage: () => boolean,
 *  isVideoListPage: () => boolean,
 *  getVideoUrl: () => string | null,
 *  buttons: {
 *    createDetailButtonGroup: () => void,
 *    handleVideoTeaserHover: () => void,
 *    removeDetailButtonGroup: () => void
 *  }
 * }} deps
 */
export function initApp(deps) {
  const { logInit, createSettingsButton, isVideoPage, isVideoListPage, getVideoUrl, buttons } = deps;

  function init() {
    logInit();

    createSettingsButton();

    let lastUrl = location.href;
    new MutationObserver(() => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        buttons.removeDetailButtonGroup();

        if (isVideoPage()) {
          setTimeout(() => {
            if (getVideoUrl()) buttons.createDetailButtonGroup();
          }, 1000);
        }

        if (isVideoListPage()) {
          setTimeout(buttons.handleVideoTeaserHover, 500);
        }
      }
    }).observe(document, { subtree: true, childList: true });

    const videoObserver = new MutationObserver(() => {
      if (isVideoPage() && getVideoUrl() && !document.getElementById('iwara-mpv-button-group-detail')) {
        buttons.createDetailButtonGroup();
      }
    });

    videoObserver.observe(document.body, { childList: true, subtree: true });

    const listObserver = new MutationObserver(() => {
      if (isVideoListPage()) buttons.handleVideoTeaserHover();
    });

    listObserver.observe(document.body, { childList: true, subtree: true });

    if (isVideoPage() && getVideoUrl()) buttons.createDetailButtonGroup();

    if (isVideoListPage()) {
      setTimeout(() => {
        buttons.handleVideoTeaserHover();
      }, 1000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}
