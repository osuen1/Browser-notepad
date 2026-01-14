-- Active: 1767363543751@@127.0.0.1@5432@postgres
CREATE TABLE users (
    user_id serial PRIMARY KEY,
    username CHAR(30) UNIQUE NOT NULL,
    password TEXT NOT NULL
);

CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    text TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

ALTER TABLE users ADD COLUMN email CHAR(30);

CREATE TABLE folders (
	id INTEGER NOT NULL UNIQUE,
	user_id INTEGER NOT NULL,
	name varchar(30) NOT NULL,
	parent_id INTEGER NOT NULL,
	
	Foreign Key (id) REFERENCES users(user_id)
);