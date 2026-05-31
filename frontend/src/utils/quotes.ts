const QUOTES = [
  'The only way to do great work is to love what you do.',
  'In the middle of difficulty lies opportunity.',
  'What we think, we become.',
  'Stay hungry, stay foolish.',
  'Simplicity is the ultimate sophistication.',
  'Think different.',
  'Every moment is a fresh beginning.',
  'Less is more.',
  'Be yourself, everyone else is already taken.',
  'The future belongs to those who believe in their dreams.',
  'Action is the foundational key to all success.',
  'Do what you can, with what you have, where you are.',
  'It always seems impossible until it is done.',
  'Quality is not an act, it is a habit.',
  'Strive not to be a success, but rather to be of value.',
  'The best time to plant a tree was twenty years ago.',
  'We are what we repeatedly do.',
  'Happiness is not something ready made.',
  'Not all those who wander are lost.',
  'To be or not to be, that is the question.',
  'All that glitters is not gold.',
  'Life is what happens when you are busy making other plans.',
  'Time you enjoy wasting is not wasted time.',
  'You must be the change you wish to see in the world.',
  'Imagination is more important than knowledge.',
]

export function randomQuote(): string {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)]
}
