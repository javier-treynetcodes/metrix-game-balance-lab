# Métrix — Game Balance Lab

**Balance your game with data, not guesswork.**

Métrix is a balance lab for game designers working in any genre: card games, MOBAs, shooters, strategy, RPGs and board games. Import the catalog of your game (cards, champions, units, weapons, enemies) and Métrix shows you what spreadsheets hide:

- **Clones:** entities that do almost the same thing.
- **Off-curve entities:** too strong or too weak for their cost.
- **Duel outcomes:** who beats whom one-on-one, and how fast.
- **Walls:** entities that some attackers cannot damage at all.

Everything runs locally in your browser. Your data is never uploaded and there is no account to create.


## How to use Métrix

### 1. Get the template

Open Métrix and choose **Download template** or **Copy template**. To look around before preparing your own file, choose **Try with example data**. The template is a CSV file with the header and a few invented example rows:

```csv
id,name,category,cost,hp,atk:1,def:1,atk:2,def:2,atk:3,def:3,rate,tag:role
heavy,Heavy Unit,unit,4800,680,55,48,0,40,0,20,0.65,tank
ranged,Ranged Unit,unit,4500,560,68,26,0,30,10,15,0.72,ranged
hybrid,Hybrid Unit,unit,4700,600,42,32,38,34,0,25,0.69,hybrid
fast,Fast Unit,unit,4200,480,30,22,0,24,35,10,1.1,striker
```

The template comes with three generic damage channels, `1`, `2` and `3`, each attack next to its defense. Rename them after your game (see [Damage channels](#damage-channels)), and add or remove channels as needed.

### 2. Fill it with your catalog

Replace the example rows with your entities, one per row. Métrix only accepts CSV files, and the columns must follow the template.

| Column | Required | What to put |
| --- | --- | --- |
| `id` | Yes | A unique identifier without spaces, e.g. `heavy-unit`. |
| `name` | Yes | The display name. |
| `category` | No | A group such as `unit`, `card`, `champion` or `weapon`. |
| `cost` | No | Gold, mana, level… Needed for the cost/power curve. |
| `hp` | No | Health. Needed for duels. |
| `atk:<channel>` | No | Attack on a damage channel, e.g. `atk:1` or `atk:plasma`. Several channels with values make a mixed attack. |
| `def:<channel>` | No | Defense against that channel. A channel without a `def:` column deals true damage. |
| `rate` | No | Attacks per second or per turn. Defaults to 1. |
| `tag:<name>` | No | Text labels, e.g. `tag:role` with `tank` or `ranged`, or `tag:faction`. |
| Any other column | No | Extra numeric stats (speed, range…). |

#### Damage channels

Damage channels are how Métrix models attack and defense in any genre: attack on a channel is only reduced by defense on the same channel.

- An entity with values in several channels has a mixed attack.
- A channel with an `atk:` column but no `def:` column deals true damage: nothing reduces it.
- Each channel has its own defense rule (see [step 4](#4-choose-how-defense-works-coming-soon)), so you can mix, for example, flat armor on one channel and percentage resistance on another.

##### Renaming channels

The template uses `1`, `2` and `3` as channel names, shown as "Channel 1", "Channel 2" and "Channel 3". Give them your game's names by editing the column headers: `atk:1` and `def:1` can become `atk:kinetic` and `def:kinetic`, shown as "Kinetic". The name after the colon must be the same in the `atk:` and `def:` columns of a channel.

You can also rename channels from the web, in the **Defense rules** tab, without editing the file. The new name is only used for display.

##### Adding or removing attack and defense types

There is no limit to the number of channels. To add a new type of attack and defense, add a new pair of columns to the header and fill in the values for every row:

```csv
id,name,category,cost,hp,atk:1,def:1,atk:2,def:2,atk:3,def:3,atk:4,def:4,atk:5,def:5,rate,tag:role
```

- Any name works for the new pair: `atk:4`/`def:4`, `atk:sonic`/`def:sonic`…
- Column order does not matter. The template keeps each attack next to its defense only to make the file easier to read.
- To use fewer channels, delete the columns you don't need. A card game may need a single channel.
- Channels come only from the CSV: they cannot be created from the web, because every entity needs its own attack and defense values. To add a type, add its columns to the file and import it again.

Common channels by genre:

| Genre | Typical channels |
| --- | --- |
| MOBA, action RPG | `physical`, `magic` |
| Shooter | `ballistic`, `energy` |
| Sci-fi | `kinetic`, `plasma`, `emp` |
| Strategy | `pierce`, `blunt`, `siege` |
| Card game | `combat`, `spell` |
| RPG | `slash`, `elemental` |
| Tower defense | `ground`, `air` |

Tips:

- Wrap text that contains commas in double quotes: `"Ranged Unit, Elite"`.
- Empty `atk:` and `def:` cells count as 0. An empty `cost` or `hp` leaves the entity out of the curve or the duels.
- Files using `;` as separator (common in Spanish or German spreadsheets) are detected automatically, and decimal commas such as `0,65` are accepted.

### 3. Import the file

Drag the CSV into Métrix or choose **Choose CSV file**. To replace a loaded catalog, choose **Import another file**. Métrix checks the whole file before importing anything:

- **Errors** block the import completely: no data is loaded until every error is fixed. This guarantees that the analysis always covers your full catalog, never a silently incomplete one. All errors are listed at once, each with the lines to fix and how to fix it.
- **Warnings** let the import continue: text columns without the `tag:` prefix are ignored, negative defense counts as 0, entities without `cost` or `hp` are left out of the curve or the duels.

If the file has quote errors, only those are listed, because they shift every following cell. Fix them and import again to see any remaining errors.

See [Cleaning your CSV](#cleaning-your-csv) for every error and its fix.

### 4. Choose how defense works

In the **Defense rules** tab, pick for each channel the rule your game uses to reduce damage. You can also give each channel a display name; your CSV keeps its column names.

| Rule | Formula | Typical in |
| --- | --- | --- |
| Percent | attack × 100 / (100 + defense) | MOBAs, action RPGs |
| Subtractive | attack − defense, never below a minimum (0 by default) | Card games, classic RPGs |
| Ratio | attack × attack / defense (defense of at least 1) | Turn-based RPGs |
| None | attack | True damage |

Channels with a `def:` column start as **Percent**; channels without one start as **None**.

### 5. Explore the results

- **Catalog:** every imported entity in a table you can search and sort.
- **Duels:** how long each entity takes to defeat every other one when both attack at once, who wins each duel and each entity's win–loss record. When an attacker cannot hurt a defender, Métrix says so instead of showing infinity, and the **Walls** list shows which entities some attackers cannot damage at all.
- **Galaxy** *(coming soon)*: a map where similar entities sit close together. Overlapping points are clones; empty areas are design gaps.
- **Cost/power curve** *(coming soon)*: each entity's power against its cost, with off-curve entities highlighted.

## Cleaning your CSV

Most import errors come from how a spreadsheet saved the file. Open the CSV in a plain text editor to see exactly what Métrix reads.

### Structure and quotes

| Error | Example | Fix |
| --- | --- | --- |
| More cells than the header | `ranged,Ranged Unit, Elite,4500` | Text that contains the separator must be wrapped in double quotes: `ranged,"Ranged Unit, Elite",4500`. |
| Fewer cells than the header | `heavy,Heavy Unit` when the header has 13 columns | Every row needs one cell per column. Keep the separators of empty cells: `heavy,Heavy Unit,,,,,,,,,,,`. |
| Quote never closed | `ranged,"Ranged Unit,4500` | Add the closing quote: `ranged,"Ranged Unit",4500`. |
| Quote inside an unquoted value | `cannon,12" Cannon,300` | Wrap the value in quotes and double the inner quote: `cannon,"12"" Cannon",300`. |
| Duplicate column | `hp` and `HP` in the header | Column names are not case-sensitive. Keep one and delete the other. |
| Missing required column | No `id` or `name` in the header | Add the column to the header row, as in the template. |

### Values

| Error | Example | Fix |
| --- | --- | --- |
| Text in a numeric column | `600 hp`, `$1200`, `N/A` | Write plain numbers: `600`, `1200`. Leave the cell empty if there is no value. |
| Negative value | `hp` = `-10` | `hp`, `rate` and attack columns must be 0 or positive. Negative defense is allowed and counts as 0. |
| Missing `id` or `name` | `,Ranged Unit,4500` | Every row needs both. |
| Id with spaces | `ranged unit` | Use hyphens: `ranged-unit`. |
| Duplicate id | Two rows with `ranged` | Every id must be unique, e.g. `ranged` and `ranged-elite`. |

### Saving from a spreadsheet

- Save as **CSV (comma-separated)** or **CSV UTF-8**. Other formats are not supported.
- Spreadsheets in some languages save with `;` and decimal commas (`0,65`). Métrix detects this automatically.
- Remove totals, notes and merged cells: the file must contain only the header row and one row per entity.
- Remove thousands separators before saving: `1,200` splits the row in a comma-separated file, and `1.200` would be read as 1.2. Format numeric columns as plain numbers.

## Privacy

Métrix processes your catalog inside your browser. Nothing is sent to any server, there are no accounts and no tracking cookies. The last imported catalog is kept in your browser's local storage so it survives a reload; **Clear data** removes it.

## Development

See [docs/development.md](docs/development.md).
