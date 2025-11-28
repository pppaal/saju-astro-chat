import sqlite3
import os

# 프로젝트 루트 경로 (scripts 폴더의 상위 폴더)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# DB 파일 저장 경로: src/data/final_data.db
DB_PATH = os.path.join(BASE_DIR, "src", "data", "final_data.db")

def init_db():
    # src/data 폴더가 없으면 자동으로 생성
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print(f"📂 DB 연결됨: {DB_PATH}")

    # 1. 사용자 정보 테이블 (users)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        birth_year INTEGER,
        birth_month INTEGER,
        birth_day INTEGER,
        birth_time TEXT,
        gender TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    print(" - 'users' 테이블 생성 완료")

    # 2. 사주 만세력 데이터 테이블 (saju_info)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS saju_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ganjee_year TEXT,
        ganjee_month TEXT,
        ganjee_day TEXT,
        description TEXT
    )
    ''')
    print(" - 'saju_info' 테이블 생성 완료")

    # 3. 채팅 로그 테이블 (chat_logs)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS chat_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_message TEXT,
        bot_response TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    print(" - 'chat_logs' 테이블 생성 완료")

    conn.commit()
    conn.close()
    print("\n✅ 모든 테이블이 성공적으로 초기화되었습니다!")

if __name__ == "__main__":
    init_db()