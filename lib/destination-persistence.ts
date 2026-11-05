export const DESTINATION_MIGRATION_REQUIRED_MESSAGE =
  "We could not save your delivery destinations, so your order was not created and payment was not started. Please try again after the destination database update is complete.";

export function isDestinationSchemaMissing(
  error: { code?: string; message?: string } | null
) {
  return Boolean(
    error &&
      /delivery_destinations|delivery_destination_other/i.test(
        error.message || ""
      )
  );
}

export function destinationMigrationIsRequired(
  error: { code?: string; message?: string } | null,
  selectedDestinations: readonly string[]
) {
  return (
    selectedDestinations.length > 0 && isDestinationSchemaMissing(error)
  );
}
