import sqlite3

# DB 경로
DB_PATH = 'final_data.db'

def search_knowledge(keyword):
    """
    키워드로 지식 데이터를 검색합니다. (제목 또는 내용에 키워드가 포함되면 추출)
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print(f"\n🔍 검색어: '{keyword}'")
    print("-" * 50)

    # SQL 쿼리: topic(주제)이나 content(내용)에 키워드가 포함된 데이터 찾기
    cursor.execute('''
        SELECT category, topic, content, source_url 
        FROM knowledge_store 
        WHERE topic LIKE ? OR content LIKE ?
        LIMIT 3
    ''', (f'%{keyword}%', f'%{keyword}%'))

    rows = cursor.fetchall()

    if not rows:
        print("❌ 검색 결과가 없습니다.")
    else:
        for i, row in enumerate(rows, 1):
            category, topic, content, source_url = row
            # 내용이 너무 길면 앞부분만 잘라서 보여줌
            short_content = content[:100].replace('\n', ' ') + "..."
            
            print(f"[{i}] 카테고리: {category}")
            print(f"    주제: {topic}")
            print(f"    출처: {source_url}")
            print(f"    내용 미리보기: {short_content}\n")

    conn.close()

if __name__ == "__main__":
    # 테스트 1: 영어 키워드 (점성술)
    search_knowledge("Pluto")
    
    # 테스트 2: 한글 키워드 (사주)
    search_knowledge("갑자")
    
    # 테스트 3: 특정 상황 (연애)
    search_knowledge("연애")