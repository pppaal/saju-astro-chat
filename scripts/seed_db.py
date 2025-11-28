import sqlite3
import os

# 프로젝트 루트 및 DB 경로 설정
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "src", "data", "final_data.db")

def seed_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print(f"🌱 데이터 시딩(Seeding) 시작: {DB_PATH}")

    # 1. 테스트 유저 데이터 입력
    # 이미 데이터가 있으면 중복 입력을 방지하기 위해 간단한 체크 로직 추가 가능하지만,
    # 여기서는 테스트를 위해 바로 입력합니다.
    print(" - 사용자(User) 데이터 입력 중...")
    cursor.execute('''
        INSERT INTO users (name, birth_year, birth_month, birth_day, birth_time, gender)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ("홍길동", 1990, 5, 5, "14:30", "male"))

    # 방금 생성된 유저의 ID 가져오기
    user_id = cursor.lastrowid

    # 2. 사주 만세력 기초 데이터 (예시)
    print(" - 사주 정보(Saju Info) 데이터 입력 중...")
    cursor.execute('''
        INSERT INTO saju_info (ganjee_year, ganjee_month, ganjee_day, description)
        VALUES (?, ?, ?, ?)
    ''', ("갑자(甲子)", "병인(丙寅)", "무진(戊辰)", "푸른 쥐의 해, 붉은 호랑이의 달, 황금 용의 날입니다."))

    # 3. 채팅 로그 데이터 입력
    print(" - 채팅 로그(Chat Logs) 데이터 입력 중...")
    cursor.execute('''
        INSERT INTO chat_logs (user_id, user_message, bot_response)
        VALUES (?, ?, ?)
    ''', (user_id, "제 사주가 궁금해요.", "안녕하세요 홍길동님! 생년월일을 바탕으로 사주를 분석해 드릴게요."))

    conn.commit()
    conn.close()
    print("\n✅ 테스트 데이터 입력이 완료되었습니다!")

if __name__ == "__main__":
    seed_data()