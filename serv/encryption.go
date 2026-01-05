package serv

import (
	"fmt"
	"os"
	"golang.org/x/crypto/bcrypt"
)

func Hash_password(password string) string {
	hashed_password, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Fprintf(os.Stderr, "There is some error with hashig: %v", err)
	}

	return string(hashed_password)
}

// Проблема в генерации хеша (попробовать написать функцию дешифровки)
func Check_password(hashed_password string, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashed_password), []byte(password))
	if err != nil {
		fmt.Printf("Проверка прошла не успешно. Ошибка: %v\n (func Check_password)", err)
		return false
	}
	return true
}