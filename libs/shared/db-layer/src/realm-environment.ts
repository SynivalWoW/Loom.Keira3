/**
 * Retroporting targets two AzerothCore realms. The environment toggle picks which schema the
 * DBAL writes to: world-DB tables (e.g. item_template) and characters-DB tables (e.g.
 * player_shapeshift_model) live in different databases per realm.
 */
export enum RealmEnvironment {
  LIVE = 'LIVE',
  PTR = 'PTR',
}

export const REALM_WORLD_DB: Record<RealmEnvironment, string> = {
  [RealmEnvironment.LIVE]: 'acore_world',
  [RealmEnvironment.PTR]: 'acoreptr_world',
};

export const REALM_CHARACTERS_DB: Record<RealmEnvironment, string> = {
  [RealmEnvironment.LIVE]: 'acore_characters',
  [RealmEnvironment.PTR]: 'acoreptr_characters',
};
