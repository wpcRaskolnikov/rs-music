CREATE TABLE IF NOT EXISTS music (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id TEXT NOT NULL,
    src TEXT NOT NULL,
    title TEXT,
    artist TEXT,
    album TEXT,
    duration INTEGER,
    UNIQUE (playlist_id, src)
);

CREATE TABLE IF NOT EXISTS playlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL UNIQUE,
    playlist_id TEXT NOT NULL UNIQUE
);
