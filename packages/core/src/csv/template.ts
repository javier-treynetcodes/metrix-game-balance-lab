/**
 * @file Official CSV template offered for download in the app.
 */

/**
 * Official CSV template: header plus invented example rows, readable at a glance.
 *
 * - Two damage channels, `channel1` and `channel2`; users rename them after their game
 *   (e.g. `atk:physical`) in the header or in the Damage rules tab.
 * - Eight characters across the six usual MOBA classes (tank, fighter, mage, marksman, assassin,
 *   support): generic terms of the genre. Units, characters and complements are invented.
 * - One complement per class, which adds attack or armor to every character of that class.
 * - No `rule` rows: the armor coverage is the default one (each armor stops only its channel).
 *
 * It is deliberately balanced so it teaches how to read results: no walls or draws, every
 * character wins between 2 and 5 of its 7 duels both at base and with complements, the mixed
 * attacker (Blade Duelist) is strong, and the complements change the winner of three duels.
 * `template.test.ts` keeps it that way. Every value is a whole number.
 */
export const CSV_TEMPLATE = [
  'id,kind,name,character,class,cost,hp,atk:channel1,def:channel1,atk:channel2,def:channel2,tag:role',
  'vanguard,unit,Iron Vanguard,Aria,tank,45,600,30,30,0,10,frontline',
  'duelist,unit,Blade Duelist,Kael,fighter,47,500,26,20,26,12,frontline',
  'archer,unit,Long Archer,Lysa,marksman,44,400,50,6,0,6,backline',
  'shadow,unit,Night Shadow,Vex,assassin,46,380,54,10,0,8,flank',
  'sorcerer,unit,Storm Sorcerer,Nyra,mage,49,440,0,10,42,20,backline',
  'oracle,unit,Dawn Oracle,Sera,support,44,440,0,16,30,24,backline',
  'warden,unit,Rune Warden,Toren,tank,48,640,0,26,28,14,frontline',
  'witch,unit,Ember Witch,Mira,mage,42,320,0,8,44,18,flank',
  'shield,complement,Tower Shield,,tank,,,,2,,10,',
  'blade,complement,Twin Blade,,fighter,,,10,,,,',
  'bow,complement,Hunter Bow,,marksman,,,6,,,,',
  'dagger,complement,Venom Dagger,,assassin,,,6,,,,',
  'staff,complement,Arcane Staff,,mage,,,,,2,,',
  'charm,complement,Ward Charm,,support,,,,8,,2,',
  '',
].join('\n');

/** File name suggested when the template is downloaded. */
export const CSV_TEMPLATE_FILE_NAME = 'metrix-template.csv';
