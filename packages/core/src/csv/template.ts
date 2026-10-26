/**
 * @file Official CSV template offered for download in the app.
 */

/**
 * Official CSV template: header plus invented, genre-neutral example rows, one per kind of attacker.
 * Two damage channels, 1 and 2, plus hybrid columns.
 *
 * The example is deliberately balanced as rock-paper-scissors so it teaches how to read results:
 * - Heavy stands up to channel 1 attacks but falls to channel 2; Warden is its mirror and also
 *   wears hybrid armor.
 * - Ranged and Fast attack on channel 1, Caster on channel 2, Hybrid punishes one-sided armor.
 * - Every unit wins some duels and loses others; Fast is the cheapest and has the worst record.
 * - Warden vs Heavy and Caster vs Hybrid are close fights (one hit apart). Users rename the channels after their game
 * (e.g. `atk:physical`). Every value is a whole number. Offered in the web app to download or copy.
 */
export const CSV_TEMPLATE = [
  'id,name,category,cost,hp,atk:1,def:1,atk:2,def:2,atk:hybrid:1,atk:hybrid:2,def:hybrid:1,def:hybrid:2,tag:role',
  'heavy,Heavy Unit,unit,48,620,34,32,0,8,,,,,tank',
  'ranged,Ranged Unit,unit,45,420,48,12,0,14,,,,,ranged',
  'caster,Caster Unit,unit,46,420,0,12,46,26,,,,,caster',
  'hybrid,Hybrid Unit,unit,47,460,0,16,0,16,30,34,,,hybrid',
  'fast,Fast Unit,unit,40,390,46,10,0,14,,,,,striker',
  'warden,Warden Unit,unit,49,600,0,8,36,32,,,10,10,guardian',
  '',
].join('\n');

/** File name suggested when the template is downloaded. */
export const CSV_TEMPLATE_FILE_NAME = 'metrix-template.csv';
