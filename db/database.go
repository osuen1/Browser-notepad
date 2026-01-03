package db

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func Db_connect() {
	url := ""
	conn, err := pgx.Connect(context.Background(), url)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Unable to connect to database: %v\n", err)
		os.Exit(1)
	}

	defer conn.Close(context.Background())

	var name string
	var password string
	err = conn.QueryRow(context.Background(), "select * from users", 42).Scan(&name, &password)
	if err != nil {
		fmt.Fprintf(os.Stderr, "QueryRow failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(name)
}
