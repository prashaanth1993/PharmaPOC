const { unwrap, escapeZcql, query, insertRow } = require('../src/db');

describe('unwrap', () => {
  test('strips the table-name wrapper from ZCQL rows', () => {
    const raw = [{ Assets: { ROWID: '1', NAME: 'Foo' } }, { Assets: { ROWID: '2', NAME: 'Bar' } }];
    expect(unwrap(raw, 'Assets')).toEqual([{ ROWID: '1', NAME: 'Foo' }, { ROWID: '2', NAME: 'Bar' }]);
  });

  test('drops rows missing the table key', () => {
    expect(unwrap([{ Assets: { ROWID: '1' } }, {}], 'Assets')).toEqual([{ ROWID: '1' }]);
  });
});

describe('escapeZcql', () => {
  test('doubles single quotes so ZCQL string literals stay valid', () => {
    expect(escapeZcql("O'Brien")).toBe("O''Brien");
  });

  test('passes through strings with no quotes unchanged', () => {
    expect(escapeZcql('Marketing')).toBe('Marketing');
  });
});

describe('query', () => {
  test('executes ZCQL and unwraps the result', async () => {
    const fakeApp = { zcql: () => ({ executeZCQLQuery: jest.fn().mockResolvedValue([{ Assets: { ROWID: '1', NAME: 'Foo' } }]) }) };
    const rows = await query(fakeApp, 'SELECT * FROM Assets', 'Assets');
    expect(rows).toEqual([{ ROWID: '1', NAME: 'Foo' }]);
  });
});

describe('insertRow', () => {
  test('delegates to datastore().table(name).insertRow(row)', async () => {
    const insertRowMock = jest.fn().mockResolvedValue({ ROWID: '42' });
    const fakeApp = { datastore: () => ({ table: () => ({ insertRow: insertRowMock }) }) };
    const result = await insertRow(fakeApp, 'Assets', { NAME: 'Foo' });
    expect(insertRowMock).toHaveBeenCalledWith({ NAME: 'Foo' });
    expect(result).toEqual({ ROWID: '42' });
  });
});
