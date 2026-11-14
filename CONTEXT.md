# Vocabulary

| Term | Meaning | Avoid |
|---|---|---|
| **Table / room** | One game server-side, joined by a 5-letter **table code** | lobby id, session |
| **Seat** | A place at the table, held by a person or a **bot**. Seat index = position in play order | player slot |
| **Host** | The seat that sets house rules, adds bots and starts. Moves on if the host leaves | admin, owner |
| **Round** | One deal; round *r* deals *r* cards to each seat | hand (ambiguous) |
| **Dealer** | Deals the round; bids last; moves one seat clockwise each round | |
| **Bid / prophecy** | How many tricks a seat says it will take this round (UI calls it a prophecy) | guess, call |
| **Trick** | One card from every seat; the winner leads the next trick | |
| **Trump** | The suit of the turned-up card (chosen by the dealer if it is an Archmage) | |
| **Archmage** | One of 4 cards that always win a trick (the Wizard of the original game) | wizard (in code) |
| **Fool** | One of 4 cards that always lose (the Jester of the original game) | jester (in code) |
| **Suits** | Sun, Moon, Star, Comet, each 1–13 | colours |
| **House rules** | Optional rule switches in `RuleOptions` | variants, settings |
| **View** | What one seat may see of the game (`GameView`), produced by `viewFor` | state (for the client side) |
