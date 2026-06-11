package models

import "time"

type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Email     string    `gorm:"uniqueIndex" json:"email"`
	Name      string    `json:"name"`
	IsAdmin   bool      `json:"is_admin"`
	CreatedAt time.Time `json:"created_at"`
}

type MrEvent struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	MrID           int64     `gorm:"index" json:"mr_id"`           // 来自华为 CodeArts 的 MR 内部 ID
	MrNum          int64     `json:"mr_num"`                       // MR 的序号
	RepoName       string    `gorm:"size:255" json:"repo_name"`
	RepoURL        string    `gorm:"size:1024" json:"repo_url"`
	Title          string    `gorm:"size:512" json:"title"`
	SourceBranch   string    `gorm:"size:255" json:"source_branch"`
	TargetBranch   string    `gorm:"size:255" json:"target_branch"`
	Author         string    `gorm:"size:255" json:"author"`
	Action         string    `gorm:"size:50" json:"action"`        // open, close, merge, update 等
	MrURL          string    `gorm:"size:1024" json:"mr_url"`      // 跳转到 CodeArts 的页面 URL
	Payload        string    `gorm:"type:text" json:"payload"`     // 原始 json 字符串
	CreatedAt      time.Time `json:"created_at"`
}
