import { TableRow } from '@keira/shared/constants';

export const CREATURE_MODEL_INFO_TABLE = 'creature_model_info';
export const CREATURE_MODEL_INFO_ID = 'DisplayID';
export const CREATURE_MODEL_INFO_SEARCH_FIELDS = ['DisplayID', 'Gender'];
export const CREATURE_MODEL_INFO_CUSTOM_STARTING_ID = 90_000;

export class CreatureModelInfo extends TableRow {
  DisplayID: number = 0;
  BoundingRadius: number = 0;
  CombatReach: number = 0;
  Gender: number = 0;
  DisplayID_Other_Gender: number = 0;
  VerifiedBuild: number = 0;
}
