// Static Doodle Icons (MIT), with original Go狗 care symbols on the same 48px grid.
// No random distortion, filters or looping motion. All action labels live on buttons.
const letteringMarks = __DOODLE_ICONS__;
const careMarks = {
  bath:'<path d="M7 26C17 25 30 26 41 25M10 26L11 33Q12 38 19 38L31 37Q38 37 39 31L40 26M14 38L13 42M35 38L36 41M12 24L12 12Q12 6 18 7Q23 8 23 13M20 16L26 16M21 20L20 22M26 20L27 22"/>',
  footprints:'<path d="M16 7Q12 6 11 12L10 21Q10 26 15 26Q19 26 20 21L20 12Q20 8 16 7ZM10 30Q14 29 18 31L17 36Q13 39 10 36ZM33 15Q29 15 28 21L27 30Q27 35 32 35Q36 35 37 30L37 21Q37 16 33 15ZM27 39Q32 38 35 40L34 44Q30 46 27 43Z"/>',
  'paw-print':'<path d="M16 28Q23 20 29 26L36 34Q39 41 31 40Q24 37 18 40Q9 42 11 35ZM12 22Q6 24 6 18Q7 13 11 15Q15 17 12 22ZM21 16Q16 18 15 11Q15 5 20 6Q25 9 21 16ZM31 17Q26 17 27 10Q29 4 33 7Q37 12 31 17ZM39 25Q34 24 36 18Q39 13 43 16Q45 22 39 25Z"/>',
  droplet:'<path d="M24 6C21 14 10 22 11 31C12 43 38 44 38 29C38 21 28 13 24 6ZM18 29Q17 34 23 36"/>',
  pee:'<path d="M14 17Q22 15 29 18L33 19Q38 17 39 12M33 19L34 25M14 17L12 10L7 11L7 18L4 20L4 24Q7 27 13 26L14 38L19 38L20 26L28 25M12 10Q17 10 15 18M28 25L34 29L39 24M29 29L28 38L32 38M39 32L38 34M36 38L35 40"/>',
  poop:'<path d="M13 28C7 27 9 21 14 19C12 14 20 14 21 7C27 8 31 13 28 18C36 17 40 23 35 27C43 29 42 39 35 40L12 40C5 39 5 31 13 28ZM14 19Q20 20 28 18M13 28Q24 29 35 27"/>',
  scale:'<path d="M8 10Q22 7 40 10L39 40Q25 42 9 40ZM16 15Q24 12 33 16L30 24L19 24ZM24 21L27 17"/>',
  'cooking-pot':'<path d="M10 21L12 36Q24 40 36 36L39 21ZM7 20Q24 17 42 20M20 15Q19 11 24 11Q30 10 29 15M10 25L5 25L5 31L11 31M39 25L44 25L44 30L38 30"/>',
  'circle-check':'<path d="M36 12C28 4 9 9 8 24C7 38 24 44 36 36Q42 30 40 23M17 23L23 29L39 12"/>',
  pause:'<path d="M15 10L14 39M33 10L34 39"/>'
};
const letteringAliases = {'notebook-text':'image','notebook-pen':'notebook',route:'footprints','calendar-days':'calendar','image-plus':'image','images':'image',video:'camera',droplets:'droplet','chart-no-axes-combined':'gauge','arrow-left-right':'undo','rotate-ccw':'undo','trash-2':'trash','chevrons-up-down':'chevron-down'};
function letteringIcon(name){
  const key=letteringAliases[name]||name;
  const paths=careMarks[key]||letteringMarks[key];
  if(!paths)return `<i data-lucide="${name}" aria-hidden="true"></i>`;
  return `<svg class="doodle-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false" data-icon="${name}">${paths}</svg>`;
}
