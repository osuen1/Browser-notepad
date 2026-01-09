package mail

import (
	"os"

	// "github.com/joho/godotenv"
	"gopkg.in/gomail.v2"
)

type Mail struct {
	dialer *gomail.Dialer
}

func New_Dialer() *Mail {
	return  &Mail{
		dialer: gomail.NewDialer("smtp.gmail.com", 587, "stepikfort@gmail.com", os.Getenv("MAIL_KEY")),
	}
}

func (m *Mail) Send_enter_mail(email string) error {
	mail := gomail.NewMessage()

	mail.SetHeader("From", "stepikfort@gmail.com")
	mail.SetHeader("To", email)
	mail.SetHeader("Subject", "Бета тест")
	mail.SetBody("text/html", "<h1>Поздравляем!</h1><p>Вы стали участником бета-теста.</p>")

	if err := m.dialer.DialAndSend(mail); err != nil {
		return err
	}
	
	return nil
}