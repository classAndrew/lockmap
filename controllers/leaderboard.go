package controllers

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetLeaderboard gets territory leaderboard. Wynnapi should be used directly. This is here to take load off servers
func GetLeaderboard(c *gin.Context) {
	res, err := http.Get("https://api.wynncraft.com/public_api.php?action=statsLeaderboard&type=guild&timeframe=alltime")
	if err != nil {
		log.Fatal(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}
	defer res.Body.Close()
	data, err := ioutil.ReadAll(res.Body)
	if err != nil {
		log.Fatal(err.Error())
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	}
	var result map[string]interface{}
	json.Unmarshal(data, &result)
	c.JSON(http.StatusOK, result)
}
