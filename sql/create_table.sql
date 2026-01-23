-- Active: 1767363543751@@127.0.0.1@5432@postgres
CREATE TABLE users (
    user_id serial PRIMARY KEY,
    username CHAR(30) UNIQUE NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE note (
    id varchar(20) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    text TEXT NOT NULL,
    folder_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    tags TEXT[],
    FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
CREATE TABLE folders (
	id INTEGER NOT NULL UNIQUE,
	user_id INTEGER NOT NULL,
	name varchar(30) NOT NULL,
	parent_id INTEGER NOT NULL,
	
	Foreign Key (id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS settings
(
    id serial NOT NULL,
    user_id integer NOT NULL,
    language character varying(2) NOT NULL,
    theme character varying(2) NOT NULL,
    PRIMARY KEY (id),
    
    Foreign Key (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS todo
(
    id TEXT NOT NULL,
    user_id integer NOT NULL,
    text character varying(70) NOT NULL,
    PRIMARY KEY (id),
    Foreign Key (user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS tags
(
    id serial NOT NULL PRIMARY KEY UNIQUE,
    note_id character varying(20) NOT NULL,
    tags text[] NOT NULL,
    FOREIGN KEY(note_id) REFERENCES note(id) ON DELETE CASCADE
);

ALTER TABLE todo ADD COLUMN isDone BOOLEAN;

ALTER TABLE users ADD COLUMN email CHAR(30);
ALTER TABLE users ADD COLUMN token CHAR(50);
ALTER TABLE notes ADD COLUMN tags []TEXT;