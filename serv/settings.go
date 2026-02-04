package serv

import (
	"fmt"
	"time"
	
	"server/db"
)

func ParseDate(dateStart string, dateFinish string, title string, user_id string) (error) {
	dateFinishPatse, _ := time.Parse("2006-01-02T15:04:05.000Z", dateFinish)
	dateStartParse, _ := time.Parse("2006-01-02T15:04:05.000Z", dateStart)

	if dateFinishPatse.Sub(dateStartParse) <= (time.Hour * 12) {
		if err := db.Update_priority(server.db, "imp", title, user_id); err != nil {
			fmt.Print("An error in Update_priority: ", err)
			return err
		}
	} else if dateFinishPatse.Sub(dateStartParse) <= (time.Hour * 72) {
		if err := db.Update_priority(server.db, "urg", title, user_id); err != nil {
			fmt.Print("An error in Update_priority: ", err)
			return err
		}
	} else if dateFinishPatse.Sub(dateStartParse) <= (time.Hour * 120) {
		if err := db.Update_priority(server.db, "ave", title, user_id); err != nil {
			fmt.Print("An error in Update_priority: ", err)
			return err
		}
	}

	return nil
}
