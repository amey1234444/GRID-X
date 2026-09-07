import {
  IMS_MAPPING_PROFILES,
  WATERMARK_ALIAS,
  buildSelect,
  columnExpression,
  loadMapping,
  quoteIdentifier,
  unsupportedReason,
  validateMapping,
  type ImsEntityMapping,
} from './ims.mapping';
import { IMS_INBOUND_ENTITIES } from './ims.contract';

describe('IMS mapping', () => {
  describe('identifier safety', () => {
    it('quotes a legal identifier', () => {
      expect(quoteIdentifier('materialGrade')).toBe('"materialGrade"');
    });

    it.each([
      'items"; DROP TABLE users; --',
      'items; DELETE FROM stock',
      '1items',
      'items-with-dash',
      '',
    ])('refuses %p as an identifier', (name) => {
      expect(() => quoteIdentifier(name)).toThrow(/not a valid SQL identifier/);
    });

    it('refuses a raw expression carrying a statement separator', () => {
      expect(() => columnExpression('=1; DROP TABLE items', 'items.code')).toThrow(
        /statement separator or comment/,
      );
    });

    it('refuses a raw expression carrying a comment', () => {
      expect(() => columnExpression('=t."code" -- anything', 'items.code')).toThrow(
        /statement separator or comment/,
      );
    });

    it('allows a legitimate SQL expression', () => {
      expect(columnExpression('=coalesce(t."name", t."code")', 'items.name')).toBe(
        'coalesce(t."name", t."code")',
      );
    });

    it('qualifies a joined column by its alias', () => {
      expect(columnExpression('c.code', 'products.companyCode')).toBe('"c"."code"');
    });

    it('refuses a column with too many qualifiers', () => {
      expect(() => columnExpression('a.b.c', 'products.companyCode')).toThrow(/too many qualifiers/);
    });
  });

  describe('buildSelect', () => {
    const mapping: ImsEntityMapping = {
      table: 'Item',
      columns: { code: 'code', name: 'name', uom: 'uom' },
      searchColumns: ['code', 'name'],
      changeColumn: 'updatedAt',
    };

    it('selects every mapped column aliased to its canonical field', () => {
      const query = buildSelect('items', mapping, 'public');
      expect(query.text).toContain('t."code" AS "code"');
      expect(query.text).toContain('t."name" AS "name"');
      expect(query.text).toContain('FROM "public"."Item" AS t');
      expect(query.fields).toEqual(['code', 'name', 'uom']);
    });

    it('binds the search term as a parameter rather than interpolating it', () => {
      const query = buildSelect('items', mapping, 'public', { search: "o'brien" });
      expect(query.text).not.toContain("o'brien");
      expect(query.values).toContain("%o'brien%");
      expect(query.text).toContain('ILIKE $1');
    });

    it('binds the watermark and reports the read as incremental', () => {
      const since = new Date('2026-01-01T00:00:00.000Z');
      const query = buildSelect('items', mapping, 'public', { since });
      expect(query.incremental).toBe(true);
      expect(query.values).toContain(since);
      expect(query.text).toContain('t."updatedAt" >= $1');
    });

    it('ignores a watermark when the entity has no change column', () => {
      const noChange: ImsEntityMapping = { table: 'Item', columns: { code: 'code' } };
      const query = buildSelect('items', noChange, 'public', { since: new Date() });
      expect(query.incremental).toBe(false);
      // Only the LIMIT is bound.
      expect(query.values).toHaveLength(1);
    });

    it('caps the row limit so a bad caller cannot ask for the whole table', () => {
      const query = buildSelect('items', mapping, 'public', { limit: 999_999 });
      expect(query.values[query.values.length - 1]).toBe(10_000);
    });

    it('emits the declared joins', () => {
      const query = buildSelect('products', IMS_MAPPING_PROFILES.prisma.products, 'public');
      expect(query.text).toContain('LEFT JOIN "public"."Company" AS "c"');
      expect(query.text).toContain('"c"."code" AS "companyCode"');
    });

    it('honours a per-entity schema override', () => {
      const query = buildSelect('items', { ...mapping, schema: 'inventory' }, 'public');
      expect(query.text).toContain('FROM "inventory"."Item" AS t');
    });

    it('refuses a mapping that selects nothing', () => {
      expect(() => buildSelect('items', { table: 'Item', columns: {} }, 'public')).toThrow(
        /selects no columns/,
      );
    });
  });

  describe('built-in profiles', () => {
    it.each(['oswar', 'prisma', 'snake'] as const)('%s declares every boundary entity', (profile) => {
      expect(Object.keys(IMS_MAPPING_PROFILES[profile]).sort()).toEqual(
        [...IMS_INBOUND_ENTITIES].sort(),
      );
    });

    it.each(['oswar', 'prisma', 'snake'] as const)('%s has no structural errors', (profile) => {
      const errors = validateMapping(IMS_MAPPING_PROFILES[profile]).filter(
        (issue) => issue.severity === 'error',
      );
      expect(errors).toEqual([]);
    });
  });

  describe('the oswar profile', () => {
    const oswar = IMS_MAPPING_PROFILES.oswar;

    it('reads masters from the tables the IMS actually has', () => {
      expect(oswar.items.table).toBe('materials');
      expect(oswar.companies.table).toBe('organizations');
      expect(oswar.warehouses.table).toBe('warehouses');
      expect(oswar.suppliers.table).toBe('suppliers');
      expect(oswar['material-transactions'].table).toBe('stock_transactions');
    });

    it('declares the four entities this IMS does not publish, with a reason', () => {
      for (const entity of ['products', 'sales-orders', 'work-orders', 'purchase-orders'] as const) {
        expect(unsupportedReason(oswar[entity])).toEqual(expect.stringContaining('IMS'));
      }
    });

    it('scopes every business entity to a tenant', () => {
      for (const entity of [
        'items',
        'suppliers',
        'warehouses',
        'stock',
        'material-transactions',
        'users',
      ] as const) {
        expect(oswar[entity].orgColumn).toBe('org_id');
      }
      // The IMS organisation *is* the company, so its own primary key is the tenant key.
      expect(oswar.companies.orgColumn).toBe('id');
    });

    it('derives stock from the ledger, because the IMS keeps no balance table', () => {
      const query = buildSelect(
        'stock',
        oswar.stock,
        'public',
        { orgId: 'org-1' },
      );
      expect(query.text).toContain('SUM(CASE WHEN');
      // The inbound set has to match the IMS's own STOCK_IN_TYPES, or every balance is wrong.
      expect(query.text).toContain("'OPENING', 'PURCHASE', 'RETURN_IN', 'ADJUSTMENT_IN', 'TRANSFER_IN'");
      expect(query.text).toContain('"public"."stock_transactions" s');
      expect(query.values).toContain('org-1');
    });
  });

  describe('tenant scoping', () => {
    const scoped: ImsEntityMapping = {
      table: 'materials',
      columns: { code: 'code' },
      orgColumn: 'org_id',
    };

    it('binds the tenant as a parameter rather than interpolating it', () => {
      const query = buildSelect('items', scoped, 'public', { orgId: 'org-7' });
      expect(query.text).toContain('t."org_id" = $1');
      expect(query.values[0]).toBe('org-7');
    });

    it('refuses to read a tenant-scoped entity with no tenant', () => {
      // Reading every organisation in a shared IMS is a data-protection incident, so this fails
      // loudly rather than returning a superset.
      expect(() => buildSelect('items', scoped, 'public', {})).toThrow(/IMS_ORG_ID is not set/);
    });
  });

  describe('unsupported entities', () => {
    const missing: ImsEntityMapping = {
      table: 'nothing',
      columns: { reference: 'id' },
      unsupported: 'This IMS has no work orders.',
    };

    it('never builds a query for one', () => {
      expect(() => buildSelect('work-orders', missing, 'public')).toThrow(/does not publish/);
    });

    it('is a warning, not an error, so the rest of the mapping still validates', () => {
      const issues = validateMapping({
        ...IMS_MAPPING_PROFILES.oswar,
        'work-orders': missing,
      }).filter((issue) => issue.entity === 'work-orders');
      expect(issues.every((issue) => issue.severity === 'warning')).toBe(true);
    });
  });

  describe('watermarks', () => {
    it('selects the change column under a fixed alias the driver can read', () => {
      const query = buildSelect(
        'items',
        { table: 'materials', columns: { code: 'code' }, changeColumn: 'updated_at' },
        'public',
      );
      // Without this the driver looked the watermark up by the IMS's column name, which the row
      // never carries — every read aliases its columns to canonical field names.
      expect(query.text).toContain(`t."updated_at" AS "${WATERMARK_ALIAS}"`);
    });
  });

  describe('overrides', () => {
    it('merges columns rather than replacing the whole entity', () => {
      const { mapping, overridden } = loadMapping({
        profile: 'prisma',
        json: JSON.stringify({ items: { table: 'InventoryItem', columns: { code: 'sku' } } }),
      });
      expect(mapping.items.table).toBe('InventoryItem');
      expect(mapping.items.columns.code).toBe('sku');
      // Untouched columns survive the override.
      expect(mapping.items.columns.name).toBe('name');
      expect(overridden).toEqual(['items']);
    });

    it('warns about an entity that is not part of the boundary', () => {
      const { warnings } = loadMapping({
        profile: 'prisma',
        json: JSON.stringify({ invoices: { table: 'Invoice', columns: { code: 'code' } } }),
      });
      expect(warnings.join(' ')).toContain('invoices');
    });

    it('warns rather than throws on malformed JSON', () => {
      const { warnings, mapping } = loadMapping({ profile: 'prisma', json: '{not json' });
      expect(warnings.join(' ')).toContain('not valid JSON');
      // The profile is still usable, which is the point: a bad override must not stop the API.
      expect(mapping.items.table).toBe('Item');
    });

    it('does not mutate the shared profile object', () => {
      loadMapping({
        profile: 'prisma',
        json: JSON.stringify({ items: { table: 'Somewhere' } }),
      });
      expect(IMS_MAPPING_PROFILES.prisma.items.table).toBe('Item');
    });
  });

  describe('validateMapping', () => {
    it('reports a missing required field', () => {
      const broken = structuredClone(IMS_MAPPING_PROFILES.prisma);
      delete broken.items.columns.code;
      const issues = validateMapping(broken);
      expect(issues).toContainEqual({
        entity: 'items',
        severity: 'error',
        message: 'Required field "code" has no column mapped',
      });
    });

    it('reports a column referring to an alias no join declares', () => {
      const broken = structuredClone(IMS_MAPPING_PROFILES.prisma);
      broken.items.columns.name = 'x.name';
      const issues = validateMapping(broken);
      expect(issues.some((issue) => issue.message.includes('alias "x"'))).toBe(true);
    });

    it('warns when an entity cannot be synced incrementally', () => {
      const noChange = structuredClone(IMS_MAPPING_PROFILES.prisma);
      delete noChange.items.changeColumn;
      const issues = validateMapping(noChange);
      expect(issues).toContainEqual({
        entity: 'items',
        severity: 'warning',
        message: 'No change column, so every sync of this entity is a full read',
      });
    });
  });
});
