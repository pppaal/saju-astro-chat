import sqlite3
import json
import os

# 1. 파일 경로 설정
# DB 파일 위치 (프로젝트 루트에 있다고 가정)
DB_PATH = 'final_data.db'
# 데이터 파일 위치 (src/data/final_dataset.jsonl)
DATA_PATH = os.path.join('src', 'data', 'final_dataset.jsonl')

def create_knowledge_table(cursor):
    """
    지식 데이터를 저장할 테이블을 생성합니다.
    """
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS knowledge_store (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT,          -- 카테고리 (예: astro_aspect, saju_pillar)
        topic TEXT,             -- 주제 (instruction 내용)
        content TEXT,           -- 본문 내용 (output 내용)
        source_url TEXT,        -- 출처 URL (meta.url)
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    print("✅ 'knowledge_store' 테이블 확인/생성 완료")

def load_data_to_db():
    """
    JSONL 파일을 읽어서 DB에 적재합니다.
    """
    # DB 연결
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # 테이블 생성
    create_knowledge_table(cursor)

    # 파일 존재 여부 확인
    if not os.path.exists(DATA_PATH):
        print(f"❌ 오류: 데이터 파일을 찾을 수 없습니다: {DATA_PATH}")
        return

    print(f"📂 데이터 로딩 시작: {DATA_PATH}")
    
    count = 0
    try:
        with open(DATA_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip(): continue # 빈 줄 건너뛰기
                
                # JSON 파싱
                entry = json.loads(line)
                
                # 데이터 추출
                instruction = entry.get('instruction', '')
                output = entry.get('output', '')
                meta = entry.get('meta', {})
                
                category = meta.get('category', 'unknown')
                url = meta.get('url', '')

                # DB 삽입 (INSERT)
                cursor.execute('''
                    INSERT INTO knowledge_store (category, topic, content, source_url)
                    VALUES (?, ?, ?, ?)
                ''', (category, instruction, output, url))
                
                count += 1
                
        # 변경사항 저장 (Commit)
        conn.commit()
        print(f"🎉 성공! 총 {count}개의 지식 데이터가 DB에 저장되었습니다.")

    except Exception as e:
        print(f"❌ 데이터 적재 중 오류 발생: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    load_data_to_db()