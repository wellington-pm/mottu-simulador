const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'mottu.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS respostas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    dias TEXT NOT NULL,
    km TEXT NOT NULL,
    protecao TEXT NOT NULL,
    preco_min INTEGER NOT NULL,
    preco_estimado INTEGER NOT NULL,
    preco_max INTEGER NOT NULL,
    convertido INTEGER NOT NULL DEFAULT 0,
    criado_em TEXT NOT NULL DEFAULT (datetime('now')),
    atualizado_em TEXT
  )
`);

function inserirResposta({ sessionId, dias, km, protecao, precoMin, precoEstimado, precoMax }) {
  const stmt = db.prepare(`
    INSERT INTO respostas (session_id, dias, km, protecao, preco_min, preco_estimado, preco_max)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(sessionId, dias, km, protecao, precoMin, precoEstimado, precoMax);
  return Number(info.lastInsertRowid);
}

function marcarConversao(id) {
  const stmt = db.prepare(`
    UPDATE respostas SET convertido = 1, atualizado_em = datetime('now') WHERE id = ?
  `);
  const info = stmt.run(id);
  return info.changes > 0;
}

function listarRespostas() {
  return db.prepare('SELECT * FROM respostas ORDER BY id DESC').all();
}

function estatisticas() {
  const total = db.prepare('SELECT COUNT(*) AS n FROM respostas').get().n;
  const convertidos = db.prepare('SELECT COUNT(*) AS n FROM respostas WHERE convertido = 1').get().n;
  const porDias = db.prepare('SELECT dias, COUNT(*) AS n FROM respostas GROUP BY dias').all();
  const porKm = db.prepare('SELECT km, COUNT(*) AS n FROM respostas GROUP BY km').all();
  return { total, convertidos, porDias, porKm };
}

module.exports = { db, inserirResposta, marcarConversao, listarRespostas, estatisticas };
