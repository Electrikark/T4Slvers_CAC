// Layer 2: wording only. No expected results or engine dependencies.
const demands = {
  GC: 'pay with gift cards today',
  CD: 'read us your verification code today',
  WT: 'send money by wire transfer today',
  RA: 'install remote access software today'
};
// A literal space after {B} keeps wrap variants (B = ".") from forming
// accidental bare domains such as "today.Beware". W is the only SMS wrap.
const asking = {
  WF: 'Chase: Beware of hackers{B} We ask you to{W}{demand}. Visit {LINK}.',
  PC: 'Chase: To avoid fraudsters{B} we ask you to{W}{demand}. Visit {LINK}.',
  RD: 'Chase: Fraud warning{B} Fraudsters may ask you to{W}{demand}. Visit {LINK}.',
  TW: 'Chase: We ask you to{W}{demand}{B} Beware of hackers. Visit {LINK}.'
};
// Bare instructions have no asking verb. RD quotes such an instruction as an
// example; it is still someone else's demand. W precedes the imperative verb.
const bare = {
  WF: 'Chase: Beware of hackers{B} {W}{demand}. Visit {LINK}.',
  PC: 'Chase: To avoid fraudsters{B} {W}{demand}. Visit {LINK}.',
  RD: 'Chase: Fraud warning{B} Fraudsters say: "{W}{demand}." Visit {LINK}.',
  TW: 'Chase: {W}{demand}{B} Beware of hackers. Visit {LINK}.'
};
const templates = Object.fromEntries(Object.entries({ asking, bare }).map(([form, contexts]) =>
  [form, Object.fromEntries(Object.entries(contexts).flatMap(([context, template]) =>
    Object.entries(demands).map(([family, demand]) => [context + '-' + family, template.replace('{demand}', demand)])))]));
const boundaries = { dot: '. ', semi: '; ', colon: ': ', comma: ', ', excl: '! ', none: ' ', lf: '\n', blank: '\n\n', crlf: '\r\n' };
const wraps = { 'wrap-lf': '\n', 'wrap-crlf': '\r\n' };
module.exports = { templates, boundaries, wraps, link: 'https://chase.com' };
