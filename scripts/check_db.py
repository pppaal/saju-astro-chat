import sqlite3

# DB 파일 경로 (경로가 맞는지 꼭 확인하세요)
DB_PATH = "src/data/final_data.db"

def check_db_structure():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 1. 테이블 목록 확인
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()

        if not tables:
            print("❌ DB에 테이블이 하나도 없습니다.")
            return

        print(f"✅ 발견된 테이블 목록: {tables}")

        # 2. 각 테이블의 컬럼(열) 정보 확인
        for table in tables:
            table_name = table[0]
            print(f"\n--- 테이블 이름: [{table_name}] ---")
            
            # 컬럼 정보 가져오기
            cursor.execute(f"PRAGMA table_info({table_name});")
            columns = cursor.fetchall()
            
            for col in columns:
                # col[1]은 컬럼 이름, col[2]는 데이터 타입
                print(f"  - 컬럼명: {col[1]} (타입: {col[2]})")
                
            # 데이터 샘플 1개 찍어보기
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 1")
            sample = cursor.fetchone()
            print(f"  > 데이터 샘플: {sample}")

        conn.close()

    except sqlite3.OperationalError as e:
        print(f"❌ 에러 발생: {e}")
        print("파일 경로가 틀렸거나 DB 파일이 깨졌을 수 있습니다.")

if __name__ == "__main__":
    check_db_structure()