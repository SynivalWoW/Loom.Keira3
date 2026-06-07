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

  it('throws on an unknown table', () => {
    expect(() => expandFields('Nope')).toThrow(/unknown DBC table/);
  });
});
