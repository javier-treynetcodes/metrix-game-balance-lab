# Métrix — Game Balance Lab

**Balance your game with data, not guesswork.**

Métrix is a balance lab for game designers working in any genre: card games, MOBAs, shooters, strategy, RPGs and board games. Import the catalog of your game (cards, champions, units, weapons, enemies) and Métrix shows you what spreadsheets hide:

- **Clones:** entities that do almost the same thing.
- **Off-curve entities:** too strong or too weak for their cost.
- **Duel outcomes:** who beats whom one-on-one, and how fast.
- **Walls:** entities that some attackers cannot damage at all.

Everything runs locally in your browser. Your data is never uploaded and there is no account to create.


## How to use Métrix

### 1. Get the template *(coming soon)*

Open Métrix and choose **Download template** or **Copy template**. The template is a CSV file with the header and a few invented example rows:

```csv
id,name,category,cost,hp,atk:physical,atk:magic,def:physical,def:magic,rate,tag:role
guardian,Stone Guardian,champion,4800,680,55,0,48,40,0.65,tank
archer,Wind Archer,champion,4500,560,68,0,26,30,0.72,marksman
sorcerer,Eclipse Sorcerer,champion,4600,540,0,85,22,32,0.62,mage
duelist,Arcane Duelist,champion,4700,600,42,38,32,34,0.69,fighter
```

### 2. Fill it with your catalog

Replace the example rows with your entities, one per row. Métrix only accepts CSV files, and the columns must follow the template.

| Column | Required | What to put |
| --- | --- | --- |
| `id` | Yes | A unique identifier without spaces, e.g. `stone-guardian`. |
| `name` | Yes | The display name. |
| `category` | No | A group such as `champion`, `card` or `unit`. |
| `cost` | No | Gold, mana, level… Needed for the cost/power curve. |
| `hp` | No | Health. Needed for duels. |
| `atk:<channel>` | No | Attack on a damage channel, e.g. `atk:physical`. Several channels with values make a mixed attack. |
| `def:<channel>` | No | Defense against that channel. A channel without a `def:` column deals true damage. |
| `rate` | No | Attacks per second or per turn. Defaults to 1. |
| `tag:<name>` | No | Text labels, e.g. `tag:role` with `tank` or `mage`. |
| Any other column | No | Extra numeric stats (speed, range…). |

**Damage channels** are how Métrix models attack and defense in any genre: attack on a channel is only reduced by defense on the same channel. Name them after your game, for example `physical`/`magic` in a MOBA, `ballistic`/`energy` in a shooter, or `combat`/`spell` in a card game.

Tips:

- Wrap text that contains commas in double quotes: `"Archer, the Swift"`.
- Empty `atk:` and `def:` cells count as 0. An empty `cost` or `hp` leaves the entity out of the curve or the duels.
- Files using `;` as separator (common in Spanish or German spreadsheets) are detected automatically, and decimal commas such as `0,65` are accepted.

### 3. Import the file *(coming soon)*

Drag the CSV into Métrix or choose **Import CSV**. Métrix checks the whole file before importing anything:

- **Errors** block the import completely: no data is loaded until every error is fixed. This guarantees that the analysis always covers your full catalog, never a silently incomplete one. All errors are listed at once, each with the lines to fix and how to fix it.
- **Warnings** let the import continue: text columns without the `tag:` prefix are ignored, negative defense counts as 0, entities without `cost` or `hp` are left out of the curve or the duels.

If the file has quote errors, only those are listed, because they shift every following cell. Fix them and import again to see any remaining errors.

See [Cleaning your CSV](#cleaning-your-csv) for every error and its fix.

### 4. Choose how defense works *(coming soon)*

For each channel, pick the rule your game uses to reduce damage:

| Rule | Formula | Typical in |
| --- | --- | --- |
| Percent | attack × 100 / (100 + defense) | MOBAs, action RPGs |
| Subtractive | attack − defense, never below a minimum (0 by default) | Card games, classic RPGs |
| Ratio | attack × attack / defense (defense of at least 1) | Turn-based RPGs |
| None | attack | True damage |

Channels with a `def:` column start as **Percent**; channels without one start as **None**.

### 5. Explore the results *(coming soon)*

- **Galaxy:** a map where similar entities sit close together. Overlapping points are clones; empty areas are design gaps.
- **Cost/power curve:** each entity's power against its cost, with off-curve entities highlighted.
- **Duel matrix:** how long each entity takes to defeat every other one. When an attacker cannot hurt a defender, Métrix says so instead of showing infinity.

## Cleaning your CSV

Most import errors come from how a spreadsheet saved the file. Open the CSV in a plain text editor to see exactly what Métrix reads.

### Structure and quotes

| Error | Example | Fix |
| --- | --- | --- |
| More cells than the header | `archer,Archer, the Swift,4500` | Text that contains the separator must be wrapped in double quotes: `archer,"Archer, the Swift",4500`. |
| Fewer cells than the header | `archer,Wind Archer` when the header has 11 columns | Every row needs one cell per column. Keep the separators of empty cells: `archer,Wind Archer,,,,,,,,,`. |
| Quote never closed | `archer,"Wind Archer,4500` | Add the closing quote: `archer,"Wind Archer",4500`. |
| Quote inside an unquoted value | `cannon,12" Cannon,300` | Wrap the value in quotes and double the inner quote: `cannon,"12"" Cannon",300`. |
| Duplicate column | `hp` and `HP` in the header | Column names are not case-sensitive. Keep one and delete the other. |
| Missing required column | No `id` or `name` in the header | Add the column to the header row, as in the template. |

### Values

| Error | Example | Fix |
| --- | --- | --- |
| Text in a numeric column | `600 hp`, `$1200`, `N/A` | Write plain numbers: `600`, `1200`. Leave the cell empty if there is no value. |
| Negative value | `hp` = `-10` | `hp`, `rate` and attack columns must be 0 or positive. Negative defense is allowed and counts as 0. |
| Missing `id` or `name` | `,Wind Archer,4500` | Every row needs both. |
| Id with spaces | `wind archer` | Use hyphens: `wind-archer`. |
| Duplicate id | Two rows with `archer` | Every id must be unique, e.g. `archer` and `archer-elite`. |

### Saving from a spreadsheet

- Save as **CSV (comma-separated)** or **CSV UTF-8**. Other formats are not supported.
- Spreadsheets in some languages save with `;` and decimal commas (`0,65`). Métrix detects this automatically.
- Remove totals, notes and merged cells: the file must contain only the header row and one row per entity.
- Remove thousands separators before saving: `1,200` splits the row in a comma-separated file, and `1.200` would be read as 1.2. Format numeric columns as plain numbers.

## Privacy

Métrix processes your catalog inside your browser. Nothing is sent to any server, there are no accounts and no tracking cookies.

## Development

See [docs/development.md](docs/development.md).
