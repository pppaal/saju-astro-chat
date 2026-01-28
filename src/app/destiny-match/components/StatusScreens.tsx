import Link from 'next/link';

type CSSStyles = { readonly [key: string]: string };

interface StatusScreensProps {
  isLoading: boolean;
  isSessionLoading: boolean;
  isLoggedIn: boolean;
  needsSetup: boolean;
  error: string | null;
  signInUrl: string;
  onSignIn: () => void;
  onSetup: () => void;
  onRetry: () => Promise<void>;
  styles: CSSStyles;
}

export function StatusScreens({
  isLoading,
  isSessionLoading,
  isLoggedIn,
  needsSetup,
  error,
  onSignIn,
  onSetup,
  onRetry,
  styles,
}: StatusScreensProps) {
  // 로딩 중
  if (isSessionLoading || isLoading) {
    return (
      <div className={styles.noMoreCards}>
        <div className={styles.noMoreIcon}>&#10024;</div>
        <h2>프로필을 불러오는 중...</h2>
        <p>잠시만 기다려주세요</p>
      </div>
    );
  }

  // 비로그인 상태
  if (!isLoggedIn) {
    return (
      <div className={styles.noMoreCards}>
        <div className={styles.noMoreIcon}>&#128302;</div>
        <h2>로그인이 필요합니다</h2>
        <p>운명의 상대를 찾으려면 먼저 로그인해주세요</p>
        <button onClick={onSignIn} className={styles.resetButton}>
          로그인하기
        </button>
      </div>
    );
  }

  // 프로필 설정 필요
  if (needsSetup) {
    return (
      <div className={styles.noMoreCards}>
        <div className={styles.noMoreIcon}>&#128221;</div>
        <h2>프로필 설정이 필요합니다</h2>
        <p>매칭을 시작하려면 먼저 프로필을 만들어주세요</p>
        <button onClick={onSetup} className={styles.resetButton}>
          프로필 만들기
        </button>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className={styles.noMoreCards}>
        <div className={styles.noMoreIcon}>&#128546;</div>
        <h2>오류가 발생했습니다</h2>
        <p>{error}</p>
        <button onClick={onRetry} className={styles.resetButton}>
          다시 시도
        </button>
      </div>
    );
  }

  return null;
}

interface NoMoreCardsProps {
  profileCount: number;
  loadProfiles: () => Promise<void>;
  styles: CSSStyles;
}

export function NoMoreCards({ profileCount, loadProfiles, styles }: NoMoreCardsProps) {
  return (
    <div className={styles.noMoreCards}>
      <div className={styles.noMoreIcon}>&#127775;</div>
      <h2>{profileCount === 0 ? '아직 매칭 상대가 없습니다' : '모든 프로필을 확인했어요!'}</h2>
      <p>{profileCount === 0 ? '나중에 다시 확인해주세요' : '나중에 더 많은 인연이 기다리고 있어요'}</p>
      <button onClick={loadProfiles} className={styles.resetButton}>
        새로고침
      </button>
      <Link href="/destiny-match/matches" className={styles.resetButton} style={{ marginTop: '10px', display: 'inline-block' }}>
        매치 확인하기
      </Link>
    </div>
  );
}
