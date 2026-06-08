/**
 * DBC column layouts for the retroport + spell tables, transcribed from the authoritative
 * `WotLK 3.3.5 (12340)` definitions (WDBX Editor / WoW-Spell-Editor). Used by the in-GUI DBC editor
 * and the DBC file service, so Spell.dbc and its lookup tables can be created/edited in-tool.
 */
export type DbcFieldType = 'int' | 'float' | 'string' | 'loc';

export interface DbcFieldDef {
  name: string;
  type: DbcFieldType;
  array?: number;
  /** The source field an expanded column came from (e.g. `EffectBasePoints_2` → `EffectBasePoints`). */
  base?: string;
}

/** A named tab grouping a subset of a table's (base) fields — used to make wide tables navigable. */
export interface DbcFieldGroup {
  name: string;
  fields: string[];
}

export interface DbcTableDef {
  name: string;
  fields: DbcFieldDef[];
  groups?: DbcFieldGroup[];
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
  // ---- Spell editing (WoW-Spell-Editor parity) -------------------------------------------------
  // Spell.dbc 3.3.5a (12340): 234 columns / 936-byte records. Array + loc fields expand to columns.
  Spell: {
    name: 'Spell',
    fields: [
      { name: 'ID', type: 'int' },
      { name: 'Category', type: 'int' },
      { name: 'DispelType', type: 'int' },
      { name: 'Mechanic', type: 'int' },
      { name: 'Attributes', type: 'int' },
      { name: 'AttributesEx', type: 'int' },
      { name: 'AttributesEx2', type: 'int' },
      { name: 'AttributesEx3', type: 'int' },
      { name: 'AttributesEx4', type: 'int' },
      { name: 'AttributesEx5', type: 'int' },
      { name: 'AttributesEx6', type: 'int' },
      { name: 'AttributesEx7', type: 'int' },
      { name: 'ShapeshiftMask', type: 'int', array: 2 },
      { name: 'ShapeshiftExclude', type: 'int', array: 2 },
      { name: 'Targets', type: 'int' },
      { name: 'TargetCreatureType', type: 'int' },
      { name: 'RequiresSpellFocus', type: 'int' },
      { name: 'FacingCasterFlags', type: 'int' },
      { name: 'CasterAuraState', type: 'int' },
      { name: 'TargetAuraState', type: 'int' },
      { name: 'ExcludeCasterAuraState', type: 'int' },
      { name: 'ExcludeTargetAuraState', type: 'int' },
      { name: 'CasterAuraSpell', type: 'int' },
      { name: 'TargetAuraSpell', type: 'int' },
      { name: 'ExcludeCasterAuraSpell', type: 'int' },
      { name: 'ExcludeTargetAuraSpell', type: 'int' },
      { name: 'CastingTimeIndex', type: 'int' },
      { name: 'RecoveryTime', type: 'int' },
      { name: 'CategoryRecoveryTime', type: 'int' },
      { name: 'InterruptFlags', type: 'int' },
      { name: 'AuraInterruptFlags', type: 'int' },
      { name: 'ChannelInterruptFlags', type: 'int' },
      { name: 'ProcFlags', type: 'int' },
      { name: 'ProcChance', type: 'int' },
      { name: 'ProcCharges', type: 'int' },
      { name: 'MaxLevel', type: 'int' },
      { name: 'BaseLevel', type: 'int' },
      { name: 'SpellLevel', type: 'int' },
      { name: 'DurationIndex', type: 'int' },
      { name: 'PowerType', type: 'int' },
      { name: 'ManaCost', type: 'int' },
      { name: 'ManaCostPerLevel', type: 'int' },
      { name: 'ManaPerSecond', type: 'int' },
      { name: 'ManaPerSecondPerLevel', type: 'int' },
      { name: 'RangeIndex', type: 'int' },
      { name: 'Speed', type: 'float' },
      { name: 'ModalNextSpell', type: 'int' },
      { name: 'StackAmount', type: 'int' },
      { name: 'Totem', type: 'int', array: 2 },
      { name: 'Reagent', type: 'int', array: 8 },
      { name: 'ReagentCount', type: 'int', array: 8 },
      { name: 'EquippedItemClass', type: 'int' },
      { name: 'EquippedItemSubClassMask', type: 'int' },
      { name: 'EquippedItemInventoryTypeMask', type: 'int' },
      { name: 'Effect', type: 'int', array: 3 },
      { name: 'EffectDieSides', type: 'int', array: 3 },
      { name: 'EffectRealPointsPerLevel', type: 'float', array: 3 },
      { name: 'EffectBasePoints', type: 'int', array: 3 },
      { name: 'EffectMechanic', type: 'int', array: 3 },
      { name: 'EffectImplicitTargetA', type: 'int', array: 3 },
      { name: 'EffectImplicitTargetB', type: 'int', array: 3 },
      { name: 'EffectRadiusIndex', type: 'int', array: 3 },
      { name: 'EffectApplyAuraName', type: 'int', array: 3 },
      { name: 'EffectAmplitude', type: 'int', array: 3 },
      { name: 'EffectMultipleValue', type: 'float', array: 3 },
      { name: 'EffectChainTarget', type: 'int', array: 3 },
      { name: 'EffectItemType', type: 'int', array: 3 },
      { name: 'EffectMiscValue', type: 'int', array: 3 },
      { name: 'EffectMiscValueB', type: 'int', array: 3 },
      { name: 'EffectTriggerSpell', type: 'int', array: 3 },
      { name: 'EffectPointsPerComboPoint', type: 'float', array: 3 },
      { name: 'EffectSpellClassMaskA', type: 'int', array: 3 },
      { name: 'EffectSpellClassMaskB', type: 'int', array: 3 },
      { name: 'EffectSpellClassMaskC', type: 'int', array: 3 },
      { name: 'SpellVisualID', type: 'int', array: 2 },
      { name: 'SpellIconID', type: 'int' },
      { name: 'ActiveIconID', type: 'int' },
      { name: 'SpellPriority', type: 'int' },
      { name: 'Name_Lang', type: 'loc' },
      { name: 'NameSubtext_Lang', type: 'loc' },
      { name: 'Description_Lang', type: 'loc' },
      { name: 'AuraDescription_Lang', type: 'loc' },
      { name: 'ManaCostPercentage', type: 'int' },
      { name: 'StartRecoveryCategory', type: 'int' },
      { name: 'StartRecoveryTime', type: 'int' },
      { name: 'MaxTargetLevel', type: 'int' },
      { name: 'SpellClassSet', type: 'int' },
      { name: 'SpellClassMask', type: 'int', array: 3 },
      { name: 'MaxTargets', type: 'int' },
      { name: 'DefenseType', type: 'int' },
      { name: 'PreventionType', type: 'int' },
      { name: 'StanceBarOrder', type: 'int' },
      { name: 'EffectChainAmplitude', type: 'float', array: 3 },
      { name: 'MinFactionId', type: 'int' },
      { name: 'MinReputation', type: 'int' },
      { name: 'RequiredAuraVision', type: 'int' },
      { name: 'RequiredTotemCategoryID', type: 'int', array: 2 },
      { name: 'RequiredAreasID', type: 'int' },
      { name: 'SchoolMask', type: 'int' },
      { name: 'RuneCostID', type: 'int' },
      { name: 'SpellMissileID', type: 'int' },
      { name: 'PowerDisplayID', type: 'int' },
      { name: 'EffectBonusMultiplier', type: 'float', array: 3 },
      { name: 'SpellDescriptionVariableID', type: 'int' },
      { name: 'SpellDifficultyID', type: 'int' },
    ],
    // Tab grouping for the 234-column editor (WoW-Spell-Editor style). Covers every base field.
    groups: [
      {
        name: 'General',
        fields: [
          'ID',
          'Category',
          'DispelType',
          'Mechanic',
          'SpellLevel',
          'BaseLevel',
          'MaxLevel',
          'MaxTargetLevel',
          'PowerType',
          'SchoolMask',
          'SpellPriority',
          'SpellDifficultyID',
          'SpellDescriptionVariableID',
          'SpellMissileID',
        ],
      },
      {
        name: 'Attributes',
        fields: [
          'Attributes',
          'AttributesEx',
          'AttributesEx2',
          'AttributesEx3',
          'AttributesEx4',
          'AttributesEx5',
          'AttributesEx6',
          'AttributesEx7',
          'ShapeshiftMask',
          'ShapeshiftExclude',
          'StanceBarOrder',
          'DefenseType',
          'PreventionType',
          'SpellClassSet',
          'SpellClassMask',
        ],
      },
      {
        name: 'Costs & Reagents',
        fields: [
          'ManaCost',
          'ManaCostPerLevel',
          'ManaPerSecond',
          'ManaPerSecondPerLevel',
          'ManaCostPercentage',
          'PowerDisplayID',
          'RuneCostID',
          'Totem',
          'Reagent',
          'ReagentCount',
          'EquippedItemClass',
          'EquippedItemSubClassMask',
          'EquippedItemInventoryTypeMask',
        ],
      },
      {
        name: 'Cast & Cooldown',
        fields: [
          'CastingTimeIndex',
          'RecoveryTime',
          'CategoryRecoveryTime',
          'StartRecoveryCategory',
          'StartRecoveryTime',
          'DurationIndex',
          'Speed',
          'RangeIndex',
          'ModalNextSpell',
          'StackAmount',
          'InterruptFlags',
          'AuraInterruptFlags',
          'ChannelInterruptFlags',
        ],
      },
      {
        name: 'Targeting',
        fields: [
          'Targets',
          'TargetCreatureType',
          'RequiresSpellFocus',
          'FacingCasterFlags',
          'MaxTargets',
          'MinFactionId',
          'MinReputation',
          'RequiredAuraVision',
          'RequiredTotemCategoryID',
          'RequiredAreasID',
        ],
      },
      {
        name: 'Proc & Aura State',
        fields: [
          'CasterAuraState',
          'TargetAuraState',
          'ExcludeCasterAuraState',
          'ExcludeTargetAuraState',
          'CasterAuraSpell',
          'TargetAuraSpell',
          'ExcludeCasterAuraSpell',
          'ExcludeTargetAuraSpell',
          'ProcFlags',
          'ProcChance',
          'ProcCharges',
        ],
      },
      {
        name: 'Effects',
        fields: [
          'Effect',
          'EffectDieSides',
          'EffectRealPointsPerLevel',
          'EffectBasePoints',
          'EffectMechanic',
          'EffectImplicitTargetA',
          'EffectImplicitTargetB',
          'EffectRadiusIndex',
          'EffectApplyAuraName',
          'EffectAmplitude',
          'EffectMultipleValue',
          'EffectChainTarget',
          'EffectItemType',
          'EffectMiscValue',
          'EffectMiscValueB',
          'EffectTriggerSpell',
          'EffectPointsPerComboPoint',
          'EffectSpellClassMaskA',
          'EffectSpellClassMaskB',
          'EffectSpellClassMaskC',
          'EffectChainAmplitude',
          'EffectBonusMultiplier',
        ],
      },
      {
        name: 'Text & Visuals',
        fields: [
          'Name_Lang',
          'NameSubtext_Lang',
          'Description_Lang',
          'AuraDescription_Lang',
          'SpellVisualID',
          'SpellIconID',
          'ActiveIconID',
        ],
      },
    ],
  },
  SpellIcon: {
    name: 'SpellIcon',
    fields: [
      { name: 'ID', type: 'int' },
      { name: 'TextureFilename', type: 'string' },
    ],
  },
  SpellDuration: {
    name: 'SpellDuration',
    fields: [
      { name: 'ID', type: 'int' },
      { name: 'Duration', type: 'int' },
      { name: 'DurationPerLevel', type: 'int' },
      { name: 'MaxDuration', type: 'int' },
    ],
  },
  SpellCastTimes: {
    name: 'SpellCastTimes',
    fields: [
      { name: 'ID', type: 'int' },
      { name: 'Base', type: 'int' },
      { name: 'PerLevel', type: 'int' },
      { name: 'Minimum', type: 'int' },
    ],
  },
  SpellRadius: {
    name: 'SpellRadius',
    fields: [
      { name: 'ID', type: 'int' },
      { name: 'Radius', type: 'float' },
      { name: 'RadiusPerLevel', type: 'float' },
      { name: 'RadiusMax', type: 'float' },
    ],
  },
  SpellRange: {
    name: 'SpellRange',
    fields: [
      { name: 'ID', type: 'int' },
      { name: 'MinRange', type: 'float', array: 2 },
      { name: 'MaxRange', type: 'float', array: 2 },
      { name: 'Flags', type: 'int' },
      { name: 'DisplayName_Lang', type: 'loc' },
      { name: 'DisplayNameShort_Lang', type: 'loc' },
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
        columns.push({ name: `${field.name}_${i}`, type: 'string', base: field.name });
      }
      columns.push({ name: `${field.name}_flags`, type: 'int', base: field.name });
      continue;
    }
    const count = field.array ?? 1;
    if (count > 1) {
      for (let i = 1; i <= count; i++) {
        columns.push({ name: `${field.name}_${i}`, type: field.type, base: field.name });
      }
    } else {
      columns.push({ name: field.name, type: field.type, base: field.name });
    }
  }
  return columns;
}

/**
 * Split a table's expanded columns into the tabs declared by its `groups` (returns `null` when the
 * table has none). Any field not named in a group is gathered into a trailing "Other" tab, so tabs
 * never hide a column.
 */
export function groupColumns(table: string): { name: string; columns: DbcFieldDef[] }[] | null {
  const def = DBC_DEFINITIONS[table];
  if (!def?.groups?.length) {
    return null;
  }
  const columns = expandFields(table);
  const groups = def.groups.map((g) => ({ name: g.name, columns: columns.filter((c) => g.fields.includes(c.base ?? c.name)) }));
  const grouped = new Set(def.groups.flatMap((g) => g.fields));
  const other = columns.filter((c) => !grouped.has(c.base ?? c.name));
  if (other.length) {
    groups.push({ name: 'Other', columns: other });
  }
  return groups;
}
