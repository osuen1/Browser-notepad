package serv

import (
	"fmt"
	"time"
	
	"server/db"
)

func ParseDate(dateFinish string, title string, user_id string) (error) {
	dateFinishParse, _ := time.Parse("2006-01-02T15:04:05.000Z", dateFinish)
	dateStartParse := time.Now()
	subDate := dateFinishParse.Sub(dateStartParse)
	now := time.Now()

	if subDate <= (time.Hour * 12) {
		if err := db.Update_priority(server.db, "imp", title, user_id); err != nil {
			fmt.Print("An error in Update_priority: ", err)
			return err
		}
	} else if subDate <= (time.Hour * 72) {
		if err := db.Update_priority(server.db, "urg", title, user_id); err != nil {
			fmt.Print("An error in Update_priority: ", err)
			return err
		}
	} else if subDate <= (time.Hour * 120) {
		if err := db.Update_priority(server.db, "ave", title, user_id); err != nil {
			fmt.Print("An error in Update_priority: ", err)
			return err
		}
	} else if now.After(dateFinishParse) {
		if err := db.Delete_Event(server.db, user_id, title); err != nil {
			fmt.Print("An error in Delete_event: ", err)
			return err
		}
	}

	return nil
}