package db

import (
	"context"
	"fmt"
	"os"

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

func Add_user(pool *pgxpool.Pool, login string, password string, email string, token string) (status bool) {
	row := pool.QueryRow(context.Background(), "INSERT INTO users (username, password, email, token) VALUES ($1, $2, $3, $4)", login, password, email, token)
	if err := row.Scan(&status); err != nil {
		return false
	}

	return true
}

func Find_user(pool *pgxpool.Pool, login string) (id int, username string, password string, email string) {
	row := pool.QueryRow(context.Background(), "SELECT user_id, username, password, email FROM users WHERE username = $1", login)
	if err := row.Scan(&id, &username, &password, &email); err != nil {
		// Эта функция должна прокидывать на клиент ошибку отсутствия пользоателя с требованием зарегистрироаться
		fmt.Fprintf(os.Stderr, "There is an error in check_user: %v", err)
	}

	return id, username, password, email
}

func Add_note(pool *pgxpool.Pool, user_id int, date string, data string) error {
	// Возможно, будем использовать разные таблицы для разных пользователей в будущем
	// row := pool.QueryRow(context.Background(), "CREATE TABLE IF NOT EXISTS notes (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, date TEXT NOT NULL, text TEXT NOT NULL, FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE)")

	row := pool.QueryRow(context.Background(), "INSERT INTO notes (user_id, date, text) VALUES ($1, $2, $3)", user_id, date, data)
	if err := row.Scan(); err != nil {
		//
	}
	return nil
}

func Get_notes(pool *pgxpool.Pool, user_id int) (notes []string) {
	rows, err := pool.Query(context.Background(), "SELECT date, data FROM notes WHERE user_id = $1", user_id)
	if err != nil {
		fmt.Print("An error in Get_notes: ", err)
	}

	var date string
	var data string

	for rows.Next() {
		if err := rows.Scan(&date, &data); err != nil {
			fmt.Print("An error in scaning variables: ", err)
		}
		notes_details := []string{date, data}

		notes = append(notes, notes_details...)
	}

	return notes
}

func Delete_note(pool *pgxpool.Pool, note_id int) {
	row := pool.QueryRow(context.Background(), "DELETE FROM notes WHERE id = $1", note_id)
	if err := row.Scan(); err != nil {
		fmt.Print("An error in Delete_note: ", err)
	}
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

func Update_token(pool *pgxpool.Pool, user_id int, token string) error {
	_, err := pool.Exec(context.Background(), "UPDATE users SET token = $1 WHERE user_id = $2", token, user_id)
	if err != nil {
		return err
	}
	return nil
}

func Get_token(pool *pgxpool.Pool, email string) (token string, err error) {
	row := pool.QueryRow(context.Background(), "SELECT token FROM users WHERE email = '$1'", email)
	if err := row.Scan(&token); err != nil {
		if err == pgx.ErrNoRows {
			return "", err
		}
	}
	return token, nil
}