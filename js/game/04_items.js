// ===================== personas / effects / items / jobs =====================
const PERSONAS = [
  { name: '냉소적 방관자', color: '#55FFFF', rgb: [.33, 1, 1], snd: 'bcfirst3b' },
  { name: '공격적 반항자', color: '#FF5555', rgb: [1, .33, .33], snd: 'bctwo3b' },
  { name: '냉정한 비판자', color: '#FF55FF', rgb: [1, .33, 1], snd: 'bcthree3b' },
  { name: '감정 억제형 피해자', color: '#55FF55', rgb: [.33, 1, .33], snd: 'bcfour3b' },
  { name: '비씨 GPT', color: '#FFFF55', rgb: [1, 1, .33], snd: 'bcgpt' },
];
const EFF = {
  speed: ['신속', '#7CAFC6'], slowness: ['구속', '#5A6C81'], strength: ['힘', '#932423'], weakness: ['나약함', '#484D48'],
  resistance: ['저항', '#99453A'], regeneration: ['재생', '#CD5CAB'], poison: ['독', '#4E9331'], glowing: ['발광', '#94A061'],
  jump_boost: ['점프 강화', '#22FF4C'], slow_falling: ['느린 낙하', '#FFEFD1'], health_boost: ['생명력 강화', '#F87D23'], fire_resistance: ['화염 저항', '#E49A3A'],
};
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const roman = a => a < 15 ? ROMAN[a] : String(a + 1);

// item: name, icon, dmg (total attack damage incl. base 1), spd (attack speed), kb (knockback ench), sharp, reach(+%), use, cd, group, cast, consume
const ITEMS = {
  fist: { name: '맨손', icon: '✊', dmg: 1, spd: 4 },
  stone_sword: { name: '돌 검', icon: '🗡️', dmg: 5, spd: 1.6, sword: true, col: [.55, .55, .55] },
  iron_sword: { name: '철 검', icon: '🗡️', dmg: 6, spd: 1.6, sword: true, col: [.85, .85, .85] },
  bow: { name: '활', icon: '🏹', use: 'bow', col: [.5, .35, .2] },
  arrow: { name: '화살', icon: '➶', stack: true },
  shield: { name: '방패', icon: '🛡️', use: 'shield', col: [.6, .45, .3] },
  dia_sword: { name: '다이아몬드 검', icon: '🗡️', dmg: 7, spd: 1.6, sharp: 1, sweep: 2, sword: true, stack: true, col: [.35, .9, .9] },
};
// armor: [points, toughness, color]
const ARMOR = { iron: [15, 0, [.8, .8, .82]], chain: [12, 0, [.45, .45, .5]], leather: [6, 0, [.227, .702, .855]] };
const JOBS = {}; // 직업 정의: 직업마다 js/jobs/<직업>.js 가 JOBS.<id> = {...} 로 넣는다
// 직업별 봇 행동: js/jobs/<직업>.js 가 BOT_JOB.<id> = (b, I, ai, t, dist, r, wantYaw) => {...} 로 넣는다 (08_bot.js botDecide가 부름)
const BOT_JOB = {};
// 개발 도구로 만든 내장 직업: js/jobs/<직업>.js 중 tools/mkmodjobs.py가 만든 것들이 BUILTIN_JOBS.push({file, code, snd}) (11f_upload.js BUILTIN.load가 모드 API로 불러옴)
const BUILTIN_JOBS = [];
// 직업별 이벤트 훅: js/jobs/<직업>.js 가 JOB_HOOK.<id> = { tick(p), hit(p, t, dmg), hurt(p, a, src), kill(p, victim, pos), death(p), respawn(p) } 로 넣는다
// (모드 API의 tick/hit/hurt/kill/death/respawn과 같은 자리에서 불림: 05_player.js, 09_game.js)
const JOB_HOOK = {};
function jobHook(p, ev, ...a) { const H = JOB_HOOK[p.job], f = H && H[ev]; if (f) f(p, ...a); }
const JOB_ORDER = ['rusher', 'policer', 'spider', '360', 'ice_wizard', 'randomizer', 'suno', 'mefab3', 'slime', 'viggle', 'summoner', 'seryong', 'ai', 'bilcorner', 'dude', 'jemwenti', 'yuntomman', 'susu'];
function mkSlot(id, count = 1) { return { id, count }; }
