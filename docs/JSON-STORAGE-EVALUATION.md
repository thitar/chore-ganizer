# Recurrence Rule JSON Storage Evaluation

## Current State

- **Field**: `recurrenceRule String` in Prisma schema (`RecurringChore` model)
- **Storage**: JSON string, manually parsed/stringified at application boundaries
- **Write sites** (JSON.stringify):
  - `backend/src/controllers/recurring-chores-crud.controller.ts` — create (line 75) and update (line 195)
- **Read sites** (JSON.parse):
  - `backend/src/services/recurring-chores/transform.service.ts` — API response transformation (line 8)
  - `backend/src/jobs/occurrenceJob.ts` — daily occurrence generation (line 69)
- **Validation**: `RecurrenceService.isValidRule()` validates structure before write
- **Query patterns**: No database queries filter or sort by `recurrenceRule` properties. The field is always fetched as a whole and parsed in application code.
- **Database**: SQLite (limited native JSON support compared to PostgreSQL)

## Option A: Prisma Json Type

**Pros:**
- Native JSON support, no manual parse/stringify
- Type safety with Prisma's generated types
- Query capabilities for JSON fields (in supported databases)

**Cons:**
- SQLite JSON support is limited compared to PostgreSQL
- Would require schema migration (`prisma migrate dev`)
- All JSON.parse/stringify call sites must be updated
- Validation still needed at application layer
- Test fixtures using `JSON.stringify()` for seed data need updating

## Option B: Keep String with Zod Validation

**Pros:**
- No schema migration needed
- Works reliably with SQLite
- Explicit validation at boundaries
- Minimal code change

**Cons:**
- Manual parse/stringify continues
- No DB-level type safety
- Risk of invalid JSON in database if data is inserted outside application boundaries

## Option C: Normalized Structured Fields

**Pros:**
- Full queryability (e.g., "find all weekly chores")
- Best type safety and validation
- No JSON parsing overhead

**Cons:**
- Major schema change requiring migration
- Complex migration for existing data
- Less flexible for future recurrence rule extensions
- Would require columns like `frequency`, `interval`, `dayOfWeek`, etc.

## Recommendation

**Option B: Keep String with Zod Validation**

### Rationale

1. **No query by recurrence properties**: The application never filters or sorts `RecurringChore` records by properties inside `recurrenceRule`. All usage fetches the entire record and parses the rule in memory.
2. **SQLite limitations**: SQLite's JSON support is minimal. Prisma's `Json` type offers little practical benefit over `String` for this database.
3. **Low migration cost avoided**: Option B requires zero migration. Option A would touch controllers, services, tests, and seed data.
4. **Validation already exists**: `RecurrenceService.isValidRule()` provides runtime validation. Adding a Zod schema adds declarative, self-documenting validation at the boundary.

### Implemented: Zod Schema for Recurrence Rule

A Zod schema has been added to `backend/src/schemas/validation.schemas.ts`:

```typescript
export const recurrenceRuleSchema = z.object({
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  interval: z.number().int().min(1),
  dayOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  dayOfMonth: z.number().int().min(-1).max(31).optional(),
  nthWeekday: z.object({
    week: z.number().int().min(1).max(5),
    day: z.number().int().min(0).max(6),
  }).optional(),
})
```

The controller validates `req.body.recurrenceRule` with this schema before passing it to `RecurrenceService.isValidRule()`.

### Future Considerations

If the application later needs to query recurring chores by frequency (e.g., "list all weekly chores"), **Option C (normalized fields)** should be re-evaluated. At that point, the migration cost may be justified by the query performance and type safety gains.

If migrating to PostgreSQL, **Option A (Prisma Json type)** becomes more attractive because PostgreSQL offers rich JSON querying with `->` and `->>` operators.
