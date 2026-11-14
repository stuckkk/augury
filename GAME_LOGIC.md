# Game logic

The rules as implemented. This file is the source of truth: change it first, then the code
(`src/engine/`). The rules are those of the card game *Wizard*; the app uses its own names
and art (Archmage = Wizard, Fool = Jester, suits Sun/Moon/Star/Comet).

## 1. Cards
60 cards: four suits (Sun, Moon, Star, Comet) with values 1–13, 4 Archmages, 4 Fools.
(`src/engine/cards.ts`)

## 2. Players and rounds
- 3–6 seats; bots may take any seat. Seating order is shuffled when the game starts.
- Round *r* deals *r* cards to every seat. A full game has `60 / players` rounds
  (3 → 20, 4 → 15, 5 → 12, 6 → 10). See §8 for shorter games.
- The first dealer is random; the deal moves one seat clockwise (to the next seat index) each round.

## 3. Trump
After dealing, the next card of the deck is turned up.
- Number card: its suit is trump.
- Fool: no trump this round.
- No card left (the last round of a full game): no trump.
- Archmage: the dealer must name one of the four suits as trump (not "no trump").
  Bidding waits for that choice.

## 4. Bidding
- Starts with the seat left of the dealer and goes clockwise; the dealer bids last.
- Each seat bids 0 … *r* (the number of cards in hand).
- See §8 for the even-out and hidden-bids house rules.

## 5. Play
- The seat left of the dealer leads the first trick; the winner of a trick leads the next.
- A player must follow the **lead suit** if they hold a number card of it. Archmages and Fools
  may always be played, even when holding the lead suit.
- Lead suit: the suit of the first *number* card of the trick, unless an Archmage was played
  before it, in which case there is no lead suit (anything may be played).
  - Fool led: the next number card sets the lead suit.
  - Fool then Archmage: no lead suit.

## 6. Winning a trick (`src/engine/trick.ts`)
1. The first Archmage played.
2. Otherwise the highest trump.
3. Otherwise the highest card of the lead suit.
4. If every card is a Fool, the first Fool.

## 7. Scoring (`src/engine/scoring.ts`)
- Exact bid: 20 + 10 × tricks taken.
- Otherwise: −10 × |bid − tricks|.
- After the last round the highest total wins; equal totals share a place.
- After every round all people at the table confirm ("ready") before the next deal; bots
  confirm immediately. After the last round the game ends without that step.

## 8. House rules (`RuleOptions`, set by the host in the lobby)
| Option | Effect |
|---|---|
| `noEvenBids` | The last bidder (the dealer) may not choose the bid that makes the sum of all bids equal the number of cards dealt this round. If the other bids already exceed it, nothing is forbidden. |
| `evenBidsAllowedThroughRound` = X | With `noEvenBids`: bids may still even out in rounds 1 … X; the restriction applies from round X+1. 0 = from round 1. |
| `hiddenBids` | Everyone bids at once in any order. Others' bids are hidden (only "has bid" is shown) until the last bid is in, then all are revealed and play starts. |
| `blindFirstRound` | In round 1 (one card each) every seat sees all other seats' cards but not its own, and plays its own card unseen. Only round 1. |
| `rounds` | Play this many rounds (1 … full length) instead of the full game. Hand sizes still go 1, 2, 3, … The trump card is turned up as usual in every round (only a full game reaches a round without a trump card). |

## 9. Deviations and decisions
- **Hidden bids + even-out rule:** with hidden bids nobody bids last, so the even-out rule
  cannot apply. Turning on hidden bids switches the even-out rule off (`normalizeOptions`).
  Decision made during implementation, to be confirmed by the owner.
- **Ties:** equal final totals share the win; there is no tie-breaker.

## 10. Bots (`src/engine/bot.ts`)
Bots see exactly what a person in their seat would (`viewFor`). Bidding estimates tricks card
by card (Archmages, high trumps, high plain cards, long trump suits); in the blind round it
tries every unseen card against the visible ones. Playing: win as cheaply as possible while
tricks are still needed, otherwise shed the highest card that still loses.
