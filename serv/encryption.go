package serv

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"encoding/json"

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

func Check_password(hashed_password string, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashed_password), []byte(password))
	if err != nil {
		fmt.Printf("Проверка прошла не успешно. Ошибка: %v\n (func Check_password)", err)
		return false
	}
	return true
}

func Generate_token() string {
	token := make([]byte, 32)
	if _, err := rand.Read(token); err != nil {
		fmt.Fprintf(os.Stderr, "There is some error with generating token: %v", err)
	}

	return base64.RawURLEncoding.EncodeToString(token)
}


func Generete_user_id() (string, error) {
	seed := make([]byte, 16)
	if _, err := rand.Read(seed); err != nil {
		fmt.Fprintf(os.Stderr, "There is some error with generating userid: %v", err)
		return "", err
	}

	return hex.EncodeToString(seed), nil
}

func SendJson(w http.ResponseWriter, s any) error {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(s); err != nil {
		return err
	}

	return nil
}

func DecodeJson(r *http.Request, v any) error {
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		return err
	}

	return nil
}