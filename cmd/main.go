package main

import (
	"github.com/classAndrew/lockmap/controllers"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()
	// r.Static("/", "./static")
	// workaround
	r.StaticFile("/dest.png", "./static/dest.png")
	r.StaticFile("/favicon.png", "./static/favicon.png")
	r.StaticFile("/fragment.fs", "./static/fragment.fs")
	r.StaticFile("/vertex.vs", "./static/vertex.vs")
	r.StaticFile("/main.js", "./static/main.js")
	r.StaticFile("/style.css", "./static/style.css")
	r.StaticFile("/terr_fragment.fs", "./static/terr_fragment.fs")
	r.StaticFile("/terr_vertex.vs", "./static/terr_vertex.vs")
	r.StaticFile("/line_vertex.vs", "./static/line_vertex.vs")
	r.StaticFile("/line_fragment.fs", "./static/line_fragment.fs")
	r.StaticFile("/", "./static/index.html")
	// enable cors middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Headers", "*")
		c.Next()
	})
	v1 := r.Group("/v1/")
	v1.GET("/leaderboard", controllers.GetLeaderboard)
	r.Run(":8080")
}