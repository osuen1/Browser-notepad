package db

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

// Pool возврещент пулл соеденений, которые можно использвоать для запросов
// При вызове .Close() закрывает соединение и возвращает его в пулл для повторного использования
func Db_connect() (pool *pgxpool.Pool) {
	err1 := godotenv.Load()
	if err1 != nil {
		fmt.Print("An error with loading .env file")
	}

	pool, err := pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to create connection pool: %v\n", err)
		os.Exit(1)
	}
	
	return pool
}

func Add_user(pool *pgxpool.Pool, login string, password string, email string) (status string) {
	row := pool.QueryRow(context.Background(), "INSERT INTO users (username, password, email) VALUES ($1, $2, $3)", login, password, email)
	if err := row.Scan(&status); err != nil {
		//
	}

	return status
}

// Использовать для проверки существования пользователя
func Check_user(pool *pgxpool.Pool, login string) (id int, username string, password string) {
	row := pool.QueryRow(context.Background(), "SELECT user_id, username, password FROM users WHERE username = $1", login)
	if err := row.Scan(&id, &username, &password); err != nil {
		// Эта функция должна прокидывать на клиент ошибку отсутствия пользоателя с требованием зарегистрироаться
		fmt.Fprintf(os.Stderr, "There is an error in check_user: %v", err)
	}

	return id, username, password
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