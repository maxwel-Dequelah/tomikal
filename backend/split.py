import re

INPUT_FILE = "mysql_dump.sql"          # your raw SQLite dump
OUTPUT_FILE = "cleaned_dump.sql" # MySQL-compatible dump

def clean_sqlite_dump():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        sql = f.read()

    # Remove SQLite-only lines
    sql = re.sub(r"PRAGMA.*;\n", "", sql)
    sql = sql.replace("BEGIN TRANSACTION;", "")
    sql = sql.replace("COMMIT;", "")

    # Fix AUTOINCREMENT
    sql = sql.replace("AUTOINCREMENT", "AUTO_INCREMENT")

    # Fix booleans
    sql = sql.replace("bool", "TINYINT(1)")

    # Fix decimal (no precision in SQLite)
    sql = re.sub(r"\bdecimal\b", "DECIMAL(10,2)", sql, flags=re.IGNORECASE)

    # Remove DEFERRABLE constraints
    sql = re.sub(r"DEFERRABLE INITIALLY DEFERRED", "", sql)

    # Remove CHECK constraints
    sql = re.sub(r"CHECK\s*\([^)]+\)", "", sql)

    # Fix double semicolons
    sql = sql.replace(";;", ";")

    # Fix text NULL → TEXT
    sql = sql.replace("text NULL", "TEXT")

    # Remove sqlite_sequence table and inserts
    sql = re.sub(r"CREATE TABLE sqlite_sequence.*?;\n", "", sql, flags=re.DOTALL)
    sql = re.sub(r"INSERT INTO sqlite_sequence.*?;\n", "", sql, flags=re.DOTALL)
    sql = re.sub(r"DELETE FROM sqlite_sequence.*?;\n", "", sql, flags=re.DOTALL)

    # Save cleaned SQL
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(sql)

    print(f"✅ Cleaned dump saved as {OUTPUT_FILE}")

if __name__ == "__main__":
    clean_sqlite_dump()
