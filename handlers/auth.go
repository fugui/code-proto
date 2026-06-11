package handlers

import (
	"code-proto/models"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type PortalClaims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	IsAdmin  bool   `json:"is_admin"`
	jwt.RegisteredClaims
}

func parseToken(tokenString string) (*PortalClaims, error) {
	secret := []byte(models.AppConfig.Auth.JWTSecret)
	claims := &PortalClaims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return secret, nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header missing"})
			c.Abort()
			return
		}

		if len(tokenString) > 7 && tokenString[:7] == "Bearer " {
			tokenString = tokenString[7:]
		}

		claims, err := parseToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token signature"})
			c.Abort()
			return
		}

		var user models.User
		if err := models.DB.First(&user, claims.UserID).Error; err != nil {
			email := claims.Email
			if email == "" {
				email = claims.Username
			}
			name := claims.Name
			if name == "" {
				name = email
			}
			user = models.User{
				ID:      claims.UserID,
				Email:   email,
				Name:    name,
				IsAdmin: claims.IsAdmin,
			}
			if errCreate := models.DB.Create(&user).Error; errCreate != nil {
				log.Printf("[Auth] Failed to auto-provision user %d: %v", claims.UserID, errCreate)
			} else {
				log.Printf("[Auth] Auto-provisioned shadow user %d (%s)", user.ID, user.Email)
			}
		} else {
			// Update if details changed
			updates := map[string]interface{}{}
			if claims.IsAdmin != user.IsAdmin {
				updates["is_admin"] = claims.IsAdmin
			}
			if claims.Name != "" && claims.Name != user.Name {
				updates["name"] = claims.Name
			}
			if len(updates) > 0 {
				models.DB.Model(&user).Updates(updates)
			}
		}

		c.Set("userID", user.ID)
		c.Set("email", user.Email)
		c.Set("username", user.Email)
		c.Next()
	}
}

func GetMe(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found in context"})
		return
	}
	var user models.User
	if err := models.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}
