package serv

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"regexp"
	"strconv"

	"github.com/gorilla/sessions"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"server/db"
	"server/mail"
)

type Tags struct {
	Name  string `json:"Name"`
	Colour string `json:"Colour"`
}

type NoteData struct {
	User_id   int      `json:"user_id"`
	Title     string   `json:"Title"`
	Date      string   `json:"Date"`
	Data      string   `json:"Data"`
	ID_note   string   `json:"ID_note"`
	Folder_id int      `json:"Folder_id"`
	Tags      []Tags   `json:"Tags"`
}

type FolderData struct {
	User_id       int          `json:"user_id"`
	Name          string       `json:"Name"`
	Folder_id     int          `json:"FolderId"`
	Parent_id     int          `json:"ParentId"`
	// Child_folders []FolderData `json:"Child_folders"`
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

var lending = template.Must(template.ParseFiles("templates/lending.html"))
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
func IndexHandler(w http.ResponseWriter, r *http.Request) { // отрисовка лендинга
	if r.Method == http.MethodGet {
		lending.Execute(w, nil)
	}
}

// Отрисовка страницы заметок
func NoteHandler(w http.ResponseWriter, r *http.Request) { // отрисовка вторичной страницы блокнота (со списком всех заметок)
	init_server()
	if r.Method == http.MethodGet { // && server.cookie_handler != nil {
		new_page.Execute(w, nil)
	} else if server.cookie_handler == nil {
		http.Error(w, "u not login", http.StatusForbidden)
	}
}

// Получение заметок
func GetNotesHandler(w http.ResponseWriter, r *http.Request) {
	var data NoteData
	var response []NoteData

	if r.Method == http.MethodPost {
		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&data); err != nil {
			fmt.Print("An error in Get_notes_handler: ", err)
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}

		if server.db != nil {
			notes, folder_ids := db.Get_notes(server.db, data.User_id)
			
			for index, note := range notes {
				id_note, title, date, text := note[0], note[1], note[2], note[3]
				folder_id := folder_ids[index]
				
				response = append(response, NoteData{
					User_id: data.User_id,
					Title: title,
					Date: date,
					Data: text,
					ID_note: id_note,
					Folder_id: folder_id,
				})
			}
			
			w.Header().Set("Content-Type", "application/json")
			if err := json.NewEncoder(w).Encode(response); err != nil {
				fmt.Print("An error in Get_notes_handler: ", err)
			}
		} else {
			http.Error(w, "u not login", http.StatusForbidden)
		}
	}
}

func CreateNoteHandler(w http.ResponseWriter, r *http.Request) {
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
		if result, err := db.Check_note(server.db, req.ID_note); err != nil {
			fmt.Print("Ошибка базы даных. Невозможно найти заметку")
		} else if result {
			if err := db.Update_note(server.db, req.ID_note, req.Data); err != nil {
				fmt.Print("Ошибка базы даных. Невозможно обновить заметку")
			}
		} else if !result {
			var tags []string
			for _, tag := range req.Tags {
				tags = append(tags, tag.Name, tag.Colour)
			}
			
			err := db.Add_note(server.db, req.ID_note, req.User_id, req.Date, req.Data, req.Folder_id, req.Title, tags)
			if err != nil {
				fmt.Printf("Ошибка записи в БД: %v\n", err)
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				return
			}

			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]string{"status": "success"})
		}
		
	} else {
		http.Error(w, "Forbidden: Database not initialized or user not logged in", http.StatusForbidden)
	}
}

func DeleteNoteHandler(w http.ResponseWriter, r *http.Request) {
	var data NoteData

	if r.Method == http.MethodPost {
		decoder := json.NewDecoder(r.Body)
		if err := decoder.Decode(&data); err != nil {
			fmt.Print("An error in Create_note: ", err.Error(), "\n")
		}

		if server.db != nil {
			if err := db.Delete_note(server.db, data.ID_note); err != nil {
				fmt.Print("An error in Delete_note_handler: ", err)
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			}
			
			response := Login_response{
				Status: true,
				Message: "Заметка успешно удалена",
			}
			
			if err := json.NewEncoder(w).Encode(response); err != nil {
				fmt.Print("An error in Delete_note_handler: ", err)
			}
			
		} else {
			http.Error(w, "u not login", http.StatusForbidden)
		}
	}
}

func CreateFolderHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost && server.db != nil && server.cookie_handler != nil {
		var req FolderData
		
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		
		if err := db.Create_folder(server.db, req.Folder_id, req.Name, req.User_id, req.Parent_id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	} else {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func GetFoldersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost && server.db != nil && server.cookie_handler != nil {
		var response []FolderData
		var req FolderData
		
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "An error in GetFoldersHandler", http.StatusBadRequest)
		}
		
		info := db.Get_folders(server.db, req.User_id)
		
		for _, folder := range info {
			folder_id, err := strconv.Atoi(folder[0])
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			
			parent_id, err := strconv.Atoi(folder[2])
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			
			response = append(response, FolderData{
				Folder_id: folder_id,
				Name: folder[1],
				Parent_id: parent_id,
			})
		}
		
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}
}

func DeleteFolderHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost && server.cookie_handler != nil && server.db != nil {
		var req FolderData
		var response Login_response
		
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		
		if err := db.Delete_folder(server.db, req.Folder_id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		
		response = Login_response{
			Status: true,
			Message: "Папка успешно удалена",
		}
		
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
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
			db.Add_user(server.db, data_json.Login, Hash_password(data_json.Password), data_json.Email, Generate_token())
			
			responseJson.Status = true
			responseJson.Message = "Registration successful"

			encoder := json.NewEncoder(w)
			if err := encoder.Encode(responseJson); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}

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
