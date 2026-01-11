package mail

import (
	"os"
	"fmt"
	// "net/url"
	
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

func (m *Mail) Send_forgot_password_mail(email string, token string) error {
	mail := gomail.NewMessage()
	// encrypted_token := url.QueryEscape(token)
	
	// link := fmt.Sprintf("http://localhost:3030/resetpassword?param=%s", encrypted_token)
	
	link := "http://localhost:3030/resetpassword"

	mail.SetHeader("From", "stepikfort@gmail.com")
	mail.SetHeader("To", email)
	mail.SetHeader("Subject", "Восстановление пароля")
	mail.SetBody("text/html", fmt.Sprintf("<h1>Восстановление пароля</h1><p>Вы запросили восстановление пароля. Это можно сделать по <a href=%s>ссылке</a></p><p>Если вы не запрашивали восстановление пароля, то просто проигнорируйте это письмо.</p>", link))

	if err := m.dialer.DialAndSend(mail); err != nil {
		return err
	}
	
	return nil
}