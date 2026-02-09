package serv

import (
	"regexp"
	"errors"
	"strings"
)

func ValidateEmail(email string) error {
	if email == "" {
		return errors.New("Email address is empty!")
	} else if len(email) > 30 || len(email) < 2 {
		return errors.New("Email address is too long or too short!")
	}

	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return errors.New("Invalid email address format!")
	}

	if strings.ContainsAny(email, ";<>\"'\\") {
		return errors.New("Uncorrect format email")
	}

	return nil
}