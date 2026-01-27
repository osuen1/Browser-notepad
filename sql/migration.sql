ALTER TABLE profile
DROP CONSTRAINT profile_user_id_fkey;

ALTER TABLE note
DROP CONSTRAINT note_user_id_fkey;

ALTER TABLE folders
DROP CONSTRAINT folders_user_id_fkey;

ALTER TABLE files
DROP CONSTRAINT files_user_id_fkey;

ALTER TABLE todo
DROP CONSTRAINT todo_user_id_fkey;

ALTER TABLE notes
DROP CONSTRAINT notes_user_id_fkey;

ALTER TABLE statistics
DROP CONSTRAINT statistics_user_id_fkey;

ALTER TABLE settings
DROP CONSTRAINT settings_user_id_fkey;


ALTER TABLE profile
ALTER COLUMN user_id TYPE VARCHAR(16)
USING user_id::VARCHAR;

ALTER TABLE settings
ALTER COLUMN user_id TYPE VARCHAR(16)
USING user_id::VARCHAR;

ALTER TABLE statistics
ALTER COLUMN user_id TYPE VARCHAR(16)
USING user_id::VARCHAR;

ALTER TABLE notes
ALTER COLUMN user_id TYPE VARCHAR(16)
USING user_id::VARCHAR;

ALTER TABLE todo
ALTER COLUMN user_id TYPE VARCHAR(16)
USING user_id::VARCHAR;

ALTER TABLE files
ALTER COLUMN user_id TYPE VARCHAR(16)
USING user_id::VARCHAR;

ALTER TABLE folders
ALTER COLUMN user_id TYPE VARCHAR(16)
USING user_id::VARCHAR;

ALTER TABLE note
ALTER COLUMN user_id TYPE VARCHAR(16)
USING user_id::VARCHAR;


ALTER TABLE users
ALTER COLUMN user_id TYPE VARCHAR(16)
USING user_id::VARCHAR;

ALTER TABLE profile
ADD CONSTRAINT profile_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(user_id)
ON DELETE CASCADE;

ALTER TABLE settings
ADD CONSTRAINT settings_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(user_id)
ON DELETE CASCADE;

ALTER TABLE note
ADD CONSTRAINT note_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(user_id)
ON DELETE CASCADE;

ALTER TABLE folders
ADD CONSTRAINT folders_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(user_id)
ON DELETE CASCADE;

ALTER TABLE files
ADD CONSTRAINT files_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(user_id)
ON DELETE CASCADE;

ALTER TABLE todo
ADD CONSTRAINT todo_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(user_id)
ON DELETE CASCADE;

ALTER TABLE notes
ADD CONSTRAINT notes_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(user_id)
ON DELETE CASCADE;

ALTER TABLE statistics
ADD CONSTRAINT statistics_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES users(user_id)
ON DELETE CASCADE;

