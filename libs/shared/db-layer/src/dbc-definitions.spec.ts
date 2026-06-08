import { DBC_TABLE_NAMES, expandFields } from './dbc-definitions';

describe('dbc-definitions', () => {
  it('lists the retroport DBC tables', () => {
    expect(DBC_TABLE_NAMES).toContain('CreatureDisplayInfo');
    expect(DBC_TABLE_NAMES).toContain('CreatureModelData');
  });

  it('expands array fields (TextureVariation_1..3)', () => {
    const cols = expandFields('CreatureDisplayInfo');
    expect(cols.length).toBe(16);
    expect(cols.map((c) => c.name)).toContain('TextureVariation_2');
  });

  it('CreatureModelData expands to 28 columns', () => {
    expect(expandFields('CreatureModelData').length).toBe(28);
  });

  it('includes the extended retroport-related tables', () => {
    for (const table of ['SpellShapeshiftForm', 'CharSections', 'CreatureDisplayInfoExtra', 'ChrRaces']) {
      expect(DBC_TABLE_NAMES).toContain(table);
    }
  });

  it('expands a localized (loc) field to 16 string columns + 1 flags column', () => {
    const cols = expandFields('SpellShapeshiftForm');
    const locStrings = cols.filter((c) => /^Name_Lang_\d+$/.test(c.name));
    expect(locStrings.length).toBe(16);
    expect(locStrings.every((c) => c.type === 'string')).toBe(true);
    expect(cols.find((c) => c.name === 'Name_Lang_flags')?.type).toBe('int');
    expect(cols.length).toBe(35); // 18 scalar/array columns + 17 for the loc field
  });

  it('throws on an unknown table', () => {
    expect(() => expandFields('Nope')).toThrow(/unknown DBC table/);
  });
});
