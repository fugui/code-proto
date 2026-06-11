package handlers

import (
	"code-proto/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetMrEvents(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("pageSize", "15")
	repoFilter := c.Query("repo")
	authorFilter := c.Query("author")

	page, _ := strconv.Atoi(pageStr)
	pageSize, _ := strconv.Atoi(pageSizeStr)
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 15
	}

	query := models.DB.Model(&models.MrEvent{})

	if repoFilter != "" {
		query = query.Where("repo_name LIKE ?", "%"+repoFilter+"%")
	}
	if authorFilter != "" {
		query = query.Where("author LIKE ?", "%"+authorFilter+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count events"})
		return
	}

	var events []models.MrEvent
	offset := (page - 1) * pageSize
	if err := query.Order("id desc").Offset(offset).Limit(pageSize).Find(&events).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events"})
		return
	}

	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))
	if totalPages < 1 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, gin.H{
		"items":      events,
		"total":      total,
		"page":       page,
		"pageSize":   pageSize,
		"totalPages": totalPages,
	})
}

func GetMrEventDetail(c *gin.Context) {
	id := c.Param("id")
	var event models.MrEvent
	if err := models.DB.First(&event, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}
	c.JSON(http.StatusOK, event)
}
