import { TableRow } from '@keira/shared/constants';

export const PLAYER_SHAPESHIFT_MODEL_TABLE = 'player_shapeshift_model';
// NOTE: column names follow the retroporting spec. Verify against the live schema — some
// AzerothCore forks name the primary key `ShapeshiftFormID`. The *_ID indirection keeps a
// later rename to a single line.
export const PLAYER_SHAPESHIFT_MODEL_ID = 'ShapeshiftID';
export const PLAYER_SHAPESHIFT_MODEL_SEARCH_FIELDS = ['ShapeshiftID', 'RaceID', 'DisplayID'];

export class PlayerShapeshiftModel extends TableRow {
  ShapeshiftID: number = 0;
  RaceID: number = 0;
  CustomizationID: number = 0;
  GenderID: number = 0;
  DisplayID: number = 0;
}
