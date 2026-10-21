// Written against the USA Pickleball Official Rulebook fundamentals.
// Re-check before launch and whenever the rulebook is updated (usually each January).
export const CONTENT_REVIEWED = 'October 2026'

export interface RuleSection {
  id: string
  title: string
  points: string[]
}

export const rules: RuleSection[] = [
  {
    id: 'court',
    title: 'The court',
    points: [
      'The court is 20 ft wide and 44 ft long (about 6.1 m × 13.4 m) for both singles and doubles.',
      'The net is 36 in high at the sidelines and 34 in at the centre.',
      'The non-volley zone ("the kitchen") extends 7 ft from the net on each side. Its lines are part of the zone.',
      'Behind the kitchen, each side is split into a right and left service court by the centreline.',
    ],
  },
  {
    id: 'serve',
    title: 'Serving',
    points: [
      'Serve diagonally, cross-court. The serve must clear the kitchen and land in the diagonal service court.',
      'A serve that lands on the kitchen line is a fault. Landing on the centreline, sideline or baseline is in.',
      'When you serve, at least one foot must be behind the baseline, and neither foot may touch the court or the baseline. Stay between the imaginary extensions of the centreline and sideline.',
      'Volley serve: hit with an upward arc, contacting the ball below your waist, with the paddle head below your wrist.',
      'Drop serve: drop the ball from your hand (no toss or throw), let it bounce, then hit it. The volley-serve motion rules don’t apply.',
      'You get one serve attempt. A serve that clips the net and lands in the correct court is in play - there are no service lets.',
      'Serve within 10 seconds after the score is called.',
    ],
  },
  {
    id: 'two-bounce',
    title: 'Two-bounce rule',
    points: [
      'The receiving side must let the serve bounce before returning it.',
      'The serving side must let the return bounce before hitting it.',
      'After those two bounces, either side may volley (hit before the bounce) or play off the bounce.',
    ],
  },
  {
    id: 'scoring',
    title: 'Scoring',
    points: [
      'Standard games use side-out scoring: only the serving side can score a point.',
      'Games are usually played to 11, win by 2. Tournaments may use 15 or 21.',
      'Doubles score is called as three numbers: server’s score, receiver’s score, server number (1 or 2). Example: “4-2-1”.',
      'Each partner serves before a side out, except at the start of the game: the first serving side gets only one server, so the game starts at “0-0-2”.',
      'After winning a point, the server switches sides with their partner and serves from the other court.',
      'In singles, serve from the right when your score is even and from the left when it is odd. The score is two numbers.',
    ],
  },
  {
    id: 'kitchen',
    title: 'Non-volley zone (kitchen)',
    points: [
      'You may not volley while touching the kitchen or its line - with your feet, paddle, or anything you are wearing or carrying.',
      'If your momentum after a volley carries you into the kitchen, it is a fault, even if the ball is already dead.',
      'You may step into the kitchen at any time to play a ball that has bounced. Get both feet out before volleying again.',
      'You can stand in the kitchen as long as you like when you are not volleying.',
    ],
  },
  {
    id: 'faults',
    title: 'Common faults',
    points: [
      'Hitting the ball into the net or out of bounds.',
      'Volleying before the two-bounce rule allows it.',
      'Volleying from the kitchen or falling into it after a volley.',
      'The ball touching you or your clothing (other than your paddle hand below the wrist).',
      'Touching the net, net post or the opponent’s court with your body or paddle while the ball is in play.',
      'Letting the ball bounce twice on your side.',
      'A serve that lands in the wrong court, in the kitchen, or on the kitchen line.',
    ],
  },
  {
    id: 'lines',
    title: 'Line calls & etiquette',
    points: [
      'A ball touching any line is in - except the kitchen line on a serve.',
      'Each side calls the lines on its own side of the net. If you aren’t sure, the ball is in.',
      'Call the score clearly before every serve.',
      'Tap paddles at the net after the game.',
    ],
  },
  {
    id: 'terms',
    title: 'Terms to know',
    points: [
      'Dink - a soft shot that lands in the opponent’s kitchen.',
      'Volley - hitting the ball before it bounces.',
      'Third-shot drop - the serving side’s soft shot after the return, used to get to the kitchen line.',
      'Side out - the serve passes to the other side.',
      'Erne - a volley hit from outside the court beside the kitchen after jumping or moving around it; legal if you don’t touch the kitchen.',
      'ATP (around the post) - a shot that goes around the net post instead of over the net; it’s legal.',
      'Rally - the exchange from the serve until a fault.',
    ],
  },
]

export interface Question {
  q: string
  options: string[]
  answer: number
  why: string
}

export const quiz: Question[] = [
  { q: 'How far does the non-volley zone extend from the net?', options: ['5 feet', '7 feet', '10 feet', '14 feet'], answer: 1, why: 'The kitchen is 7 ft deep on each side of the net.' },
  { q: 'A serve lands on the kitchen line. What is the call?', options: ['In - lines are always in', 'Fault', 'Replay the serve', 'In, if it was a drop serve'], answer: 1, why: 'On a serve, the kitchen line counts as part of the kitchen, so it is a fault.' },
  { q: 'A serve clips the top of the net and lands in the correct service court. What happens?', options: ['Replay it (let)', 'It’s a fault', 'The ball is in play', 'The receiver chooses'], answer: 2, why: 'Service lets were removed; a net serve that lands in the correct court is live.' },
  { q: 'After the serve, who must let the ball bounce?', options: ['Only the receiver', 'Only the server', 'Both the receiving side (on the serve) and the serving side (on the return)', 'Nobody'], answer: 2, why: 'The two-bounce rule: the serve and the return must each bounce once.' },
  { q: 'In standard side-out scoring, who can score a point?', options: ['Either side', 'Only the serving side', 'Only the receiving side', 'Whoever hits the winner'], answer: 1, why: 'Only the serving side scores. The receiving side wins the serve back with a side out.' },
  { q: 'What score is called at the very start of a doubles game?', options: ['0-0', '0-0-1', '0-0-2', '0-0-0'], answer: 2, why: 'The first serving side gets only one server, so play starts at 0-0-2.' },
  { q: 'In singles, your score is 7. Where do you serve from?', options: ['Right court', 'Left court', 'Either', 'Wherever you served last'], answer: 1, why: 'Odd score: serve from the left. Even score: serve from the right.' },
  { q: 'You volley at the kitchen line and your momentum carries you into the kitchen after the ball is dead. Is that a fault?', options: ['No - the ball was already dead', 'Yes', 'Only if you touch the net', 'Only in tournaments'], answer: 1, why: 'Momentum from a volley into the kitchen is a fault even after the rally ends.' },
  { q: 'Can you step into the kitchen to hit a ball that has bounced?', options: ['Never', 'Yes, at any time', 'Only on the return of serve', 'Only in singles'], answer: 1, why: 'The restriction is on volleying. You may enter to play a bounced ball.' },
  { q: 'Your doubles team wins a point while serving. What does the server do?', options: ['Stays in the same court', 'Switches sides with their partner and serves again', 'Hands the serve to the partner', 'Serve passes to the other team'], answer: 1, why: 'After scoring, the server switches courts with their partner and continues serving.' },
  { q: 'For a volley serve, where must the ball be contacted?', options: ['Above the shoulder', 'Below the waist', 'At any height', 'Above the head'], answer: 1, why: 'A volley serve is hit with an upward arc, below the waist, with the paddle head below the wrist.' },
  { q: 'A ball lands on the baseline during a rally. What is the call?', options: ['Out', 'In', 'Replay', 'Fault on the hitter'], answer: 1, why: 'A ball touching any line is in, except the kitchen line on a serve.' },
  { q: 'You aren’t sure whether a ball on your side was in or out. What should you do?', options: ['Call it out', 'Replay the point', 'Call it in', 'Ask the spectators'], answer: 2, why: 'If you can’t clearly see it out, the ball is in.' },
  { q: 'How many serve attempts does a server get?', options: ['One', 'Two', 'Three', 'Unlimited until it lands'], answer: 0, why: 'There is one serve attempt per rally.' },
  { q: 'A shot travels around the net post, below net height, and lands in. Is it legal?', options: ['No - it must go over the net', 'Yes', 'Only in doubles', 'Only if it bounces first'], answer: 1, why: 'An around-the-post (ATP) shot is legal.' },
]
