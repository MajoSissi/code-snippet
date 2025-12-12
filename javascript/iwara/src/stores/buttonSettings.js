const KEY_BUTTON_SETTINGS = 'buttonSettings';

export const defaultButtonSettings = {
  detailPage: { copy: true, newTab: true, quality: true, play: true },
  listPage: { copy: true, newTab: true, quality: true, play: true }
};

export function loadButtonSettings() {
  const settings = GM_getValue(KEY_BUTTON_SETTINGS, defaultButtonSettings);
  return settings || defaultButtonSettings;
}

export function saveButtonSettings(settings) {
  GM_setValue(KEY_BUTTON_SETTINGS, settings || defaultButtonSettings);
}
