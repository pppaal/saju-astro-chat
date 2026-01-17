import styles from "./DestinyMapSkeleton.module.css";

/**
 * 사주/운세 입력 페이지 전용 로딩 스켈레톤
 * 실제 폼과 똑같은 모양으로 표시
 */
export function DestinyMapSkeleton() {
  return (
    <div className={styles.container}>
      {/* 배경 */}
      <div className={styles.background} />

      {/* 타이틀 */}
      <div className={styles.header}>
        <div className={styles.icon}>🌟</div>
        <div className={styles.title} />
        <div className={styles.subtitle} />
      </div>

      {/* 폼 영역 */}
      <div className={styles.formBox}>
        {/* 이름 입력 */}
        <div className={styles.field}>
          <div className={styles.label} />
          <div className={styles.input} />
        </div>

        {/* 성별 선택 */}
        <div className={styles.field}>
          <div className={styles.label} />
          <div className={styles.genderGroup}>
            <div className={styles.genderButton} />
            <div className={styles.genderButton} />
          </div>
        </div>

        {/* 생년월일 */}
        <div className={styles.field}>
          <div className={styles.label} />
          <div className={styles.input} />
        </div>

        {/* 출생시간 */}
        <div className={styles.field}>
          <div className={styles.label} />
          <div className={styles.input} />
        </div>

        {/* 출생지 */}
        <div className={styles.field}>
          <div className={styles.label} />
          <div className={styles.input} />
        </div>

        {/* 제출 버튼 */}
        <div className={styles.submitButton} />
      </div>

      {/* 하단 설명 */}
      <div className={styles.hint} />
    </div>
  );
}

/**
 * 사주 결과 페이지 로딩 스켈레톤
 */
export function DestinyResultSkeleton() {
  return (
    <div className={styles.resultContainer}>
      {/* 헤더 */}
      <div className={styles.resultHeader}>
        <div className={styles.resultTitle} />
        <div className={styles.resultSubtitle} />
      </div>

      {/* 사주 팔자 표 */}
      <div className={styles.pillarsBox}>
        <div className={styles.pillarsTitle} />
        <div className={styles.pillarsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.pillar}>
              <div className={styles.pillarLabel} />
              <div className={styles.pillarChar} />
              <div className={styles.pillarChar} />
            </div>
          ))}
        </div>
      </div>

      {/* 해석 섹션들 */}
      <div className={styles.interpretationsBox}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.section}>
            <div className={styles.sectionTitle} />
            <div className={styles.sectionLine} />
            <div className={styles.sectionLine} />
            <div className={styles.sectionLine} style={{ width: "85%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}