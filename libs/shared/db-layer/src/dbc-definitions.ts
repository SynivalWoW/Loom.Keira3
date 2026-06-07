/**
 * DBC column layouts for the retroport tables, transcribed from WDBX Editor's authoritative
 * `WotLK 3.3.5 (12340)` definitions. Used by the in-GUI DBC editor and the DBC file service.
 */
export type DbcFieldType = 'int' | 'float' | 'string';

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
