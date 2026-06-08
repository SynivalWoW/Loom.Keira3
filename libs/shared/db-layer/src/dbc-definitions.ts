/**
 * DBC column layouts for the retroport tables, transcribed from WDBX Editor's authoritative
 * `WotLK 3.3.5 (12340)` definitions. Used by the in-GUI DBC editor and the DBC file service.
 */
export type DbcFieldType = 'int' | 'float' | 'string' | 'loc';

export interface DbcFieldDef {
  name: string;
  type: DbcFieldType;
  array?: number;
}

export interface DbcTableDef {
  name: string;
  fields: DbcFieldDef[];
}

export const DBC_DEFINITIONS: Record<string, DbcTableDef> = {
  CreatureDisplayInfo: {
    name: 'CreatureDisplayInfo',
    fields: [
      { name: 'ID', type: 'int' },
      { name: 'ModelID', type: 'int' },
      { name: 'SoundID', type: 'int' },
      { name: 'ExtendedDisplayInfoID', type: 'int' },
      { name: 'CreatureModelScale', type: 'float' },
      { name: 'CreatureModelAlpha', type: 'int' },
      { name: 'TextureVariation', type: 'string', array: 3 },
      { name: 'PortraitTextureName', type: 'string' },
      { name: 'BloodLevel', type: 'int' },
      { name: 'BloodID', type: 'int' },
      { name: 'NPCSoundID', type: 'int' },
      { name: 'ParticleColorID', type: 'int' },
      { name: 'CreatureGeosetData', type: 'int' },
      { name: 'ObjectEffectPackageID', type: 'int' },
    ],
  },
  CreatureModelData: {
    name: 'CreatureModelData',
    fields: [
      { name: 'ID', type: 'int' },
      { name: 'Flags', type: 'int' },
      { name: 'ModelName', type: 'string' },
      { name: 'SizeClass', type: 'int' },
      { name: 'ModelScale', type: 'float' },
      { name: 'BloodID', type: 'int' },
      { name: 'FootprintTextureID', type: 'int' },
      { name: 'FootprintTextureLength', type: 'float' },
      { name: 'FootprintTextureWidth', type: 'float' },
      { name: 'FootprintParticleScale', type: 'float' },
      { name: 'FoleyMaterialID', type: 'int' },
      { name: 'FootstepShakeSize', type: 'int' },
      { name: 'DeathThudShakeSize', type: 'int' },
      { name: 'SoundID', type: 'int' },
      { name: 'CollisionWidth', type: 'float' },
      { name: 'CollisionHeight', type: 'float' },
      { name: 'MountHeight', type: 'float' },
      { name: 'GeoBoxMinX', type: 'float' },
      { name: 'GeoBoxMinY', type: 'float' },
      { name: 'GeoBoxMinZ', type: 'float' },
      { name: 'GeoBoxMaxX', type: 'float' },
      { name: 'GeoBoxMaxY', type: 'float' },
      { name: 'GeoBoxMaxZ', type: 'float' },
      { name: 'WorldEffectScale', type: 'float' },
      { name: 'AttachedEffectScale', type: 'float' },
      { name: 'MissileCollisionRadius', type: 'float' },
      { name: 'MissileCollisionPush', type: 'float' },
      { name: 'MissileCollisionRaise', type: 'float' },
    ],
  },
  CreatureDisplayInfoExtra: {
    name: 'CreatureDisplayInfoExtra',
    fields: [
      { name: 'ID', type: 'int' },
      { name: 'DisplayRaceID', type: 'int' },
      { name: 'DisplaySexID', type: 'int' },
      { name: 'SkinID', type: 'int' },
      { name: 'FaceID', type: 'int' },
      { name: 'HairStyleID', type: 'int' },
      { name: 'HairColorID', type: 'int' },
      { name: 'FacialHairID', type: 'int' },
      { name: 'NPCItemDisplay', type: 'int', array: 11 },
      { name: 'Flags', type: 'int' },
      { name: 'BakeName', type: 'string' },
    ],
  },
  SpellShapeshiftForm: {
    name: 'SpellShapeshiftForm',
    fields: [
      { name: 'ID', type: 'int' },
      { name: 'BonusActionBar', type: 'int' },
      { name: 'Name_Lang', type: 'loc' },
      { name: 'Flags', type: 'int' },
      { name: 'CreatureType', type: 'int' },
      { name: 'AttackIconID', type: 'int' },
      { name: 'CombatRoundTime', type: 'int' },
      { name: 'CreatureDisplayID', type: 'int', array: 4 },
      { name: 'PresetSpellID', type: 'int', array: 8 },
    ],
  },
  CharSections: {
    name: 'CharSections',
    fields: [
      { name: 'ID', type: 'int' },
      { name: 'RaceID', type: 'int' },
      { name: 'SexID', type: 'int' },
      { name: 'BaseSection', type: 'int' },
      { name: 'TextureName', type: 'string', array: 3 },
      { name: 'Flags', type: 'int' },
      { name: 'VariationIndex', type: 'int' },
      { name: 'ColorIndex', type: 'int' },
    ],
  },
  ChrRaces: {
    name: 'ChrRaces',
    fields: [
      { name: 'ID', type: 'int' },
      { name: 'Flags', type: 'int' },
      { name: 'FactionID', type: 'int' },
      { name: 'ExplorationSoundID', type: 'int' },
      { name: 'MaleDisplayId', type: 'int' },
      { name: 'FemaleDisplayId', type: 'int' },
      { name: 'ClientPrefix', type: 'string' },
      { name: 'BaseLanguage', type: 'int' },
      { name: 'CreatureType', type: 'int' },
      { name: 'ResSicknessSpellID', type: 'int' },
      { name: 'SplashSoundID', type: 'int' },
      { name: 'ClientFilestring', type: 'string' },
      { name: 'CinematicSequenceID', type: 'int' },
      { name: 'Alliance', type: 'int' },
      { name: 'Name_Lang', type: 'loc' },
      { name: 'Name_Female_Lang', type: 'loc' },
      { name: 'Name_Male_Lang', type: 'loc' },
      { name: 'FacialHairCustomization', type: 'string', array: 2 },
      { name: 'HairCustomization', type: 'string' },
      { name: 'Required_Expansion', type: 'int' },
    ],
  },
};

export const DBC_TABLE_NAMES = Object.keys(DBC_DEFINITIONS);

/** Expand a table's fields into one entry per (array-expanded) column, e.g. TextureVariation_1..3. */
export function expandFields(table: string): DbcFieldDef[] {
  const def = DBC_DEFINITIONS[table];
  if (!def) {
    throw new Error(`unknown DBC table: ${table}`);
  }
  const columns: DbcFieldDef[] = [];
  for (const field of def.fields) {
    // A WotLK localized string ('loc') is 16 per-locale string columns + 1 flags column.
    if (field.type === 'loc') {
      for (let i = 1; i <= 16; i++) {
        columns.push({ name: `${field.name}_${i}`, type: 'string' });
      }
      columns.push({ name: `${field.name}_flags`, type: 'int' });
      continue;
    }
    const count = field.array ?? 1;
    if (count > 1) {
      for (let i = 1; i <= count; i++) {
        columns.push({ name: `${field.name}_${i}`, type: field.type });
      }
    } else {
      columns.push({ name: field.name, type: field.type });
    }
  }
  return columns;
}
