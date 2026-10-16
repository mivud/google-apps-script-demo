/**
 * Port contracts shared by all modules. Apps Script has no interfaces, so they are documented here;
 * implementations live in this library (infrastructure, persistence/googlesheet) and modules/<m>/persistence/googlesheet and are wired in composition/Composition.gs.
 *
 * Clock                 { now(): Date }
 * IdGenerator           { newId(): string }                 lowercase uuid
 * CurrentUser           { id(): string }                    '' until login exists
 * TokenGuard            { assertValid(token): void }        throws ApiError UNAUTHORIZED
 * LockGuard             { runExclusive(work): any }         serializes work; releases the lock on any outcome
 * SpreadsheetSource     { open(): Spreadsheet }
 * TableGateway (one sheet, rows are plain objects keyed by header)
 *   readAll(): row[]
 *   findById(id): { index, row } | null                     index is the 1-based sheet row; id is case-insensitive
 *   append(row): void
 *   update(index, row): void
 *   deleteAt(index): void
 *   deleteWhere(predicate): void                            bottom-up so indexes stay valid
 *
 * Cross-module ports (declared by the consumer, implemented by the owner module):
 *   CategoryLookup            { requireExistingId(id): string }        used by equipment; throws NOT_FOUND
 *   EquipmentCategoryUsage    { isCategoryInUse(categoryId): boolean } used by category
 *   EquipmentLookup           { requireExistingId(id): string }        used by maintenance; throws NOT_FOUND
 *   MaintenanceLogCascade     { removeAllFor(equipmentId): void }      used by equipment
 *   RootCategoryResolver      { idForName(name): string }              used by the equipment legacy migration
 */
