package models

import (
	"log"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	var err error
	DB, err = gorm.Open(sqlite.Open(AppConfig.Database.DbPath), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to open sqlite database %s: %v", AppConfig.Database.DbPath, err)
	}

	// Auto migrate schemas
	err = DB.AutoMigrate(
		&User{},
		&MrEvent{},
	)
	if err != nil {
		log.Fatalf("Failed to auto-migrate database schemas: %v", err)
	}

	log.Printf("[Database] Database initialized and auto-migrated at path: %s", AppConfig.Database.DbPath)
}
