'use strict';

function unwrap(rows, tableName) {
  return rows.map((r) => r[tableName]).filter(Boolean);
}

function convertBooleanFields(row, booleanColumns = []) {
  const result = { ...row };
  booleanColumns.forEach((col) => {
    if (col in result) result[col] = result[col] === 'true' || result[col] === true;
  });
  return result;
}

function escapeZcql(value) {
  return String(value).replace(/'/g, "''");
}

async function query(app, zcqlString, tableName) {
  const rows = await app.zcql().executeZCQLQuery(zcqlString);
  return unwrap(rows, tableName);
}

async function insertRow(app, tableName, row) {
  return app.datastore().table(tableName).insertRow(row);
}

async function insertRows(app, tableName, rows) {
  return app.datastore().table(tableName).insertRows(rows);
}

async function updateRow(app, tableName, row) {
  return app.datastore().table(tableName).updateRow(row);
}

module.exports = { unwrap, convertBooleanFields, escapeZcql, query, insertRow, insertRows, updateRow };
