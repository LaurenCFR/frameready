import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DESTINATION_MIGRATION_REQUIRED_MESSAGE,
  destinationMigrationIsRequired,
  isDestinationSchemaMissing,
} from "../lib/destination-persistence.ts";

const missingColumn = {
  code: "PGRST204",
  message: "Could not find the 'delivery_destinations' column",
};

test("selected destinations fail closed when the migration is missing", () => {
  assert.equal(
    destinationMigrationIsRequired(missingColumn, ["Filmhub"]),
    true
  );
  assert.match(DESTINATION_MIGRATION_REQUIRED_MESSAGE, /order was not created/i);
  assert.match(DESTINATION_MIGRATION_REQUIRED_MESSAGE, /payment was not started/i);
});

test("an order without destination selections can use the legacy schema", () => {
  assert.equal(destinationMigrationIsRequired(missingColumn, []), false);
  assert.equal(isDestinationSchemaMissing(missingColumn), true);
});

test("unrelated database errors are not treated as a missing migration", () => {
  const unrelated = { code: "23505", message: "duplicate key" };
  assert.equal(destinationMigrationIsRequired(unrelated, ["Filmhub"]), false);
  assert.equal(isDestinationSchemaMissing(unrelated), false);

  const unrelatedMissingColumn = {
    code: "PGRST204",
    message: "Could not find the 'unrelated_column' column",
  };
  assert.equal(isDestinationSchemaMissing(unrelatedMissingColumn), false);
});
