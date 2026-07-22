package models

import (
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

type DatabaseConfig struct {
	Host         string `yaml:"host"`
	Port         int    `yaml:"port"`
	User         string `yaml:"user"`
	Password     string `yaml:"password"`
	DBName       string `yaml:"dbname"`
	SSLMode      string `yaml:"sslmode"`
	MaxOpenConns int    `yaml:"max_open_conns"`
	MaxIdleConns int    `yaml:"max_idle_conns"`
}

func (d *DatabaseConfig) GetDSN() string {
	if envDSN := os.Getenv("DB_DSN"); envDSN != "" {
		return envDSN
	}
	host := d.Host
	if host == "" {
		host = "127.0.0.1"
	}
	port := d.Port
	if port == 0 {
		port = 5432
	}
	user := d.User
	if user == "" {
		user = "postgres"
	}
	dbname := d.DBName
	if dbname == "" {
		dbname = "code_shield"
	}
	sslmode := d.SSLMode
	if sslmode == "" {
		sslmode = "disable"
	}
	return fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, d.Password, dbname, sslmode)
}

type Config struct {
	Server struct {
		Port              string        `yaml:"port"`
		GinLog            bool          `yaml:"gin_log"`
		ReadTimeout       time.Duration `yaml:"read_timeout"`
		ReadHeaderTimeout time.Duration `yaml:"read_header_timeout"`
		WriteTimeout      time.Duration `yaml:"write_timeout"`
		IdleTimeout       time.Duration `yaml:"idle_timeout"`
		MaxHeaderBytes    int           `yaml:"max_header_bytes"`
	} `yaml:"server"`
	Auth struct {
		JWTSecret string `yaml:"jwt_secret"`
	} `yaml:"auth"`
	Database DatabaseConfig `yaml:"database"`
}

var AppConfig Config

func LoadConfig(filename string) error {
	data, err := os.ReadFile(filename)
	if err != nil {
		if os.IsNotExist(err) {
			applyDefaults()
			return nil
		}
		return err
	}
	if err := yaml.Unmarshal(data, &AppConfig); err != nil {
		return err
	}
	applyDefaults()
	return nil
}

func applyDefaults() {
	if AppConfig.Server.Port == "" {
		AppConfig.Server.Port = ":8081"
	}
	if AppConfig.Server.ReadTimeout == 0 {
		AppConfig.Server.ReadTimeout = 15 * time.Second
	}
	if AppConfig.Server.ReadHeaderTimeout == 0 {
		AppConfig.Server.ReadHeaderTimeout = 10 * time.Second
	}
	if AppConfig.Server.WriteTimeout == 0 {
		AppConfig.Server.WriteTimeout = 15 * time.Second
	}
	if AppConfig.Server.IdleTimeout == 0 {
		AppConfig.Server.IdleTimeout = 60 * time.Second
	}
	if AppConfig.Server.MaxHeaderBytes == 0 {
		AppConfig.Server.MaxHeaderBytes = 1 << 20 // 1MB
	}
	if AppConfig.Auth.JWTSecret == "" {
		AppConfig.Auth.JWTSecret = "ABCDEFGHIJKLMNOPQRSTVUWXYZ0987654321"
	}
}
