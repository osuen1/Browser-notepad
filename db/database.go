package db

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/joho/godotenv"
)

// Pool возврещент пулл соеденений, которые можно использвоать для запросов
// При вызове .Close() закрывает соединение и возвращает его в пулл для повторного использования
func Db_connect() (pool *pgxpool.Pool) {
	// err1 := godotenv.Load()
	// if err1 != nil {
	// 	fmt.Print("An error with loading .env file")
	// }

	pool, err := pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to create connection pool: %v\n", err)
	}

	return pool
}

func Add_user(pool *pgxpool.Pool, user_id string, login string, password string, email string, token string) (status bool) {
	row := pool.QueryRow(context.Background(), "INSERT INTO users (user_id, username, password, email, token) VALUES ($1, $2, $3, $4, $5)", user_id, login, password, email, token)
	if err := row.Scan(&status); err != nil {
		return false
	}

	return true
}

func Find_user(pool *pgxpool.Pool, login string) (id string, username string, password string, email string) {
	row := pool.QueryRow(context.Background(), "SELECT user_id, username, password, email FROM users WHERE username = $1", login)
	if err := row.Scan(&id, &username, &password, &email); err != nil {
		// Эта функция должна прокидывать на клиент ошибку отсутствия пользоателя с требованием зарегистрироаться
		fmt.Fprintf(os.Stderr, "There is an error in check_user: %v", err)
	}

	return id, username, password, email
}

// Логика заметок

func Add_note(pool *pgxpool.Pool, note_id string, user_id string, date string, data string, folder_id int, title string, tags []string) error {
	// Возможно, будем использовать разные таблицы для разных пользователей в будущем
	// row := pool.QueryRow(context.Background(), "CREATE TABLE IF NOT EXISTS notes (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, date TEXT NOT NULL, text TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE)")

	_, err := pool.Exec(context.Background(), "INSERT INTO note (id, user_id, date, text, folder_id, title, tags) VALUES ($1, $2, $3, $4, $5, $6, $7)", note_id, user_id, date, data, folder_id, title, tags)
	if err != nil {
		return fmt.Errorf("error adding note: %v", err)
	}
	return nil
}

func Get_notes(pool *pgxpool.Pool, user_id string) ([][]string, [][]string, []int) {
	rows, err := pool.Query(context.Background(), "SELECT id, title, date, text, folder_id, tags FROM note WHERE user_id = $1", user_id)
	if err != nil {
		fmt.Print("An error in Get_notes: ", err)
	}

	var notes_details [][]string
	var all_tags [][]string

	var folder_id_array []int
	var note_id string
	var title string
	var date string
	var data string
	var folder_id int
	var tags []string

	for rows.Next() {
		if err := rows.Scan(&note_id, &title, &date, &data, &folder_id, &tags); err != nil {
			fmt.Print("An error in scaning variables: ", err)
		}
		notes_details = append(notes_details, []string{note_id, title, date, data})
		folder_id_array = append(folder_id_array, folder_id)
		all_tags = append(all_tags, tags)
	}

	return notes_details, all_tags, folder_id_array
}

func Delete_note(pool *pgxpool.Pool, note_id string) error {
	if _, err := pool.Exec(context.Background(), "DELETE FROM note WHERE id = $1", note_id); err != nil {
		fmt.Print("An error in Delete_note: ", err)
	}
	return nil
}

func Update_note(pool *pgxpool.Pool, note_id string, new_data string, new_tags []string) error {
	if _, err := pool.Exec(context.Background(), "UPDATE note SET text = $1, tags = $2 WHERE id = $3", new_data, new_tags, note_id); err != nil {
		fmt.Print("An error in Update_note: ", err)
		return err
	}
	return nil
}

func Check_note(pool *pgxpool.Pool, note_id string) (bool, error) {
	var result bool

	err := pool.QueryRow(context.Background(), "SELECT EXISTS(SELECT 1 FROM note WHERE id = $1)", note_id).Scan(&result)
	if err != nil {
		fmt.Print("An error in Check_note: ", err)
		return false, err
	}
	return result, nil
}

// Логика папок

func Create_folder(pool *pgxpool.Pool, folder_id int, folder_name string, user_id string, parent_id int) error {
	if _, err := pool.Exec(context.Background(), "INSERT INTO folders (id, user_id, name, parent_id) VALUES ($1, $2, $3, $4)", folder_id, user_id, folder_name, parent_id); err != nil {
		fmt.Print("An error in Create_folder: ", err)
	}

	return nil
}

func Get_folders(pool *pgxpool.Pool, user_id string) [][]string {
	rows, err := pool.Query(context.Background(), "SELECT id, name, parent_id FROM folders WHERE user_id = $1", user_id)
	if err != nil {
		fmt.Print("An error in Get_folders: ", err)
		return nil
	}
	defer rows.Close()

	var info [][]string
	var folder_id int
	var name string
	var parent_id int

	for rows.Next() {

		if err := rows.Scan(&folder_id, &name, &parent_id); err != nil {
			fmt.Print("An error in Get_folders: ", err)
			return nil
		}

		info = append(info, []string{strconv.Itoa(folder_id), name, strconv.Itoa(parent_id)})
	}

	return info
}

func Delete_folder(pool *pgxpool.Pool, folder_id int) error {
	if _, err := pool.Exec(context.Background(), "DELETE FROM folders WHERE id = $1", folder_id); err != nil {
		return fmt.Errorf("An error in Delete_folder: %v", err)
	}

	if _, err := pool.Exec(context.Background(), "DELETE FROM note WHERE folder_id = $1", folder_id); err != nil {
		return fmt.Errorf("An error in Delete_folder: %v", err)
	}

	return nil
}

func Update_password(pool *pgxpool.Pool, email string, new_password string) error {
	_, err := pool.Exec(context.Background(), "UPDATE users SET password = $1 WHERE email = $2", new_password, email)
	if err != nil {
		return err
	}
	return nil
}

func Check_username(pool *pgxpool.Pool, username string) (bool, error) {
	// вернет false если пользователь найден
	var result bool

	err := pool.QueryRow(context.Background(), "SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)", username).Scan(&result)
	if err != nil {
		return false, fmt.Errorf("An error in Check_username: %v", err)
	}

	fmt.Print(!result)
	return !result, nil
}

func Update_token(pool *pgxpool.Pool, user_id string, token string) error {
	_, err := pool.Exec(context.Background(), "UPDATE users SET token = $1 WHERE user_id = $2", token, user_id)
	if err != nil {
		return err
	}
	return nil
}

func Get_token(pool *pgxpool.Pool, email string) (token string, err error) {
	row := pool.QueryRow(context.Background(), "SELECT token FROM users WHERE email = $1", email)
	if err := row.Scan(&token); err != nil {
		if err == pgx.ErrNoRows {
			return "", err
		}
	}
	return token, nil
}

func Add_Todo(pool *pgxpool.Pool, id string, user_id string, text string, isDone bool) error {
	if _, err := pool.Exec(context.Background(), "INSERT INTO todo (id, user_id, text, isdone) VALUES ($1, $2, $3, $4)", id, user_id, text, isDone); err != nil {
		fmt.Print("An error in Add_Todo: ", err)
		return err
	}
	return nil
}

func Get_todo(pool *pgxpool.Pool, user_id string) ([][]interface{}, error) {

	rows, err := pool.Query(context.Background(), "SELECT id, text, isdone FROM todo WHERE user_id = $1", user_id)
	if err != nil {
		fmt.Print("An error in Get_todo: ", err)
		return nil, err
	}

	var todos [][]interface{}
	var id string
	var text string
	var isDone bool

	for rows.Next() {
		if err := rows.Scan(&id, &text, &isDone); err != nil {
			fmt.Print("An error in scaning variables: ", err)
			return nil, err
		}
		todos = append(todos, []interface{}{id, text, isDone})
	}

	return todos, nil
}

func Delete_todo(pool *pgxpool.Pool, todo_id string) error {
	if _, err := pool.Exec(context.Background(), "DELETE FROM todo WHERE id = $1", todo_id); err != nil {
		fmt.Print("An error in Delete_todo: ", err)
		return err
	}
	return nil
}

func Add_tag(pool *pgxpool.Pool, note_id string, tags []string) error {
	if _, err := pool.Exec(context.Background(), "INSERT INTO tags (note_id, tags) VALUES ($1, $2)", note_id, tags); err != nil {
		fmt.Print("An error in Add_tag: ", err)
		return err
	}
	return nil
}

func Get_tags(pool *pgxpool.Pool, note_id string) ([]string, error) {
	var tags []string

	err := pool.QueryRow(context.Background(), "SELECT tags FROM tags WHERE note_id = $1", note_id).Scan(&tags)
	if err != nil {
		if err == pgx.ErrNoRows {
			// fmt.Print("An error in Get_tags: ", err)
			return []string{}, err
		}
		return nil, err
	}

	return tags, nil
}

func Update_tags_in_note(pool *pgxpool.Pool, id_note string, tags []string) error {
	if _, err := pool.Exec(context.Background(), "UPDATE tags SET tags = $1 WHERE note_id = $2", tags, id_note); err != nil {
		fmt.Print("An error in Update_tags_in_note: ", err)
		return err
	}

	return nil
}

func Upload_file(pool *pgxpool.Pool, file_name string, file_size int, file_type string, folder_id int, user_id string, data []byte) error {
	if _, err := pool.Exec(context.Background(), "INSERT INTO files (user_id, folder_id, file_name, file_size, file_type, data) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT(user_id, folder_id, file_name) DO UPDATE SET file_size=$4, data=$6", user_id, folder_id, file_name, file_size, file_type, data); err != nil {
		fmt.Print("An error in Upload_file: ", err)
		return err
	}

	return nil
}

func Get_files(pool *pgxpool.Pool, user_id string) ([][]interface{}, error) {
	rows, err := pool.Query(context.Background(), "SELECT file_name, file_size, file_type, folder_id, data FROM files WHERE user_id = $1 ORDER BY created_at DESC", user_id)
	if err != nil {
		fmt.Print("An error in Get_files: ", err)
		return nil, err
	}

	var files [][]interface{}
	var file_name string
	var file_size int
	var file_type string
	var folder_id int
	var data []byte

	for rows.Next() {
		if err := rows.Scan(&file_name, &file_size, &file_type, &folder_id, &data); err != nil {
			fmt.Print("An error in scaning variables: ", err)
			return nil, err
		}

		files = append(files, []interface{}{
			folder_id,
			file_name,
			file_size,
			file_type,
			data,
		})
	}

	return files, nil
}

func Delete_file(pool *pgxpool.Pool, user_id string, file_name string, folder_id int) error {
	if _, err := pool.Exec(context.Background(), "DELETE FROM files WHERE user_id = $1 AND file_name = $2 AND folder_id = $3", user_id, file_name, folder_id); err != nil {
		fmt.Print("An error in Delete_file: ", err)
		return err
	}
	return nil
}

func Add_user_statistics(pool *pgxpool.Pool, user_id string, goals string) error {
	if _, err := pool.Exec(context.Background(), "INSERT INTO statistics (user_id, goals) VALUES ($1, $2)", user_id, goals); err != nil {
		fmt.Print("An error in Add_user_statistics: ", err)
		return err
	}

	return nil
}

func Add_profile(pool *pgxpool.Pool, email string, theme string, language string, username string) error {
	if theme == "" {
		theme = "dark"
	}

	if language == "" {
		language = "ru"
	}

	user_id := pool.QueryRow(context.Background(), "SELECT user_id FROM users WHERE username = $1", username).Scan()
	if user_id != nil {
		if user_id == pgx.ErrNoRows {
			fmt.Print("User not found", user_id)
			return user_id
		}
	}

	if _, err := pool.Exec(context.Background(),
		"INSERT INTO profile (user_id, email, theme, language, username) VALUES ($1, $2, $3, $4, $5)",
		user_id, email, theme, language, username); err != nil {
		fmt.Print("An error in Add_profile: ", err)
		return err
	}

	return nil
}

func Check_profile(pool *pgxpool.Pool, user_id string) (bool, error) {
	var exists bool

	err := pool.QueryRow(context.Background(), "SELECT EXISTS(SELECT 1 FROM profile WHERE user_id = $1)", user_id).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("An error in Check_profile: %v", err)
	}

	return exists, nil
}

func Profile_update(pool *pgxpool.Pool, user_id string, field string, value string) error {
	allowedFields := map[string]struct{}{
		"email":    struct{}{},
		"theme":    struct{}{},
		"language": struct{}{},
		"username": struct{}{},
	}

	if _, ok := allowedFields[field]; !ok {
		return fmt.Errorf("Invalid field name: %s", field)
	}

	if _, err := pool.Exec(context.Background(), "UPDATE profile SET "+field+" = $1 WHERE user_id = $2", value, user_id); err != nil {
		fmt.Print("An error in Profile_update: ", err)
		return err
	}

	return nil
}

func Delete_profile(pool *pgxpool.Pool, user_id string) error {
	if _, err := pool.Exec(context.Background(), "DELETE FROM profile WHERE user_id = $1", user_id); err != nil {
		fmt.Print("An error in Delete_profile: ", err)
		return err
	}

	return nil
}

func Get_profile(pool *pgxpool.Pool, user_id string) ([]string, error) {
	var email string
	var theme string
	var language string
	var username string

	err := pool.QueryRow(context.Background(), "SELECT email, theme, language, username FROM profile WHERE user_id = $1", user_id).Scan(&email, &theme, &language, &username)
	if err != nil {
		fmt.Print("An error in Get_profile: ", err)
		return nil, err
	}

	return []string{email, theme, language, username}, nil
}

func Add_event(pool *pgxpool.Pool, user_id string, eventDate string, title string, priority string, date string, place string) error {
	if _, err := pool.Exec(context.Background(),
		"INSERT INTO events (user_id, eventdate, title, priority, date, place) VALUES ($1, $2, $3, $4, $5, $6)",
		user_id, eventDate, title, priority, date, place); err != nil {
		fmt.Print("An error in Add_event: ", err)
		return err
	}
	return nil
}

func Get_events(pool *pgxpool.Pool, user_id string) ([][]string, error) {
	rows, err := pool.Query(context.Background(), "SELECT eventdate, title, priority, date, place FROM events WHERE user_id = $1", user_id)
	if err != nil {
		fmt.Print("An error in Get_events: ", err)
		return nil, err
	}

	var eventsArray [][]string
	var eventDate string
	var title string
	var priority string
	var date string
	var place string

	for rows.Next() {
		if err := rows.Scan(&eventDate, &title, &priority, &date, &place); err != nil {
			fmt.Print("An error in scan vars (Get_events): ", err)
			return nil, err
		}
		
		eventsArray = append(eventsArray, []string{eventDate, title, priority, date, place})
	}

	return eventsArray, nil
}

func Delete_Event(pool *pgxpool.Pool, user_id string, title string) error {
	if _, err := pool.Exec(context.Background(), "DELETE FROM events WHERE user_id = $1 AND title = $2", user_id, title); err != nil {
		fmt.Print("An error in Delete_Event :", err)
		return err
	}

	return nil
}

func Update_priority(pool *pgxpool.Pool, priority string, title string, user_id string) error {
	if _, err := pool.Exec(context.Background(), "UPDATE events SET priority = $1 WHERE title = $2 AND user_id = $3", priority, title, user_id); err != nil {
		fmt.Print("An error in Update_priority: ", err)
		return err
	}

	return nil
}

func Update_folder_id(pool *pgxpool.Pool, newParentId int, folderId int) error {
	if _, err := pool.Exec(context.Background(), "UPDATE folders SET parent_id = $1 WHERE folder_id = $2", newParentId, folderId); err != nil {
		fmt.Print("An error in Update_folder_id: ", err)
		return err
	}

	return nil
}

func Update_notes_folder(pool *pgxpool.Pool, noteId string, newFolderId int) error {
	if _, err := pool.Exec(context.Background(), "UPDATE note SET folder_id = $1 WHERE user_id = $2", newFolderId, noteId); err != nil {
		fmt.Print("An error in Update_notes_folder: ", err)
		return err
	}

	return nil
}

func Update_file_folder(pool *pgxpool.Pool, file_name string, user_id string, newFolderId int) error {
	if _, err := pool.Exec(context.Background(), "UPDATE files SET folder_id = $1 WHERE file_name = $2 AND user_id = $3", newFolderId, file_name, user_id); err != nil {
		fmt.Print("An error in Update_file_folder: ", err)
		return err
	}

	return nil
}
