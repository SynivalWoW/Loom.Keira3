import { RealmEnvironment, REALM_CHARACTERS_DB, REALM_WORLD_DB } from './realm-environment';

describe('RealmEnvironment maps', () => {
  it('maps the world database per realm', () => {
    expect(REALM_WORLD_DB[RealmEnvironment.LIVE]).toBe('acore_world');
    expect(REALM_WORLD_DB[RealmEnvironment.PTR]).toBe('acoreptr_world');
  });

  it('maps the characters database per realm', () => {
    expect(REALM_CHARACTERS_DB[RealmEnvironment.LIVE]).toBe('acore_characters');
    expect(REALM_CHARACTERS_DB[RealmEnvironment.PTR]).toBe('acoreptr_characters');
  });

  it('exposes stable enum string values', () => {
    expect(RealmEnvironment.LIVE).toBe('LIVE');
    expect(RealmEnvironment.PTR).toBe('PTR');
  });
});
