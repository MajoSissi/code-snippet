let notificationContainer = null;
const activeNotifications = new Set();

/**
 * @param {() => Array<{url: string, enabled: boolean}>} getProxyList
 */
export function createNotifier(getProxyList) {
  /** @param {string} message */
  function withProxyHint(message) {
    try {
      const enabledProxies = (getProxyList?.() || []).filter((p) => p?.enabled);
      if (!enabledProxies.length) return message;
      const currentProxy = enabledProxies[Math.floor(Math.random() * enabledProxies.length)];
      const hostname = new URL(currentProxy.url).hostname;
      return `${message}\n🔗 当前代理: ${hostname}`;
    } catch {
      return message;
    }
  }

  /**
   * @param {string} message
   * @param {'info'|'success'|'error'} [type]
   */
  function notify(message, type = 'info') {
    message = withProxyHint(message);

    const styles = {
      error: {
        bg: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
        glow: 'rgba(255, 107, 107, 0.5)',
        glowStrong: 'rgba(255, 107, 107, 0.8)'
      },
      success: {
        bg: 'linear-gradient(135deg, #51cf66 0%, #37b24d 100%)',
        glow: 'rgba(81, 207, 102, 0.5)',
        glowStrong: 'rgba(81, 207, 102, 0.8)'
      },
      info: {
        bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        glow: 'rgba(102, 126, 234, 0.5)',
        glowStrong: 'rgba(102, 126, 234, 0.8)'
      }
    };

    if (!notificationContainer) {
      notificationContainer = document.createElement('div');
      notificationContainer.id = 'iwara-notification-container';
      notificationContainer.style.cssText = [
        'position: fixed',
        'top: 20px',
        'right: 20px',
        'z-index: 9999999',
        'display: flex',
        'flex-direction: column',
        'gap: 12px',
        'pointer-events: none'
      ].join(';');
      document.body.appendChild(notificationContainer);

      if (!document.getElementById('iwara-notification-styles')) {
        const globalStyles = document.createElement('style');
        globalStyles.id = 'iwara-notification-styles';
        globalStyles.textContent = `
          @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
          @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        `;
        document.head.appendChild(globalStyles);
      }
    }

    const style = styles[type] || styles.info;
    const notification = document.createElement('div');
    notification.className = 'iwara-notification-item';
    notification.style.cssText = [
      'padding: 16px 24px',
      `background: ${style.bg}`,
      'color: white',
      'border-radius: 12px',
      `box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 20px ${style.glow}`,
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'font-size: 14px',
      'font-weight: 600',
      'border: 2px solid rgba(255, 255, 255, 0.3)',
      'animation: slideInRight 0.3s ease',
      'white-space: pre-line',
      'pointer-events: auto',
      'transition: transform 0.3s ease, opacity 0.3s ease'
    ].join(';');

    const pulseId = `pulse-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes ${pulseId} {
        0%, 100% { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 20px ${style.glow}; }
        50% { box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 30px ${style.glowStrong}, 0 0 10px rgba(255, 255, 255, 0.5); }
      }
    `;
    notification.appendChild(styleSheet);
    notification.style.animation += `, ${pulseId} 1.5s ease-in-out infinite`;

    notification.textContent = message;
    notificationContainer.appendChild(notification);
    activeNotifications.add(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => {
        activeNotifications.delete(notification);
        notification.remove();
        if (activeNotifications.size === 0 && notificationContainer) {
          notificationContainer.remove();
          notificationContainer = null;
        }
      }, 300);
    }, 3000);
  }

  return notify;
}
