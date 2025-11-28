import sqlite3
import os

# 프로젝트 루트 경로 설정 (현재 스크립트 위치 기준)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'src', 'data', 'final_data.db')

def test_join_query():
    print(f"📂 데이터베이스 연결: {DB_PATH}")
    
    if not os.path.exists(DB_PATH):
        print("❌ 데이터베이스 파일을 찾을 수 없습니다.")
        return

    conn = sqlite3.connect(DB_PATH)
    # 컬럼명으로 데이터에 접근하기 위해 Row 팩토리 설정
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        print("\n🔍 [테스트] 사용자 정보와 대화 기록 조인(JOIN) 조회")
        print("-" * 60)
        
        # 쿼리 설명: users 테이블과 chat_logs 테이블을 user_id 기준으로 합칩니다.
        query = """
        SELECT 
            u.name, 
            u.birth_year, 
            c.user_message, 
            c.bot_response, 
            c.timestamp
        FROM chat_logs c
        JOIN users u ON c.user_id = u.id
        ORDER BY c.timestamp DESC
        """
        
        cursor.execute(query)
        rows = cursor.fetchall()

        if rows:
            for row in rows:
                print(f"👤 사용자: {row['name']} ({row['birth_year']}년생)")
                print(f"🗣️ 질문: {row['user_message']}")
                print(f"🤖 답변: {row['bot_response']}")
                print(f"🕒 시간: {row['timestamp']}")
                print("-" * 60)
        else:
            print("데이터가 없습니다.")

    except sqlite3.Error as e:
        print(f"❌ 데이터베이스 에러 발생: {e}")
    finally:
        conn.close()
        print("✅ 연결 종료")

if __name__ == "__main__":
    test_join_query()