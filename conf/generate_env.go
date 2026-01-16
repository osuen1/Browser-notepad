// Генератор файла переменной окружения

package main

import (
	"os"
	"bufio"
	"fmt"
)

func main () {
	file, err := os.Create(".env")
	if err != nil {
		fmt.Println("Error creating file:", err)
		return
	}
	defer file.Close()
	
	writer := bufio.NewWriter(file)
	defer writer.Flush()
	
	writer.WriteString("PORT = 3030\n")
	fmt.Fprintf(writer,"DATABASE_URL=%v", "postgres://user:password@localhost:5432/dbname\n")
	fmt.Fprintf(writer,"COOKIE_KEY=%v", "5fe8ce8c262ca73a7993e41a71e5b7709eee8ae8c03b128d1ca62892377d8ab3\n")
	fmt.Fprintf(writer,"MAIL_KEY=%v", "сгенерируйте_сами....")
}