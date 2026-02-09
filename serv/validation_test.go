package serv

import (
	"testing"
)

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		name    string
		email   string
		wantErr bool
	}{
		// ✅ Валидные email
		{"valid simple email", "test@example.com", false},
		{"valid email with dots", "user.name@example.com", false},
		{"valid email with plus", "user+tag@example.com", false},
		{"valid email with dash", "user-name@example.com", false},
		{"valid email with numbers", "user123@example456.com", false},
		{"valid email subdomain", "user@mail.example.com", false},
		{"valid email long domain", "user@example.co.uk", false},

		// ❌ Невалидные email
		{"empty email", "", true},
		{"missing @", "userexample.com", true},
		{"missing domain", "user@", true},
		{"missing username", "@example.com", true},
		{"double @", "user@@example.com", true},
		{"no TLD", "user@example", true},
		{"spaces", "user name@example.com", true},
		{"special chars in domain", "user@exam ple.com", true},
		{"too long", "a" + string(make([]byte, 250)) + "@example.com", true},

		// 🛡️ Injection атаки
		{"SQL injection attempt", "admin'; DROP TABLE users;--@example.com", true},
		{"XSS attempt", "user<script>@example.com", true},
		{"semicolon", "user;@example.com", true},
		{"quotes", "user\"@example.com", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateEmail(tt.email)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateEmail(%q) error = %v, wantErr %v", tt.email, err, tt.wantErr)
			}
		})
	}
}