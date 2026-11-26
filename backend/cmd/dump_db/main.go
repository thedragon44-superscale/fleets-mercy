// cmd/dump_db/main.go
package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	tableFilter := flag.String("table", "", "Optional single table name to dump (dumps all public tables if empty)")
	pretty := flag.Bool("pretty", false, "Pretty-print JSON output")
	flag.Parse()

	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("DATABASE_URL is not set. Example: DATABASE_URL='postgres://gameadmin:YOUR_PASS@127.0.0.1:5432/spacetactics?sslmode=disable'")
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	var tables []string
	if *tableFilter != "" {
		tables = []string{*tableFilter}
	} else {
		rows, err := db.Query(`
			SELECT table_name
			FROM information_schema.tables
			WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
			ORDER BY table_name;
		`)
		if err != nil {
			log.Fatalf("Failed to fetch tables: %v", err)
		}
		defer rows.Close()

		for rows.Next() {
			var tName string
			if err := rows.Scan(&tName); err == nil {
				tables = append(tables, tName)
			}
		}
	}

	for _, t := range tables {
		fmt.Printf("\n==================== TABLE: %s ====================\n", t)
		query := fmt.Sprintf(`SELECT COALESCE(json_agg(t), '[]'::json) FROM "%s" t;`, t)

		var rawJSON []byte
		if err := db.QueryRow(query).Scan(&rawJSON); err != nil {
			fmt.Printf("[Error reading table %s: %v]\n", t, err)
			continue
		}

		if *pretty {
			var out bytes.Buffer
			if err := json.Indent(&out, rawJSON, "", "  "); err == nil {
				fmt.Println(out.String())
				continue
			}
		}
		fmt.Println(string(rawJSON))
	}
}
