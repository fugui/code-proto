package handlers

import (
	"code-proto/models"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type WebhookPayload struct {
	ObjectKind string `json:"object_kind"`
	Project    struct {
		Name       string `json:"name"`
		HttpUrl    string `json:"git_http_url"`
		HttpUrlAlt string `json:"http_url"`
	} `json:"project"`
	Repository struct {
		Name    string `json:"name"`
		HttpUrl string `json:"homepage"`
	} `json:"repository"`
	User struct {
		Name     string `json:"name"`
		Username string `json:"username"`
	} `json:"user"`
	ObjectAttributes struct {
		Id           int64  `json:"id"`
		Iid          int64  `json:"iid"`
		Title        string `json:"title"`
		SourceBranch string `json:"source_branch"`
		TargetBranch string `json:"target_branch"`
		Action       string `json:"action"`
		Url          string `json:"url"`
	} `json:"object_attributes"`
}

func HandleWebhook(c *gin.Context) {
	// 1. Read raw body
	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read body"})
		return
	}
	rawJSON := string(bodyBytes)

	// 2. Unmarshal payload
	var payload WebhookPayload
	if err := json.Unmarshal(bodyBytes, &payload); err != nil {
		log.Printf("[Webhook] JSON parse error: %v. Raw body: %s", err, rawJSON)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON format"})
		return
	}

	// 3. Verify event type (support GitLab / CodeArts style object_kind)
	eventHeader := c.GetHeader("X-Event") // CodeArts / Gitlab custom header
	isMR := payload.ObjectKind == "merge_request" || eventHeader == "Merge Request Hook" || eventHeader == "Merge Request"

	if !isMR {
		// Log but return OK to avoid webhook client warning
		log.Printf("[Webhook] Ignored non-MR event: kind=%q, header=%q", payload.ObjectKind, eventHeader)
		c.JSON(http.StatusOK, gin.H{"status": "ignored", "reason": "not a merge request event"})
		return
	}

	// 4. Resolve fallback properties
	repoName := payload.Project.Name
	if repoName == "" {
		repoName = payload.Repository.Name
	}
	if repoName == "" {
		repoName = "未知仓库"
	}

	repoURL := payload.Project.HttpUrl
	if repoURL == "" {
		repoURL = payload.Project.HttpUrlAlt
	}
	if repoURL == "" {
		repoURL = payload.Repository.HttpUrl
	}

	authorName := payload.User.Name
	if authorName == "" {
		authorName = payload.User.Username
	}
	if authorName == "" {
		authorName = "匿名推送者"
	}

	action := payload.ObjectAttributes.Action
	if action == "" {
		action = "push" // Default fallback
	}

	// 5. Store Event in SQLite
	event := models.MrEvent{
		MrID:         payload.ObjectAttributes.Id,
		MrNum:        payload.ObjectAttributes.Iid,
		RepoName:     repoName,
		RepoURL:      repoURL,
		Title:        payload.ObjectAttributes.Title,
		SourceBranch: payload.ObjectAttributes.SourceBranch,
		TargetBranch: payload.ObjectAttributes.TargetBranch,
		Author:       authorName,
		Action:       action,
		MrURL:        payload.ObjectAttributes.Url,
		Payload:      rawJSON,
		CreatedAt:    time.Now(),
	}

	if errSave := models.DB.Create(&event).Error; errSave != nil {
		log.Printf("[Webhook] Database insert failed: %v", errSave)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save webhook event"})
		return
	}

	log.Printf("[Webhook] Successfully recorded MR event: %s (#%d) action=%s by %s", repoName, event.MrNum, action, authorName)
	c.JSON(http.StatusOK, gin.H{"status": "success", "id": event.ID})
}
