package serv

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"

	// "os"
	"regexp"
	"strconv"
	"sync"
	"time"

	"github.com/gorilla/sessions"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"server/db"
	"server/mail"
)

type Tags struct {
	Name   string `json:"Name"`
	Colour string `json:"Colour"`
}

type NoteData struct {
	User_id   string `json:"user_id"`
	Title     string `json:"Title"`
	Date      string `json:"Date"`
	Data      string `json:"Data"`
	ID_note   string `json:"ID_note"`
	Folder_id int    `json:"Folder_id"`
	Tags      []Tags `json:"Tags"`
}

type FolderData struct {
	User_id   string `json:"user_id"`
	Name      string `json:"Name"`
	Folder_id int    `json:"FolderId"`
	Parent_id int    `json:"ParentId"`
	// Child_folders []FolderData `json:"Child_folders"`
}

type TodoData struct {
	User_id string `json:"User_id"`
	Text    string `json:"Text"`
	IsDone  bool   `json:"IsDone"`
	Id      string `json:"Id"`
}

type TodoDelete struct {
	Id []string `json:"Id"`
}

type TodoRespose struct {
	User_id  string     `json:"User_id"`
	TodoData []TodoData `json:"TodoData"`
}

type Login_info struct { // парсим приходящий от js json
	Email       string `json:"Email"`
	Login       string `json:"Login"`
	Password    string `json:"Password"`
	NewPassword string `json:"NewPassword"`
}

type Response struct {
	User_id string `json:"user_id"`
	Status  bool   `json:"status"`
	Message string `json:"message,omitempty"`
}

type LoginAttempt struct {
	Count       int
	LastAttempt time.Time
}

type FileData struct {
	Folder_id int    `json:"Folder_id"`
	File_name string `json:"File_name"`
	File_size int    `json:"File_size"`
	File_type string `json:"File_type"`
	Data      []byte `json:"Data"`
	User_id   string `json:"User_id"`
}

type ProfileRequest struct {
	User_id string `json:"User_id"`
	Field   string `json:"Field"`
	Value   string `json:"Value"`
}

type ProfileResponse struct {
	Email    string `json:"Email"`
	Theme    string `json:"Theme"`
	Language string `json:"Language"`
	Username string `json:"Username"`
}

type EventData struct {
	User_id  string `json:"user_id"`
	Time     string `json:"time"`
	Title    string `json:"title"`
	Priority string `json:"priority"`
}

type Server struct {
	db             *pgxpool.Pool
	cookie_handler *sessions.CookieStore
}

const maxLoginAttempts = 3
const loginAttemptsDuritation = 10 * time.Minute

var loginAttempts = make(map[string]*LoginAttempt)
var loginAttemptsMutex sync.Mutex

var lending = template.Must(template.ParseFiles("templates/lending.html"))
var log_page = template.Must(template.ParseFiles("templates/login.html"))
var register_page = template.Must(template.ParseFiles("templates/register.html"))
var new_page = template.Must(template.ParseFiles("templates/ai.html"))
var forgot_password_page = template.Must(template.ParseFiles("templates/forgot-password.html"))
var resetPasswordPage = template.Must(template.ParseFiles("templates/reset-password.html"))
var todoList = template.Must(template.ParseFiles("templates/todo_list.html"))
var dashvoardPage = template.Must(template.ParseFiles("templates/dashboard.html"))

var server Server

func init_server() {
	if err := godotenv.Load(); err != nil {
		fmt.Print(err)
	}

	if server.db == nil {
		server.db = db.Db_connect()
	}

	if server.cookie_handler == nil {
		key, _ := hex.DecodeString(Generate_token())
		server.cookie_handler = sessions.NewCookieStore(key)
	}
}

func IndexHandler(w http.ResponseWriter, r *http.Request) {
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
			notes, all_tags, folder_ids := db.Get_notes(server.db, data.User_id)

			for index, note := range notes {
				var tags_struct_array []Tags

				id_note, title, date, text := note[0], note[1], note[2], note[3]
				folder_id := folder_ids[index]
				current_tags := all_tags[index]

				// tags, err := db.Get_tags(server.db, id_note)
				// if err != nil {
				// 	// fmt.Print("An error in Get_notes_handler: ", err)
				// 	continue
				// }

				if len(current_tags) == 2 {
					tags_struct := Tags{
						Name:   current_tags[0],
						Colour: current_tags[1],
					}
					tags_struct_array = append(tags_struct_array, tags_struct)
				} else {
					tags_struct := Tags{
						Name:   "",
						Colour: "",
					}
					tags_struct_array = append(tags_struct_array, tags_struct)
				}

				response = append(response, NoteData{
					User_id:   data.User_id,
					Title:     title,
					Date:      date,
					Data:      text,
					ID_note:   id_note,
					Folder_id: folder_id,
					Tags:      tags_struct_array,
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
		var tags []string
		for _, tag := range req.Tags {
			tags = append(tags, tag.Name, tag.Colour)
		}

		if result, err := db.Check_note(server.db, req.ID_note); err != nil {
			fmt.Print("Ошибка базы даных. Невозможно найти заметку")

		} else if result {
			err_note := db.Update_note(server.db, req.ID_note, req.Data, tags)
			err_tag := db.Update_tags_in_note(server.db, req.ID_note, tags)
			errUpdateFolder := db.Update_notes_folder(server.db, req.ID_note, req.Folder_id)

			if err_note != nil || err_tag != nil || errUpdateFolder != nil {
				fmt.Printf("Ошибка записи в БД: %v\n", err_note)
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				return
			}
		} else if !result {
			err_note := db.Add_note(server.db, req.ID_note, req.User_id, req.Date, req.Data, req.Folder_id, req.Title, tags)
			err_tag := db.Add_tag(server.db, req.ID_note, tags)
			if err_note != nil || err_tag != nil {
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

			response := Response{
				Status:  true,
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
				Name:      folder[1],
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
		var response Response

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}

		if err := db.Delete_folder(server.db, req.Folder_id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		response = Response{
			Status:  true,
			Message: "Папка успешно удалена",
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}
}

func TodoPageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		todoList.Execute(w, nil)
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
		}

		loginAttemptsMutex.Lock()
		attempt, exists := loginAttempts[data_json.Login]

		if exists && time.Since(attempt.LastAttempt) < loginAttemptsDuritation && attempt.Count >= maxLoginAttempts {
			loginAttemptsMutex.Lock()
			response := Response{
				Status:  false,
				Message: "Too many attempts. Please try again later.",
			}
			loginAttemptsMutex.Unlock()

			w.Header().Set("Content-Type", "application/json")
			if err := json.NewEncoder(w).Encode(response); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}
		}

		if exists && time.Since(attempt.LastAttempt) >= loginAttemptsDuritation {
			delete(loginAttempts, data_json.Login)
			attempt = nil
		}

		loginAttemptsMutex.Unlock()
		var response Response

		// получаем захешированный пароль из базы данных
		user_id, _, password, user_email := db.Find_user(server.db, data_json.Login)

		// проверка пароля
		if status := Check_password(password, data_json.Password); status == true {
			loginAttemptsMutex.Lock()
			delete(loginAttempts, data_json.Login)
			loginAttemptsMutex.Unlock()

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
			loginAttemptsMutex.Lock()
			if attempt == nil {
				attempt = &LoginAttempt{}
				loginAttempts[data_json.Login] = attempt
			}
			attempt.Count++
			attempt.LastAttempt = time.Now()
			attemptsLeft := maxLoginAttempts - attempt.Count
			loginAttemptsMutex.Unlock()

			response.Status = false

			if attemptsLeft > 0 {
				response.Message = fmt.Sprintf("Invalid login or password. %d attempts left", attemptsLeft)
			} else {
				response.Message = "Too many attempts. Please try again later."
			}

			w.Header().Set("Content-Type", "application/json")
			if err := json.NewEncoder(w).Encode(response); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}
		}
	}
}

func TodoCreateHadler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var req TodoData

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}

		// Проверка на существование TODO
		if err := db.Add_Todo(server.db, req.Id, req.User_id, req.Text, req.IsDone); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		response := Response{
			User_id: req.User_id,
			Status:  true,
			Message: "Todo успешно создан",
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
}

func GetTodoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var req Response
		var response TodoRespose

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		todos, err := db.Get_todo(server.db, req.User_id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		response.User_id = req.User_id

		for _, todo := range todos {
			inter := TodoData{
				User_id: req.User_id,
				Text:    todo[1].(string),
				IsDone:  todo[2].(bool),
				Id:      todo[0].(string),
			}

			response.TodoData = append(response.TodoData, inter)
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
}

func DeleteTodoHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var req TodoDelete

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		fmt.Print(req)

		for _, id := range req.Id {
			if err := db.Delete_todo(server.db, id); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
		}

		response := Response{
			Status:  true,
			Message: "Todo deleted successfully",
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
}

func RegisterHandler(w http.ResponseWriter, r *http.Request) {
	init_server()
	var data_json Login_info
	var responseJson Response

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
			user_id, err := Generete_user_id()
			if err != nil {
				http.Error(w, "An error in generating user id", http.StatusInternalServerError)
			}

			db.Add_user(server.db, user_id, data_json.Login, Hash_password(data_json.Password), data_json.Email, Generate_token())
			db.Add_profile(server.db, data_json.Email, "", "", data_json.Login)

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
	var response Response
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

func CreateFileHandler(w http.ResponseWriter, r *http.Request) {
	var req FileData
	var response Response

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if server.db != nil {
		if err := db.Upload_file(server.db, req.File_name, req.File_size, req.File_type, req.Folder_id, req.User_id, req.Data); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		response = Response{
			Status:  true,
			Message: "File successfully uploaded",
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
}

func GetFilesHandler(w http.ResponseWriter, r *http.Request) {
	var req FileData
	var response []FileData

	if r.Method == http.MethodPost {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		files, err := db.Get_files(server.db, req.User_id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		for _, file := range files {
			response = append(response, FileData{
				Folder_id: file[0].(int),
				File_name: file[1].(string),
				File_size: file[2].(int),
				File_type: file[3].(string),
				Data:      file[4].([]byte),
			})
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
}

func DeleteFileHandler(w http.ResponseWriter, r *http.Request) {
	var req FileData
	var response Response

	if r.Method == http.MethodPost {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if err := db.Delete_file(server.db, req.User_id, req.File_name, req.Folder_id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)

			response = Response{
				Status:  false,
				Message: "An error occurred while deleting the file",
			}

			w.Header().Set("Content-Type", "application/json")
			if err := json.NewEncoder(w).Encode(response); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
			}

			return
		}

		response = Response{
			Status:  true,
			Message: "File successfully deleted",
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(response); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}
}

func UpdateFileFolder(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var fileToMove FileData
		if err := json.NewDecoder(r.Body).Decode(&fileToMove); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if server.db != nil {
			if err := db.Update_file_folder(server.db, fileToMove.File_name, fileToMove.User_id, fileToMove.Folder_id); err != nil {
				fmt.Print("An error in UpdateFileFolder: ", err)
				return
			}
		}
	}
}

func UpdateProfileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var req ProfileRequest

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if server.db != nil {
			if err := db.Profile_update(server.db, req.User_id, req.Field, req.Value); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}

		respose := Response{
			Status:  true,
			Message: "Profile successfully updated",
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(respose); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
}

func DeleteProfileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var req ProfileRequest

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if server.db != nil {
			if err := db.Delete_profile(server.db, req.User_id); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}

		respose := Response{
			Status:  true,
			Message: "Profile successfully deleted",
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(respose); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
}

func GetProfileHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var req ProfileRequest
		var response ProfileResponse

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if server.db != nil {
			profile, err := db.Get_profile(server.db, req.User_id)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}

			response = ProfileResponse{
				Email:    profile[0],
				Theme:    profile[1],
				Language: profile[2],
				Username: profile[3],
			}

			w.Header().Set("Content-Type", "application/json")
			if err := json.NewEncoder(w).Encode(response); err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}
}

func DashboardHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		dashvoardPage.Execute(w, nil)
	}
}

func EventsCreateHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var req EventData

		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if server.db != nil {
			var priority string
			priorityEnam := []string{"imp", "urg", "ave", "low"}
			if req.Priority == "Важное" {
				priority = priorityEnam[0]
			}


			if err := db.Add_event(server.db, req.User_id, req.Time, req.Title, priority); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			response := Response{
				Status:  true,
				Message: "Event sucssesfuly added",
			}

			w.Header().Set("Content-Type", "application/json")
			if err := json.NewEncoder(w).Encode(response); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
			}
		}
	}
}

func EventsGetHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var req EventData
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if server.db != nil {
			var response []EventData
			events, err := db.Get_events(server.db, req.User_id)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			for _, event := range events {
				response = append(response, EventData{
					User_id: req.User_id,
					Time:    event[0],
					Title:   event[1],
					Priority: event[2],
				})
			}

			w.Header().Set("Content-Type", "application/json")
			if err := json.NewEncoder(w).Encode(response); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
		}
	}
}
