package serv

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"regexp"

	"github.com/gorilla/sessions"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"server/db"
	"server/mail"
)

type NoteData struct {
	User_id int    `json:"user_id"`
	Date    string `json:"Date"`
	Data    string `json:"Data"`
	ID_note string `json:"ID_note"`
}

type Login_info struct { // парсим приходящий от js json
	Email       string `json:"Email"`
	Login       string `json:"Login"`
	Password    string `json:"Password"`
	NewPassword string `json:"NewPassword"`
}

type Login_response struct {
	User_id int    `json:"user_id"`
	Status  bool   `json:"status"`
	Message string `json:"message,omitempty"`
}

type ArrayInfo struct { // создаем структуру, которая создает срез для временного хранения информации (будет заменено базой данных)
	data []string
}

type Server struct {
	db             *pgxpool.Pool
	cookie_handler *sessions.CookieStore
}

var tmpl = template.Must(template.ParseFiles("templates/index.html"))
var log_page = template.Must(template.ParseFiles("templates/login.html"))
var register_page = template.Must(template.ParseFiles("templates/register.html"))
var new_page = template.Must(template.ParseFiles("templates/new_page.html"))
var forgot_password_page = template.Must(template.ParseFiles("templates/forgot-password.html"))
var resetPasswordPage = template.Must(template.ParseFiles("templates/reset-password.html"))

var info ArrayInfo // создаем элемент структуры (массив, состоящий из data.TextNote)
var server Server

func init_server() {
	if err := godotenv.Load(); err != nil {
		fmt.Print(err)
	}

	if server.db == nil {
		server.db = db.Db_connect()
	}

	if server.cookie_handler == nil {
		key, _ := hex.DecodeString(os.Getenv("COOKIE_KEY"))
		server.cookie_handler = sessions.NewCookieStore(key)
	}
}

// индекс уйдет под отрисовку лендинга
func IndexHandler(w http.ResponseWriter, r *http.Request) { // отрисовка главной страницы блокнота (с полем вводе новой заметки)
	var data NoteData

	if r.Method == http.MethodGet && server.cookie_handler != nil {
		tmpl.Execute(w, nil) // передача HTML документа клиентскому серверу
	} else {
		http.Error(w, "u not login", http.StatusForbidden)
	}

	if r.Method == http.MethodPost && server.cookie_handler != nil { // если сервер отправляет JSON - обрабатываем

		decoder := json.NewDecoder(r.Body)            // декодируем JSON с клиента
		if err := decoder.Decode(&data); err != nil { // записываем данные из JSON в структуру Note
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		info.data = append(info.data, data.Data)      // заполняем массив текстом, который ввел пользователь
		fmt.Printf("Received JSON: %+v\n", info.data) // выводим данные в консоль
	}
}

// Отрисовка страницы заметок
func NoteHandler(w http.ResponseWriter, r *http.Request) { // отрисовка вторичной страницы блокнота (со списком всех заметок)
	if r.Method == http.MethodGet && server.cookie_handler != nil {
		new_page.Execute(w, nil)
	} else if server.cookie_handler == nil {
		http.Error(w, "u not login", http.StatusForbidden)
	}
}

// Получение заметок
func Get_notes_handler(w http.ResponseWriter, r *http.Request) {
	var data NoteData

	if r.Method == http.MethodPost {
		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&data); err != nil {
			fmt.Print("An error in Get_notes_handler: ", err)
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}

		if server.db != nil {
			notes := db.Get_notes(server.db, data.User_id)
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(notes)
		} else {
			http.Error(w, "u not login", http.StatusForbidden)
		}
	}
}

func Create_note_handler(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req NoteData

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		fmt.Printf("Ошибка декодирования: %v\n", err)
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if server.db != nil {
		err := db.Add_note(server.db, req.ID_note, req.User_id, req.Date, req.Data)
		if err != nil {
			fmt.Printf("Ошибка записи в БД: %v\n", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
	} else {
		http.Error(w, "Forbidden: Database not initialized or user not logged in", http.StatusForbidden)
	}
}

func Delete_note_handler(w http.ResponseWriter, r *http.Request) {
	var data NoteData

	if r.Method == http.MethodPost {
		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&data); err != nil {
			fmt.Print("An error in Create_note: ", err.Error(), "\n")
		}

		if server.db != nil {
			db.Delete_note(server.db, data.ID_note)
		} else {
			http.Error(w, "u not login", http.StatusForbidden)
		}
	}
}

func LoginHandler(w http.ResponseWriter, r *http.Request) {
	var data_json Login_info
	init_server()

	if r.Method == http.MethodGet {
		log_page.Execute(w, nil)
	}

	if r.Method == http.MethodPost {
		decoder := json.NewDecoder(r.Body) // декодируем JSON с клиента
		if err := decoder.Decode(&data_json); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		} else {
			var response Login_response

			// получаем захешированный пароль из базы данных
			user_id, _, password, user_email := db.Find_user(server.db, data_json.Login)

			// проверка пароля
			if status := Check_password(password, data_json.Password); status == true {
				response.Status = true
				response.User_id = user_id
				w.Header().Set("Content-Type", "application/json")

				if err := json.NewEncoder(w).Encode(response); err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
				}

				session, _ := server.cookie_handler.Get(r, "session-name")
				session.Values["user_id"] = user_id
				session.Save(r, w)

				// Вынести определение mailer в main
				mailer := mail.New_Dialer()
				if err := mailer.Send_enter_mail(user_email); err != nil {
					http.Error(w, "An error with send email", http.StatusInternalServerError)
					fmt.Print(err)
				}

				token := Generate_token()
				if err := db.Update_token(server.db, user_id, token); err != nil {
					fmt.Print(err)
				}
			} else {
				response.Status = false
				response.Message = "Invalid login or password"

				w.Header().Set("Content-Type", "application/json")
				if err := json.NewEncoder(w).Encode(response); err != nil {
					http.Error(w, err.Error(), http.StatusInternalServerError)
				}
			}
		}
	}
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	init_server()
	var data_json Login_info
	var responseJson Login_response

	if r.Method == http.MethodGet {
		register_page.Execute(w, nil)
	}

	if r.Method == http.MethodPost {
		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&data_json); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		result, err := db.Check_username(server.db, data_json.Login)
		if err != nil {
			fmt.Print(err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}

		if result == true {
			responseJson.Status = true
			responseJson.Message = "Registration successful"

			encoder := json.NewEncoder(w)
			if err := encoder.Encode(responseJson); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}

			db.Add_user(server.db, data_json.Login, Hash_password(data_json.Password), data_json.Email, Generate_token())

		} else {
			responseJson.Status = false
			responseJson.Message = "Username already exists"

			encoder := json.NewEncoder(w)
			if err := encoder.Encode(&responseJson); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}
		}
	}
}

func ForgotPasswordHandler(w http.ResponseWriter, r *http.Request) {
	var dataJson Login_info
	var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

	if r.Method == http.MethodGet {
		forgot_password_page.Execute(w, nil)
	}

	if r.Method == http.MethodPost {
		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&dataJson); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if emailRegex.MatchString(dataJson.Email) {
			token, err := db.Get_token(server.db, dataJson.Email)
			if err != nil {
				http.Error(w, "An error in get token", http.StatusBadRequest)
			}

			mailer := mail.New_Dialer()
			if err := mailer.Send_forgot_password_mail(dataJson.Email, token); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}
		} else {
			http.Error(w, "Invalid email address", http.StatusBadRequest)
		}
	}
}

func ResetPasswordHandler(w http.ResponseWriter, r *http.Request) {
	init_server()
	if r.Method == http.MethodGet {
		resetPasswordPage.Execute(w, nil)
	}
}

func ResetApiHandler(w http.ResponseWriter, r *http.Request) {
	var dataJson Login_info
	var response Login_response
	var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

	if r.Method == http.MethodPost {
		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&dataJson); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// добавить токен для генерации ссылки
		if emailRegex.MatchString(dataJson.Email) {
			db.Update_password(server.db, dataJson.Email, Hash_password(dataJson.NewPassword))
		}

		response.Status = true
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}
}
