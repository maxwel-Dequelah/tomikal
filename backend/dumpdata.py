import sqlite3
import re

# Input and output files
SQLITE_FILE = "db.sqlite3"
OUTPUT_FILE = "mysql_dump.sql"

def convert_sqlite_to_mysql():
    # Connect to SQLite
    conn = sqlite3.connect(SQLITE_FILE)
    conn.text_factory = str
    cursor = conn.cursor()

    # Dump all SQL statements from SQLite
    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write("-- MySQL dump generated from SQLite\n\n")
        
        for line in conn.iterdump():
            # Skip SQLite pragmas/transactions
            if line.startswith("PRAGMA") or line.startswith("BEGIN TRANSACTION") or line.startswith("COMMIT"):
                continue

            # Replace AUTOINCREMENT syntax
            line = re.sub(r"INTEGER PRIMARY KEY AUTOINCREMENT", "INT PRIMARY KEY AUTO_INCREMENT", line)

            # Replace boolean 't'/'f' with 1/0
            line = line.replace("'t'", "1").replace("'f'", "0")

            # Ensure table and column names are backticked
            line = re.sub(r'"(\w+)"', r'`\1`', line)

            # Fix CURRENT_TIMESTAMP defaults
            line = line.replace("DEFAULT (datetime('now'))", "DEFAULT CURRENT_TIMESTAMP")
            line = line.replace("DEFAULT (strftime('%Y-%m-%d %H:%M:%f','now'))", "DEFAULT CURRENT_TIMESTAMP")

            out.write(line + ";\n")

    conn.close()
    print(f"✅ MySQL dump created at: {OUTPUT_FILE}")

if __name__ == "__main__":
    convert_sqlite_to_mysql()
