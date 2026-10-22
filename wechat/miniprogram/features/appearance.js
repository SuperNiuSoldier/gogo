'use strict';
const CHARACTER_ICONS = ['food', 'water', 'pee', 'poop', 'footprints', 'notebook', 'scale', 'pencil', 'image', 'bell'];
const UI_ICONS = ['camera', 'paw', 'plus', 'check', 'circle', 'video', 'moon', 'sun', 'ellipsis', 'arrow-up-right', 'chevron-left', 'chevron-right', 'chevron-down', 'play', 'pause'];
function appearance(preferences) {
  const theme = preferences.theme, skin = preferences.skin || 'rouqiu';
  const characterRoot = '/assets/rouqiu/photo/';
  const genericRoot = '/assets/icons/' + theme + '/';
  const icons = {};
  UI_ICONS.concat(CHARACTER_ICONS).forEach(name => {
    const character = skin === 'rouqiu' && CHARACTER_ICONS.includes(name);
    icons[name] = (character ? characterRoot : genericRoot) + name + (character ? '.webp' : '.svg');
  });
  return { skin, icons, characterRoot,
    // Generated theme artwork is independent of pets and never becomes an album record.
    themeBackground: skin === 'rouqiu' ? characterRoot + 'background.webp' : '',
    themeLogo: characterRoot + (theme === 'dark' ? 'sleep' : 'logo') + '.webp' };
}
module.exports = { appearance, CHARACTER_ICONS };
