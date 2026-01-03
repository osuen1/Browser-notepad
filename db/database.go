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

func Add_user(pool *pgxpool.Pool, login string, password string) (status string) {
	row := pool.QueryRow(context.Background(), "INSERT INTO users (username, password) VALUES ($1, $2)", login, password)
	if err := row.Scan(&status); err != nil {
		fmt.Fprint(os.Stderr, err)
		os.Exit(1)
	}

	return status
}