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

Open Métrix and choose **Download template** or **Copy template**. To look around before preparing your own file, choose **Try with example data**. The template is a CSV file with the header and one invented example of each kind of attacker:

```csv
id,name,category,cost,hp,atk:1,def:1,atk:2,def:2,atk:hybrid:1,atk:hybrid:2,def:hybrid:1,def:hybrid:2,tag:role
heavy,Heavy Unit,unit,48,680,55,48,0,40,,,10,10,tank
ranged,Ranged Unit,unit,45,560,68,26,0,30,,,,,ranged
caster,Caster Unit,unit,46,520,0,20,62,35,,,,,caster
hybrid,Hybrid Unit,unit,47,600,0,32,0,34,30,25,,,hybrid
fast,Fast Unit,unit,42,480,30,22,0,24,,,,,striker
```

### 2. Fill it with your catalog

Replace the example rows with your entities, one per row. **Every game value is a whole number of 0 or more**: no decimals, percentages or units.

| Column | Required | What to put |
| --- | --- | --- |
| `id` | Yes | A unique identifier without spaces, e.g. `heavy-unit`. |
| `name` | Yes | The display name. |
| `category` | No | A group such as `unit`, `card`, `champion` or `weapon`. |
| `cost` | No | Gold, mana, level… |
| `hp` | No | Health, at least 1. Needed to count hits to defeat. |
| `atk:<channel>` | No | Attack on one channel. An entity attacks on one channel only. |
| `def:<channel>` | No | Defense on that channel. |
| `atk:hybrid:<channel>` | No | Hybrid attack: one column per channel, both filled for hybrid attackers. |
| `def:hybrid:<channel>` | No | Hybrid armor: extra defense on that channel that only works against hybrid attacks. |
| `tag:<name>` | No | Text labels, e.g. `tag:role` with `tank` or `ranged`. |
| Any other column | No | Extra whole-number stats (speed, range…). Other columns are kept as they are and exported back untouched. |

#### How damage works

Métrix uses only whole-number additions and subtractions:

1. **Every entity deals one kind of damage:** channel 1, channel 2 or hybrid, or none at all. A hybrid attacker deals no single-channel attack.
2. **Damage = attack − defense of the same channel**, never below 0. Channel 1 defense does nothing against channel 2 attacks.
3. **No defense on a channel = full damage** on that channel.
4. **Hybrid attacks hit both channels at once.** Each part faces that channel's defense plus the defender's hybrid armor on that channel; the results are added together.

```
Hybrid attacker: atk:hybrid:1 = 30 · atk:hybrid:2 = 25
Defender: def:1 = 20 · def:2 = 0 · def:hybrid:1 = 10 · def:hybrid:2 = 5

Channel 1: 30 − (20 + 10) = 0
Channel 2: 25 − (0 + 5)   = 20
Per hit:   0 + 20         = 20
```

#### Damage channels

Métrix works with **two damage channels plus hybrid**. The template names them `1` and `2`, shown as "Channel 1" and "Channel 2". Give them your game's names by editing the column headers (`atk:1` → `atk:physical`, `atk:hybrid:1` → `atk:hybrid:physical`…), or rename them in the **Damage rules** tab: the exported CSV uses the new names.

| Genre | Typical channels |
| --- | --- |
| MOBA, action RPG | `physical`, `magic` |
| Shooter | `ballistic`, `energy` |
| Card game | `combat`, `spell` |
| Strategy | `melee`, `ranged` |
| Tower defense | `ground`, `air` |

Tips:

- Wrap text that contains commas in double quotes: `"Ranged Unit, Elite"`.
- Empty `atk:` and `def:` cells count as 0. Leave hybrid cells empty for entities that are not hybrid.
- Files using `;` or tabs as separator are detected automatically.

### 3. Import the file

Drag the CSV into Métrix or choose **Choose CSV file**. To replace a loaded catalog, choose **Import another file**. Métrix checks the whole file before importing anything:

- **Errors** block the import completely: no data is loaded until every error is fixed. All errors are listed at once, each with the lines to fix and how to fix it.
- **Warnings** let the import continue: columns Métrix does not analyze are kept as they are, and entities without `hp` cannot be defeated.

If the file has quote errors, only those are listed, because they shift every following cell. Fix them and import again to see any remaining errors.

### 4. Choose your genre

After importing, tell Métrix what kind of game it is. The genre decides which measure ranks duels and how results are explained; your data and the damage rules never change, and you can switch genre at any time.

| Genre | Duels ranked by |
| --- | --- |
| Card game | Trade |
| Shooter | Shots to defeat |
| Turn-based RPG | Hits to defeat |
| MOBA / Action | Hits to defeat |
| Board game | Trade |
| Other | Your choice |

The four measures, all whole numbers:

- **Hits to defeat:** how many hits (shots, attacks) one entity needs to bring the other to 0 hp. Fewer wins; the same number is a draw.
- **Damage per hit:** damage of one hit after the defender's defense. More wins.
- **Trade:** damage dealt minus damage received when both hit once. Positive wins.
- **Damage blocked:** how much of an attack the defense stops. It describes armor and names no winner.

### 5. Work with your catalog

- **Catalog:** click any value to edit it, change an entity's kind of attack, and add, duplicate or delete entities. Changes are highlighted, can be undone (Ctrl/Cmd+Z) and reverted all at once. New columns are added in the file, from the template.
- **Damage rules:** how damage works, your channel names, and which entities some attacks hit in full.
- **Duels:** every entity against every other one, ranked by the genre's measure or the one you pick, with each entity's win–loss record. Close fights are marked, and **Walls** lists the entities some attackers cannot damage at all, with the reason.
- **Versus:** pick two entities and see who is stronger, why, and the subtraction behind every hit. Use − and + to try changes and **Apply to catalog** when you like them.
- **Export CSV:** download your catalog as you left it in Métrix, with the same columns, order and separator as your file, ready to import again.
- **Galaxy** and **cost/power curve** *(coming soon)*.

## Cleaning your CSV

Most import errors come from how a spreadsheet saved the file. Open the CSV in a plain text editor to see exactly what Métrix reads.

### Structure and quotes

| Error | Example | Fix |
| --- | --- | --- |
| More cells than the header | `ranged,Ranged Unit, Elite,45` | Text that contains the separator must be wrapped in double quotes: `ranged,"Ranged Unit, Elite",45`. |
| Fewer cells than the header | `heavy,Heavy Unit` when the header has 14 columns | Every row needs one cell per column. Keep the separators of empty cells. |
| Quote never closed | `ranged,"Ranged Unit,45` | Add the closing quote: `ranged,"Ranged Unit",45`. |
| Quote inside an unquoted value | `cannon,12" Cannon,30` | Wrap the value in quotes and double the inner quote: `cannon,"12"" Cannon",30`. |
| Duplicate column | `hp` and `HP` in the header | Column names are not case-sensitive. Keep one and delete the other. |
| Missing required column | No `id` or `name` in the header | Add the column to the header row, as in the template. |
| More than two channels | `atk:1`, `atk:2` and `atk:3` | Keep two channels. Attacks that hit both become hybrid: `atk:hybrid:1` and `atk:hybrid:2`. |
| Incomplete hybrid columns | `atk:hybrid:1` without `atk:hybrid:2` | Hybrid attacks need one column per channel. |

### Values

| Error | Example | Fix |
| --- | --- | --- |
| Not a whole number | `48.5`, `600 hp`, `-10`, `N/A` | Write whole numbers of 0 or more: `48`, `600`. Leave the cell empty if there is no value. |
| More than one kind of attack | `atk:1` = 55 and `atk:2` = 20 | An entity deals one kind of damage. To hit both channels, use the hybrid columns and leave `atk:1` and `atk:2` at 0. |
| Incomplete hybrid attack | `atk:hybrid:1` = 30, `atk:hybrid:2` empty | Fill both; write 0 for a channel it does not hit. |
| HP of 0 | `hp` = `0` | HP must be at least 1. Leave it empty if the entity cannot be defeated. |
| Missing `id` or `name` | `,Ranged Unit,45` | Every row needs both. |
| Id with spaces | `ranged unit` | Use hyphens: `ranged-unit`. |
| Duplicate id | Two rows with `ranged` | Every id must be unique, e.g. `ranged` and `ranged-elite`. |

### Saving from a spreadsheet

- Save as **CSV (comma-separated)** or **CSV UTF-8**. Other formats are not supported.
- Remove totals, notes and merged cells: the file must contain only the header row and one row per entity.
- Remove thousands separators before saving (`1,200` → `1200`): format numeric columns as plain numbers.

## Privacy

Métrix processes your catalog inside your browser. Nothing is sent to any server, there are no accounts and no tracking cookies. The last imported catalog, with your edits, is kept in your browser's local storage so it survives a reload; **Clear data** removes it.

## Development

See [docs/development.md](docs/development.md).
