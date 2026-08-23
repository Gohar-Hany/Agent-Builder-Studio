import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kayanova.db")

def clear_db():
    if os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = OFF;")
        cursor.execute("DELETE FROM chat_messages;")
        cursor.execute("DELETE FROM contacts;")
        cursor.execute("DELETE FROM orders;")
        cursor.execute("DELETE FROM menu_items;")
        cursor.execute("DELETE FROM brands;")
        conn.commit()
        cursor.execute("PRAGMA foreign_keys = ON;")
        cursor.execute("VACUUM;")
        conn.close()
        print("Successfully cleared all data from kayanova.db!")
    else:
        print("Database file not found.")

if __name__ == "__main__":
    clear_db()
