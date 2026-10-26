/**
 * @file Official CSV template offered for download in the app.
 */

/**
 * Official CSV template: header plus invented, genre-neutral example rows, one per kind of attacker.
 * Two damage channels, 1 and 2, plus hybrid columns. Users rename the channels after their game
 * (e.g. `atk:physical`). Every value is a whole number. Offered in the web app to download or copy.
 */
export const CSV_TEMPLATE = [
  'id,name,category,cost,hp,atk:1,def:1,atk:2,def:2,atk:hybrid:1,atk:hybrid:2,def:hybrid:1,def:hybrid:2,tag:role',
  'heavy,Heavy Unit,unit,48,680,55,48,0,40,,,10,10,tank',
  'ranged,Ranged Unit,unit,45,560,68,26,0,30,,,,,ranged',
  'caster,Caster Unit,unit,46,520,0,20,62,35,,,,,caster',
  'hybrid,Hybrid Unit,unit,47,600,0,32,0,34,30,25,,,hybrid',
  'fast,Fast Unit,unit,42,480,30,22,0,24,,,,,striker',
  '',
].join('\n');

/** File name suggested when the template is downloaded. */
export const CSV_TEMPLATE_FILE_NAME = 'metrix-template.csv';
