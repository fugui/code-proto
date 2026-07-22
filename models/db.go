package models

import (
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	var err error
	dsn := AppConfig.Database.GetDSN()
	log.Printf("[Database] Connecting to PostgreSQL database (%s)...", AppConfig.Database.DBName)
	dialector := postgres.New(postgres.Config{
		DSN:                  dsn,
		PreferSimpleProtocol: true,
	})

	DB, err = gorm.Open(dialector, &gorm.Config{})
	if err != nil {
		log.Fatalf("[Database] Failed to connect database: %v", err)
	}

	// Auto migrate schemas
	err = DB.AutoMigrate(
		&User{},
		&MrEvent{},
	)
	if err != nil {
		log.Fatalf("Failed to auto-migrate database schemas: %v", err)
	}

	log.Println("[Database] Database initialized and auto-migrated successfully")
}
