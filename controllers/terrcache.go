package controllers

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetTerrCache gets territory cache from Wynntils' Athena API
func GetTerrCache(c *gin.Context) {
	res, err := http.Get("https://athena.wynntils.com/cache/get/territoryList")
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
